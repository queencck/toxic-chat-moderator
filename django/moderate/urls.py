from django.urls import path

from . import views

urlpatterns = [
    path('message/', views.message, name='message'),
    path('stats/', views.get_bot_activity_stats, name='bot-activity-stats'),
    path('moderation-stats/', views.get_bot_moderation_stats, name='bot-moderation-stats'),
    path('audit-log/', views.get_audit_log, name='audit-log'),
]
