from datetime import timedelta
from uuid import UUID

import httpx
from django.conf import settings
from django.utils import timezone
from ninja import Router
from ninja_jwt.authentication import JWTAuth

from bots.auth import BotTokenAuth
from bots.models import Bot, BotHourlyStat
from users.schemas import ErrorSchema

from .models import TextChat
from .schemas import ModerateRequestSchema, ModerateResponseSchema, StatsResponseSchema

router = Router()

ACTIVITY_RANGE = timedelta(days=30)
MODERATION_RANGE = timedelta(hours=12)
TOXICITY_THRESHOLD = 0.6


def _activity_stats(bot, now):
    since = now - ACTIVITY_RANGE
    chat_counts = {
        stat['timestamp']: stat['chat_count']
        for stat in BotHourlyStat.objects.filter(bot=bot, timestamp__gte=since).values('timestamp', 'chat_count')
    }

    stats = []
    current_hour = since
    while current_hour <= now:
        hour_end = current_hour + timedelta(hours=1)
        active_users = TextChat.objects.filter(
            bot=bot,
            created_at__gte=current_hour,
            created_at__lt=hour_end,
        ).values('sender').distinct().count()
        stats.append({
            'hour': current_hour,
            'chat_count': chat_counts.get(current_hour, 0),
            'active_users': active_users,
        })
        current_hour += timedelta(hours=1)

    return stats


def _moderation_stats(bot, now):
    flagged = TextChat.objects.filter(
        bot=bot,
        created_at__gte=now - MODERATION_RANGE,
        toxicity__gte=TOXICITY_THRESHOLD,
    ).order_by('-created_at')

    return {
        'flagged_count': flagged.count(),
        'flagged_messages': [
            {
                'text': chat.text,
                'toxicity': chat.toxicity,
                'sender': chat.sender,
                'created_at': chat.created_at,
            }
            for chat in flagged
        ],
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
        response = httpx.post(
            f'http://{settings.ML_MODEL_SERVER_URL}/api/v1/classify',
            json={'text': payload.text},
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.ConnectError:
        return 503, {'detail': 'ML model server is unavailable'}
    except httpx.HTTPStatusError as e:
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

    hour = chat.created_at.replace(minute=0, second=0, microsecond=0)
    hourly_stat, _ = BotHourlyStat.objects.get_or_create(
        bot=bot,
        timestamp=hour,
        defaults={'chat_count': 0},
    )
    hourly_stat.chat_count += 1
    hourly_stat.save(update_fields=['chat_count'])

    return 201, {
        'text': chat.text,
        'toxicity': chat.toxicity,
        'sender': chat.sender,
        'created_at': chat.created_at,
        'model_version': chat.model_version,
    }



