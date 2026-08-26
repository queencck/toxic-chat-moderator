from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('moderates', '0001_initial'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='textchat',
            index=models.Index(fields=['bot', 'created_at'], name='textchat_bot_created_idx'),
        ),
    ]
