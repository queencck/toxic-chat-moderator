import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    def __str__(self):
        return f"{self.username} ({self.uuid})"

class Subscription(models.Model):

    PLAN_CHOICES = [
        ('Basic', 'Basic'),
        ('Premium', 'Premium'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.CharField(max_length=100, choices=PLAN_CHOICES, default='Basic')
    start_date = models.DateTimeField(auto_now_add=True, editable=False)
    expiry_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.plan} - until {self.expiry_date.strftime('%Y-%m-%d') if self.expiry_date else 'N/A'}"

class Bot(models.Model):

    PLATFORM_CHOICES = [
        ('API', 'API'),
        ('Discord', 'Discord'),
        ('Slack', 'Slack'),
        ('Telegram', 'Telegram'),
    ]

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bots', null=True)
    platform = models.CharField(max_length=50, choices=PLATFORM_CHOICES, default='api')
    group_identifier = models.CharField(max_length=255, null=True, blank=True)
    group_name = models.CharField(max_length=100, null=True, blank=True)
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

