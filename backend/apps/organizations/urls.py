"""
URL routing for organizations app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    OrganizationMemberViewSet,
    OrganizationViewSet,
    BusinessUnitViewSet,
    TeamViewSet,
    MagicLinkViewSet,
    TeamInvitationViewSet,
    MagicLinkAccessView,
    TeamInvitationAcceptView,
    SharedWithMeViewSet,
)

router = DefaultRouter()
router.register(r"organizations", OrganizationViewSet, basename="organization")
router.register(r"memberships", OrganizationMemberViewSet, basename="membership")
router.register(r"business-units", BusinessUnitViewSet, basename="business-unit")
router.register(r"teams", TeamViewSet, basename="team")
router.register(r"magic-links", MagicLinkViewSet, basename="magic-link")
router.register(r"team-invitations", TeamInvitationViewSet, basename="team-invitation")
router.register(r"shared-with-me", SharedWithMeViewSet, basename="shared-with-me")

urlpatterns = [
    path("", include(router.urls)),
    path("share/<str:token>/", MagicLinkAccessView.as_view(), name="magic-link-access"),
    path("invite/<str:token>/", TeamInvitationAcceptView.as_view(), name="invitation-accept"),
]
