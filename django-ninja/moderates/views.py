from datetime import timedelta
from uuid import UUID

import httpx
from django.conf import settings
from django.db.models import Count, F
from django.db.models.functions import TruncHour
from django.utils import timezone
from ninja import Router
from ninja_jwt.authentication import JWTAuth

from bots.auth import BotTokenAuth
from bots.models import Bot, BotHourlyStat
from users.schemas import ErrorSchema

from .models import TextChat
from .schemas import (
    AuditLogResponseSchema,
    ModerateRequestSchema,
    ModerateResponseSchema,
    StatsResponseSchema,
)

router = Router()

ACTIVITY_RANGE = timedelta(days=30)
MODERATION_RANGE = timedelta(hours=12)
AUDIT_LOG_RANGE = timedelta(days=7)
TOXICITY_THRESHOLD = 0.6
FLAGGED_PREVIEW_LIMIT = 50

# One client per worker process, reused across requests. Building a client per
# call costs ~13ms, almost all of it SSL context setup. The internal pool lets
# every thread in this worker have a request in flight at once.
_ml_client = httpx.Client(
    # Must exceed the inference engine's own max_wait_ms (2s) so the server
    # sheds deliberately with a 503, and stay under the bot's timeout so the
    # deadlines nest: 2s < 3s < 10s.
    timeout=3.0,
    limits=httpx.Limits(
        max_connections=100,
        max_keepalive_connections=20,
        keepalive_expiry=30.0,
    ),
)


def _activity_stats(bot, now):
    since = now - ACTIVITY_RANGE
    chat_counts = dict(
        BotHourlyStat.objects.filter(bot=bot, timestamp__gte=since).values_list('timestamp', 'chat_count')
    )

    # Group the whole window by hour
    active_users = dict(
        TextChat.objects.filter(bot=bot, created_at__gte=since)
        .annotate(hour=TruncHour('created_at'))
        .values('hour')
        .annotate(active_users=Count('sender', distinct=True))
        .values_list('hour', 'active_users')
    )

    stats = []
    current_hour = since
    while current_hour <= now:
        stats.append({
            'hour': current_hour,
            'chat_count': chat_counts.get(current_hour, 0),
            'active_users': active_users.get(current_hour, 0),
        })
        current_hour += timedelta(hours=1)

    return stats


def _moderation_stats(bot, now):
    flagged = TextChat.objects.filter(
        bot=bot,
        created_at__gte=now - MODERATION_RANGE,
        toxicity__gte=TOXICITY_THRESHOLD,
    )

    return {
        'flagged_count': flagged.count(),
        'flagged_messages': list(
            flagged.order_by('-created_at')
            .values('text', 'toxicity', 'sender', 'created_at')[:FLAGGED_PREVIEW_LIMIT]
        ),
    }


@router.get('/logs/', response={200: AuditLogResponseSchema, 404: ErrorSchema}, auth=JWTAuth())
def get_audit_log(
    request,
    bot_id: UUID,
    page: int = 1,
    page_size: int = 20,
    search: str = '',
    sender: str = '',
    flagged: bool = False,
):
    """Get paginated chat messages for a bot from the last 7 days with filtering."""
    bot = Bot.objects.filter(uuid=bot_id, user=request.user).first()
    if not bot:
        return 404, {'detail': 'Bot not found or unauthorized.'}

    messages = TextChat.objects.filter(
        bot=bot,
        created_at__gte=timezone.now() - AUDIT_LOG_RANGE,
    ).order_by('-created_at')

    if search := search.strip():
        messages = messages.filter(text__icontains=search)
    if sender := sender.strip():
        messages = messages.filter(sender__icontains=sender)
    if flagged:
        messages = messages.filter(toxicity__gte=TOXICITY_THRESHOLD)

    total = messages.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    page = min(max(page, 1), total_pages)
    offset = (page - 1) * page_size

    return 200, {
        'results': [
            {
                'id': chat.id,
                'text': chat.text,
                'toxicity': chat.toxicity,
                'sender': chat.sender,
                'created_at': chat.created_at,
                'model_version': chat.model_version,
            }
            for chat in messages[offset:offset + page_size]
        ],
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': total_pages,
    }


@router.get('/stats/', response={200: StatsResponseSchema, 404: ErrorSchema}, auth=JWTAuth())
def get_stats(request, bot_id: UUID):
    """Get hourly activity stats and moderation stats for a bot."""
    bot = Bot.objects.filter(uuid=bot_id, user=request.user).first()
    if not bot:
        return 404, {'detail': 'Bot not found or unauthorized.'}

    now = timezone.now().replace(minute=0, second=0, microsecond=0)
    return 200, {
        'hourly_records': _activity_stats(bot, now),
        **_moderation_stats(bot, now),
    }


@router.post('/moderate/', response={201: ModerateResponseSchema, 400: ErrorSchema, 502: ErrorSchema, 503: ErrorSchema, 504: ErrorSchema}, auth=BotTokenAuth(),)
def moderate(request, payload: ModerateRequestSchema):
    """Classify a chat message for toxicity and persist the result."""
    bot = Bot.objects.filter(platform=payload.platform, group_identifier=payload.group_identifier).first()
    if not bot:
        return 400, {'detail': 'Bot not found for the given platform and group identifier.'}
    if not bot.user:
        return 400, {'detail': 'Bot is not linked to a user.'}

    try:
        response = _ml_client.post(
            f'http://{settings.ML_MODEL_SERVER_URL}/api/v1/classify',
            json={'text': payload.text},
        )
        response.raise_for_status()
    except httpx.ConnectError:
        return 503, {'detail': 'ML model server is unavailable'}
    except httpx.HTTPStatusError as e:
        # Pass overload through as overload. Flattening it to 502 would tell
        # the bot the service is broken when it is merely busy.
        if e.response.status_code == 503:
            return 503, {'detail': 'Moderation service is busy, retry shortly'}
        return 502, {'detail': f'ML model server returned {e.response.status_code}'}
    except httpx.TimeoutException:
        return 504, {'detail': 'ML model server request timed out'}

    result = response.json()
    chat = TextChat.objects.create(
        bot=bot,
        text=payload.text,
        toxicity=result.get('toxicity', 0.0),
        sender=payload.sender,
        model_version=result.get('model_version', 'unknown'),
    )

    # Increment in the database, not in Python: read-modify-write here would
    # lose counts whenever two messages for the same bot land in the same hour.
    hour = chat.created_at.replace(minute=0, second=0, microsecond=0)
    BotHourlyStat.objects.get_or_create(bot=bot, timestamp=hour, defaults={'chat_count': 0})
    BotHourlyStat.objects.filter(bot=bot, timestamp=hour).update(chat_count=F('chat_count') + 1)

    return 201, {
        'text': chat.text,
        'toxicity': chat.toxicity,
        'sender': chat.sender,
        'created_at': chat.created_at,
        'model_version': chat.model_version,
    }



