"""
Core views - dashboard stats and shared endpoints.
"""

from django.db.models import Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.diagrams.models import ThreatModel


class DashboardStatsView(APIView):
    """Dashboard statistics endpoint."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get dashboard statistics for the current user."""
        user = request.user

        # Get organizations the user belongs to
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)

        # Get threat models in user's organizations
        threat_models = ThreatModel.objects.filter(organization_id__in=org_ids)

        # Calculate stats
        stats = threat_models.aggregate(
            total=Count("id"),
            in_progress=Count("id", filter=Q(status__in=["draft", "in_progress"])),
            pending_review=Count("id", filter=Q(status="pending_review")),
            approved=Count("id", filter=Q(status="approved")),
        )

        return Response(
            {
                "total": stats["total"] or 0,
                "inProgress": stats["in_progress"] or 0,
                "pendingReview": stats["pending_review"] or 0,
                "approved": stats["approved"] or 0,
            }
        )


class HealthCheckView(APIView):
    """Health check endpoint (no auth required)."""

    permission_classes = []

    def get(self, request):
        """Return health status."""
        return Response({"status": "healthy"})
