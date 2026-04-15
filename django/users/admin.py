from django.contrib import admin
from .models import User, Subscription, Bot

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'uuid', 'username', 'email', 'is_active', 'date_joined')
    list_filter = ('is_active', 'date_joined')
    search_fields = ('uuid', 'username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    readonly_fields = ('uuid', 'date_joined', 'last_login')
    fields = ('uuid', 'username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser', 'last_login', 'date_joined')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'plan', 'start_date', 'expiry_date')
    list_filter = ('plan', 'start_date')
    search_fields = ('user__username', 'plan')
    ordering = ('-start_date',)
    readonly_fields = ('start_date',)


@admin.register(Bot)
class BotAdmin(admin.ModelAdmin):
    list_display = ('id', 'uuid', 'user', 'platform', 'group_identifier', 'is_active', 'created_at')
    list_filter = ('platform', 'is_active', 'created_at')
    search_fields = ('uuid', 'user__username', 'group_identifier', 'group_name')
    ordering = ('-created_at',)
    readonly_fields = ('uuid', 'platform', 'group_identifier', 'group_name', 'created_at')
    fields = ('uuid', 'user', 'platform', 'group_identifier', 'group_name', 'is_active', 'created_at')
