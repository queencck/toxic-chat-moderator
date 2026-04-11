from rest_framework import serializers


class ClassifyRequestSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=5000)
    sender = serializers.CharField(max_length=128, allow_blank=True)
    source = serializers.CharField(max_length=64, allow_blank=True)


class ClassifyResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    text = serializers.CharField(max_length=5000)
    toxicity = serializers.FloatField()
    sender = serializers.CharField(max_length=128, allow_blank=True)
    source = serializers.CharField(max_length=64, allow_blank=True)
    created_at = serializers.DateTimeField(required=False)
    model_version = serializers.CharField(max_length=64, required=False)
