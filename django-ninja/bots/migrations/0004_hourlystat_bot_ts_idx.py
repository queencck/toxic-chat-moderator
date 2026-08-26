from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bots', '0003_bothourlystat'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='bothourlystat',
            index=models.Index(fields=['bot', 'timestamp'], name='hourlystat_bot_ts_idx'),
        ),
    ]
