from rest_framework import serializers

from users.models import Bot


class ClassifyRequestSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=5000)
    sender = serializers.CharField(max_length=128, allow_blank=True)
    source = serializers.CharField(max_length=64, allow_blank=True)


class BotActivityStatsRequestSerializer(serializers.Serializer):
    bot_id = serializers.UUIDField(required=True)

    def validate_bot_id(self, value):
        user = self.context['request'].user

        bot = Bot.objects.filter(uuid=value, user=user).first()
        if not bot:
            raise serializers.ValidationError('Bot not found or unauthorized.')

        return bot


class BotActivityStatsResponseSerializer(serializers.Serializer):
    chat_count = serializers.IntegerField()
    hour = serializers.DateTimeField()


class BotActivityStatsRangeSerializer(serializers.Serializer):
    range_48h = BotActivityStatsResponseSerializer(many=True)
    range_7d = BotActivityStatsResponseSerializer(many=True)
    range_30d = BotActivityStatsResponseSerializer(many=True)


class ClassifyResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    text = serializers.CharField(max_length=5000)
    toxicity = serializers.FloatField()
    sender = serializers.CharField(max_length=128, allow_blank=True)
    source = serializers.CharField(max_length=64, allow_blank=True)
    created_at = serializers.DateTimeField(required=False)
    model_version = serializers.CharField(max_length=64, required=False)


class BotModerationStatsRequestSerializer(serializers.Serializer):
    bot_id = serializers.UUIDField(required=True)

    def validate_bot_id(self, value):
        user = self.context['request'].user

        bot = Bot.objects.filter(uuid=value, user=user).first()
        if not bot:
            raise serializers.ValidationError('Bot not found or unauthorized.')

        return bot


class FlaggedMessageSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=5000)
    toxicity = serializers.FloatField()
    sender = serializers.CharField(max_length=128, allow_blank=True)
    created_at = serializers.DateTimeField()


class PeriodStatsSerializer(serializers.Serializer):
    period = serializers.CharField()
    total_chats = serializers.IntegerField()
    flagged_chats = serializers.IntegerField()
    flagging_percentage = serializers.FloatField()


class BotModerationStatsResponseSerializer(serializers.Serializer):
    stats_by_period = PeriodStatsSerializer(many=True)
    flagged_messages = FlaggedMessageSerializer(many=True)
