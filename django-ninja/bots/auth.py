from django.conf import settings
from ninja.security import APIKeyHeader


class BotTokenAuth(APIKeyHeader):
    param_name = 'Authorization'

    def authenticate(self, request, key):
        if not key or not key.startswith('Token '):
            return None
        token = key.removeprefix('Token ').strip()
        if settings.BOT_SECRET_TOKEN and token == settings.BOT_SECRET_TOKEN:
            return token
        return None
