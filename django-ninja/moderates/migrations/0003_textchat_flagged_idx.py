from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ('moderates', '0002_textchat_bot_created_idx'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='textchat',
            index=models.Index(
                fields=['bot', '-created_at'],
                condition=Q(toxicity__gte=0.6),
                name='textchat_flagged_idx',
            ),
        ),
    ]
