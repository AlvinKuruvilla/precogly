"""
Core views - dashboard stats and shared endpoints.
"""

from django.db.models import Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.threat_models.models import ThreatModel
from apps.threats.models import Risk
from apps.threats.services import derive_risk_status


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

        # Calculate threat model stats
        stats = threat_models.aggregate(
            total=Count("id"),
            in_progress=Count("id", filter=Q(status__in=["draft", "in_progress"])),
            pending_review=Count("id", filter=Q(status="pending_review")),
            approved=Count("id", filter=Q(status="approved")),
        )

        # Calculate risk stats
        risks = Risk.objects.filter(
            threat_model__organization_id__in=org_ids
        ).prefetch_related("risk_threats__component_threat", "risk_threats__flow_threat")

        risk_level_counts = risks.values("inherent_level").annotate(
            count=Count("id")
        )
        level_map = {entry["inherent_level"]: entry["count"] for entry in risk_level_counts}

        open_count = 0
        mitigated_count = 0
        for risk in risks:
            risk_status = derive_risk_status(risk)
            if risk_status == "open":
                open_count += 1
            elif risk_status in ["mitigated", "accepted"]:
                mitigated_count += 1

        return Response(
            {
                "total": stats["total"] or 0,
                "inProgress": stats["in_progress"] or 0,
                "pendingReview": stats["pending_review"] or 0,
                "approved": stats["approved"] or 0,
                "risks": {
                    "total": risks.count(),
                    "critical": level_map.get("critical", 0),
                    "high": level_map.get("high", 0),
                    "medium": level_map.get("medium", 0),
                    "low": level_map.get("low", 0),
                    "open": open_count,
                    "mitigated": mitigated_count,
                },
            }
        )


class HealthCheckView(APIView):
    """Health check endpoint (no auth required)."""

    permission_classes = []

    def get(self, request):
        """Return health status."""
        return Response({"status": "healthy"})
