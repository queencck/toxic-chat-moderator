from django.urls import path

from . import views

urlpatterns = [
    path('classify/', views.classify, name='classify'),
    path('stats/', views.get_bot_activity_stats, name='bot-activity-stats'),
    path('moderation-stats/', views.get_bot_moderation_stats, name='bot-moderation-stats'),
]
