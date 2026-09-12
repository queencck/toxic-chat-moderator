from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bots', '0004_hourlystat_bot_ts_idx'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='bothourlystat',
            constraint=models.UniqueConstraint(
                fields=['bot', 'timestamp'], name='unique_bot_hour'
            ),
        ),
    ]
