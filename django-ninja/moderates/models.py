from django.db import models
from django.db.models import Q

from bots.models import Bot


class TextChat(models.Model):
    bot = models.ForeignKey(Bot, on_delete=models.SET_NULL, null=True, blank=True)
    text = models.TextField()
    toxicity = models.FloatField()
    sender = models.CharField(max_length=128, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    model_version = models.CharField(max_length=64, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['bot', 'created_at'], name='textchat_bot_created_idx'),
            # Partial index covering only flagged rows, so the dashboard's
            # "most recent flagged" query stops after the first few entries.
            # The 0.6 must stay in sync with views.TOXICITY_THRESHOLD.
            models.Index(
                fields=['bot', '-created_at'],
                condition=Q(toxicity__gte=0.6),
                name='textchat_flagged_idx',
            ),
        ]

    def __str__(self):
        return self.text
