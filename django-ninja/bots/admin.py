from django.contrib import admin

from .models import Bot

@admin.register(Bot)
class BotAdmin(admin.ModelAdmin):
    list_display = ('id', 'uuid', 'user', 'platform', 'group_identifier', 'is_active', 'created_at')
    list_filter = ('platform', 'is_active', 'created_at')
    search_fields = ('uuid', 'user__username', 'group_identifier', 'group_name')
    ordering = ('-created_at',)
    readonly_fields = ('uuid', 'platform', 'group_identifier', 'group_name', 'created_at')
    fields = ('uuid', 'user', 'platform', 'group_identifier', 'group_name', 'is_active', 'created_at')
