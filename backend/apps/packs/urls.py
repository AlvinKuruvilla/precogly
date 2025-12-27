"""
URL configuration for packs app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LibraryPackViewSet, OrganizationPackInstallationViewSet

router = DefaultRouter()
router.register(r"packs", LibraryPackViewSet, basename="pack")
router.register(r"installed-packs", OrganizationPackInstallationViewSet, basename="installed-pack")

urlpatterns = [
    path("", include(router.urls)),
]
