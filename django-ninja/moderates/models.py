from django.db import models

from bots.models import Bot


class TextChat(models.Model):
    bot = models.ForeignKey(Bot, on_delete=models.SET_NULL, null=True, blank=True)
    text = models.TextField()
    toxicity = models.FloatField()
    sender = models.CharField(max_length=128, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    model_version = models.CharField(max_length=64, blank=True)

    def __str__(self):
        return self.text
