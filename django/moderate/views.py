from datetime import timedelta

import httpx
from django.conf import settings
from django.utils import timezone
from django.db.models import Q, Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BotHourlyStat, TextChat
from .serializers import (
    BotActivityStatsRequestSerializer,
    BotActivityStatsRangeSerializer,
    BotModerationStatsRequestSerializer,
    BotModerationStatsResponseSerializer,
    ClassifyRequestSerializer,
    ClassifyResponseSerializer,
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
        complete_stats.append({
            'hour': current_hour,
            'chat_count': stats_map.get(current_hour, 0)
        })
        current_hour += timedelta(hours=1)

    return complete_stats


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_bot_activity_stats(request):
    """Get statistics about the linked bot and their activity for all time ranges."""
    serializer = BotActivityStatsRequestSerializer(
        data=request.query_params, context={'request': request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    bot = serializer.validated_data['bot_id']
    now = timezone.now().replace(minute=0, second=0, microsecond=0)

    # Query all three ranges at once
    response_data = {
        'range_48h': _get_stats_for_range(bot, now, RANGE_DELTAS['48h']),
        'range_7d': _get_stats_for_range(bot, now, RANGE_DELTAS['7d']),
        'range_30d': _get_stats_for_range(bot, now, RANGE_DELTAS['30d']),
    }

    response_serializer = BotActivityStatsRangeSerializer(data=response_data)
    if response_serializer.is_valid():
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    return Response(response_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_bot_moderation_stats(request):
    """Get moderation statistics for the bot (3 hours, 24 hours, 1 week)."""
    serializer = BotModerationStatsRequestSerializer(
        data=request.query_params, context={'request': request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    bot = serializer.validated_data['bot_id']
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
            moderated_by=bot,
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

    # Get top 5 most recent flagged messages
    flagged_chats_queryset = TextChat.objects.filter(
        moderated_by=bot,
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
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    return Response(response_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def classify(request):
    """Send a chat message to the ML model server for toxicity classification."""
    serializer = ClassifyRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    text = serializer.validated_data['text']

    try:
        response = httpx.post(
            f"http://{settings.ML_MODEL_SERVER_URL}/api/v1/classify",
            json={
                "text": text,
                "sender": serializer.validated_data.get("sender", ""),
                "source": serializer.validated_data.get("source", ""),
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
    response_serializer = ClassifyResponseSerializer(data={
        "text": text,
        "sender": serializer.validated_data.get("sender", ""),
        "source": serializer.validated_data.get("source", ""),
        **result,
    })
    if response_serializer.is_valid():
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    return Response(response_serializer.errors, status=status.HTTP_502_BAD_GATEWAY)
