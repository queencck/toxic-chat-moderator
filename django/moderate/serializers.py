from rest_framework import serializers
from users.serializers import BotSerializer
from users.models import Bot


class MessageRequestSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=5000)
    sender = serializers.CharField(max_length=128)
    platform = serializers.CharField(max_length=50)
    group_identifier = serializers.CharField(max_length=255)

    def validate(self, data):
        bot = Bot.objects.filter(platform=data['platform'], group_identifier=data['group_identifier']).first()

        if not bot:
            raise serializers.ValidationError('Bot not found for the given platform and group identifier.')

        if not bot.user:
            raise serializers.ValidationError('Bot is not linked to a user.')

        data['bot'] = bot
        return data


class BotStatsRequestSerializer(serializers.Serializer):
    bot_id = serializers.UUIDField(required=True)

    def validate(self, data):
        user = self.context['request'].user

        bot = Bot.objects.filter(uuid=data['bot_id'], user=user).first()
        if not bot:
            raise serializers.ValidationError('Bot not found or unauthorized.')

        data['bot'] = bot
        return data


class BotActivityStatsResponseSerializer(serializers.Serializer):
    chat_count = serializers.IntegerField()
    active_users = serializers.IntegerField()
    hour = serializers.DateTimeField()


class BotActivityStatsRangeSerializer(serializers.Serializer):
    range_48h = BotActivityStatsResponseSerializer(many=True)
    range_7d = BotActivityStatsResponseSerializer(many=True)
    range_30d = BotActivityStatsResponseSerializer(many=True)


class MessageSerializer(serializers.Serializer):
    bot = BotSerializer(read_only=True)
    text = serializers.CharField(max_length=5000)
    toxicity = serializers.FloatField()
    sender = serializers.CharField(max_length=128, allow_blank=True)
    created_at = serializers.DateTimeField(required=False)
    model_version = serializers.CharField(max_length=64, required=False)


class PeriodStatsSerializer(serializers.Serializer):
    period = serializers.CharField()
    total_chats = serializers.IntegerField()
    flagged_chats = serializers.IntegerField()
    flagging_percentage = serializers.FloatField()


class FlaggedMessageSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=5000)
    toxicity = serializers.FloatField()
    sender = serializers.CharField(max_length=128, allow_blank=True)
    created_at = serializers.DateTimeField()


class BotModerationStatsResponseSerializer(serializers.Serializer):
    stats_by_period = PeriodStatsSerializer(many=True)
    flagged_messages = FlaggedMessageSerializer(many=True)
