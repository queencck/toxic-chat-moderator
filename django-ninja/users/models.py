import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


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


