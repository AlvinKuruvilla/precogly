"""
URL routing for organizations app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import OrganizationMemberViewSet, OrganizationViewSet

router = DefaultRouter()
router.register(r"organizations", OrganizationViewSet, basename="organization")
router.register(r"memberships", OrganizationMemberViewSet, basename="membership")

urlpatterns = [
    path("", include(router.urls)),
]
