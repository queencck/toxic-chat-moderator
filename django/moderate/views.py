from datetime import timedelta

import httpx
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BotHourlyStat, TextChat
from .serializers import (
    BotStatsRequestSerializer,
    BotActivityStatsRangeSerializer,
    BotModerationStatsResponseSerializer,
    MessageSerializer,
    MessageRequestSerializer,
)

RANGE_DELTAS = {
    '48h': timedelta(hours=48),
    '7d': timedelta(days=7),
    '30d': timedelta(days=30),
}


def _get_stats_for_range(bot, now, delta):
    """Helper function to get stats for a specific time range."""
    since = now - delta
    stats = BotHourlyStat.objects.filter(bot=bot, timestamp__gte=since).values('timestamp', 'chat_count')

    stats_map = {stat['timestamp']: stat['chat_count'] for stat in stats}

    complete_stats = []
    current_hour = since

    while current_hour <= now:
        hour_end = current_hour + timedelta(hours=1)
        # Count unique users who sent at least one message in this hour
        active_users = TextChat.objects.filter(
            bot=bot,
            created_at__gte=current_hour,
            created_at__lt=hour_end
        ).values('sender').distinct().count()

        complete_stats.append({
            'hour': current_hour,
            'chat_count': stats_map.get(current_hour, 0),
            'active_users': active_users
        })
        current_hour += timedelta(hours=1)

    return complete_stats


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_bot_activity_stats(request):
    """Get statistics about the linked bot and their activity for all time ranges."""
    serializer = BotStatsRequestSerializer(
        data=request.query_params, context={'request': request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    bot = serializer.validated_data['bot']
    user = request.user

    cache_key = f'bot_activity_stats:{bot.uuid}:{user.id}'

    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data, status=status.HTTP_200_OK)

    now = timezone.now().replace(minute=0, second=0, microsecond=0)

    # Query all three ranges at once
    response_data = {
        'range_48h': _get_stats_for_range(bot, now, RANGE_DELTAS['48h']),
        'range_7d': _get_stats_for_range(bot, now, RANGE_DELTAS['7d']),
        'range_30d': _get_stats_for_range(bot, now, RANGE_DELTAS['30d']),
    }

    response_serializer = BotActivityStatsRangeSerializer(data=response_data)
    if response_serializer.is_valid():
        cache.set(cache_key, response_serializer.data, 1800)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    return Response(response_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_bot_moderation_stats(request):
    """Get moderation statistics for the bot (3 hours, 24 hours, 1 week)."""
    serializer = BotStatsRequestSerializer(
        data=request.query_params, context={'request': request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    bot = serializer.validated_data['bot']
    user = request.user


    cache_key = f'bot_moderation_stats:{bot.uuid}:{user.id}'

    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data, status=status.HTTP_200_OK)

    now = timezone.now()
    toxicity_threshold = 0.6

    periods = [
        ('3h', timedelta(hours=3)),
        ('24h', timedelta(hours=24)),
        ('1w', timedelta(days=7)),
    ]

    stats_by_period = []

    for period_name, delta in periods:
        since = now - delta

        chats = TextChat.objects.filter(
            bot=bot,
            created_at__gte=since
        ).values('toxicity')

        total_chats = len(chats)
        flagged_chats = sum(1 for chat in chats if chat['toxicity'] >= toxicity_threshold)
        flagging_percentage = (flagged_chats / total_chats * 100) if total_chats > 0 else 0.0

        stats_by_period.append({
            'period': period_name,
            'total_chats': total_chats,
            'flagged_chats': flagged_chats,
            'flagging_percentage': flagging_percentage,
        })

    flagged_chats_queryset = TextChat.objects.filter(
        bot=bot,
        toxicity__gte=toxicity_threshold
    ).order_by('-created_at')[:5]

    flagged_messages = [
        {
            'text': chat.text,
            'toxicity': chat.toxicity,
            'sender': chat.sender,
            'created_at': chat.created_at,
        }
        for chat in flagged_chats_queryset
    ]

    response_data = {
        'stats_by_period': stats_by_period,
        'flagged_messages': flagged_messages,
    }

    response_serializer = BotModerationStatsResponseSerializer(data=response_data)
    if response_serializer.is_valid():
        cache.set(cache_key, response_serializer.data, 60)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    return Response(response_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def message(request):
    """Classify a chat message for toxicity and persist the result to the database."""
    serializer = MessageRequestSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    text = serializer.validated_data['text']
    sender = serializer.validated_data['sender']

    bot = serializer.validated_data['bot']

    try:
        response = httpx.post(
            f"http://{settings.ML_MODEL_SERVER_URL}/api/v1/classify",
            json={
                "text": text,
            },
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.ConnectError:
        return Response(
            {"error": "ML model server is unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except httpx.HTTPStatusError as e:
        return Response(
            {"error": f"ML model server returned {e.response.status_code}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except httpx.TimeoutException:
        return Response(
            {"error": "ML model server request timed out"},
            status=status.HTTP_504_GATEWAY_TIMEOUT,
        )

    result = response.json()

    chat = TextChat.objects.create(
        bot=bot,
        text=text,
        toxicity=result.get("toxicity", 0.0),
        sender=sender,
        model_version=result.get("model_version", "unknown"),
    )

    # Update hourly statistics - floor to the hour
    now = chat.created_at.replace(minute=0, second=0, microsecond=0)
    hourly_stat, created = BotHourlyStat.objects.get_or_create(
        bot=bot,
        timestamp=now,
        defaults={'chat_count': 0}
    )
    hourly_stat.chat_count += 1
    hourly_stat.save()

    response_serializer = MessageSerializer({
        "bot": bot,
        "text": chat.text,
        "toxicity": chat.toxicity,
        "sender": chat.sender,
        "created_at": chat.created_at,
        "model_version": chat.model_version,
    })

    return Response(response_serializer.data, status=status.HTTP_201_CREATED)
