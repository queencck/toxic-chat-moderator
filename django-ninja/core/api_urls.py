"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path
from ninja import NinjaAPI

from bots.views import router as bots_router
from moderates.views import router as moderates_router
from users.views import router as users_router

api = NinjaAPI()
api.add_router('/v1/users/', users_router)
api.add_router('/v1/bots/', bots_router)
api.add_router('/v1/moderates/', moderates_router)


urlpatterns = [
    path('', api.urls),
]
