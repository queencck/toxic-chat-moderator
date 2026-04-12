from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('bots/list/', views.list_bots, name='list-bots'),
    path('bots/link/', views.link_bot, name='link-bot'),
]