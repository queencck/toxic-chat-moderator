import uuid

from django.db import models
from users.models import User


class Bot(models.Model):

    PLATFORM_CHOICES = [
        ('API', 'API'),
        ('Discord', 'Discord'),
        ('Slack', 'Slack'),
        ('Telegram', 'Telegram'),
    ]

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bots', blank=True, null=True)
    platform = models.CharField(max_length=50, choices=PLATFORM_CHOICES, default='api')
    group_identifier = models.CharField(max_length=255)
    group_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['platform', 'group_identifier'], 
                name='unique_platform_group_identifier'
            )
        ]

    def __str__(self):
        return f"{self.uuid} ({self.platform} - {self.group_identifier})"
    

class BotHourlyStat(models.Model):

    bot = models.ForeignKey(Bot, on_delete=models.SET_NULL, null=True, blank=True)
    chat_count = models.IntegerField(default=0)
    timestamp = models.DateTimeField()

    def __str__(self):
        return f"{self.bot} - {self.timestamp}"
