import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    def __str__(self):
        return f"{self.username} ({self.uuid})"

class Subscription(models.Model):

    PLAN_CHOICES = [
        ('basic', 'Basic'),
        ('premium', 'Premium'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.CharField(max_length=100, choices=PLAN_CHOICES, default='basic')
    start_date = models.DateTimeField(auto_now_add=True, editable=False)
    expiry_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.plan} - until {self.expiry_date.strftime('%Y-%m-%d') if self.expiry_date else 'N/A'}"

class Bot(models.Model):

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bots', null=True, blank=True)
    platform = models.CharField(max_length=50, editable=False)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)

    def __str__(self):
        return f"{self.platform} bot ({'active' if self.is_active else 'inactive'})"

