from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')


class RegisterRequestSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password2 = serializers.CharField(write_only=True, required=True, min_length=8)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name')

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': "Passwords don't match."})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data, password=password)
        return user


class RegisterResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    user = UserSerializer()


class LoginRequestSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError({'error': 'Invalid credentials'})
        data['user'] = user
        return data


class LoginResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()

class ListBotResponseSerializer(serializers.Serializer):
    uuid = serializers.UUIDField()
    platform = serializers.CharField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField()


class LinkBotRequestSerializer(serializers.Serializer):
    bot_id = serializers.UUIDField(required=True)


class LinkBotResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    bot_id = serializers.UUIDField()
    user_id = serializers.UUIDField()
