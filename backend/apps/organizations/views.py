"""
Views for organizations app.
"""

import secrets
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Organization,
    OrganizationMember,
    BusinessUnit,
    Team,
    TeamMembership,
    TeamInvitation,
    MagicLink,
    SharedWithMe,
)
from .serializers import (
    OrganizationListSerializer,
    OrganizationMemberListSerializer,
    OrganizationMemberSerializer,
    OrganizationSerializer,
    BusinessUnitSerializer,
    TeamSerializer,
    TeamListSerializer,
    TeamMembershipSerializer,
    TeamInvitationSerializer,
    MagicLinkSerializer,
    SharedWithMeSerializer,
)

User = get_user_model()


class OrganizationViewSet(viewsets.ModelViewSet):
    """ViewSet for Organization CRUD operations."""

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["plan"]
    search_fields = ["name", "domain"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """Return organizations the user belongs to."""
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)
        return Organization.objects.filter(id__in=org_ids).prefetch_related("members")

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == "list":
            return OrganizationListSerializer
        return OrganizationSerializer

    def perform_create(self, serializer):
        """Create organization and add creator as admin."""
        org = serializer.save()
        OrganizationMember.objects.create(
            organization=org,
            user=self.request.user,
            role=OrganizationMember.Role.ADMIN,
        )

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        """List members of an organization."""
        org = self.get_object()
        members = org.members.select_related("user").all()
        serializer = OrganizationMemberListSerializer(members, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="add-member")
    def add_member(self, request, pk=None):
        """Add a member to an organization."""
        org = self.get_object()
        serializer = OrganizationMemberSerializer(data={
            "organization": org.id,
            "user": request.data.get("user"),
            "role": request.data.get("role", OrganizationMember.Role.VIEWER),
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="remove-member")
    def remove_member(self, request, pk=None):
        """Remove a member from an organization."""
        org = self.get_object()
        user_id = request.data.get("user")
        try:
            member = org.members.get(user_id=user_id)
            member.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except OrganizationMember.DoesNotExist:
            return Response(
                {"detail": "Member not found"},
                status=status.HTTP_404_NOT_FOUND,
            )


class OrganizationMemberViewSet(viewsets.ModelViewSet):
    """ViewSet for OrganizationMember CRUD operations."""

    serializer_class = OrganizationMemberSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["organization", "user", "role"]

    def get_queryset(self):
        """Return memberships for organizations the user belongs to."""
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)
        return OrganizationMember.objects.filter(
            organization_id__in=org_ids
        ).select_related("organization", "user")


class BusinessUnitViewSet(viewsets.ModelViewSet):
    """ViewSet for BusinessUnit CRUD operations."""

    serializer_class = BusinessUnitSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["organization", "parent"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """Return business units for organizations the user belongs to."""
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)
        return BusinessUnit.objects.filter(
            organization_id__in=org_ids
        ).select_related("organization", "parent")


class IsTeamMember(permissions.BasePermission):
    """
    Permission check for team membership.
    - Org admins can LIST/RETRIEVE teams (read-only visibility)
    - Only explicit team members can perform write operations
    """

    def has_object_permission(self, request, view, obj):
        # Safe methods (GET, HEAD, OPTIONS) allowed for org members
        if request.method in permissions.SAFE_METHODS:
            return obj.organization.members.filter(user=request.user).exists()

        # Write operations require explicit team membership
        return obj.memberships.filter(
            user=request.user,
            role__in=["lead", "member"],  # Viewers can't write
        ).exists()


class TeamViewSet(viewsets.ModelViewSet):
    """ViewSet for Team CRUD operations."""

    permission_classes = [IsAuthenticated, IsTeamMember]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["organization", "business_unit", "is_default"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """
        Org admins can see all teams in their orgs (visibility).
        Filtering for 'my teams only' can be done via query param.
        """
        user = self.request.user
        org_ids = user.organization_memberships.values_list("organization_id", flat=True)
        queryset = Team.objects.filter(
            organization_id__in=org_ids
        ).select_related("organization", "business_unit")

        # Optional filter: only teams user is a member of
        my_teams_only = self.request.query_params.get("my_teams", "false")
        if my_teams_only.lower() == "true":
            queryset = queryset.filter(memberships__user=user)

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == "list":
            return TeamListSerializer
        return TeamSerializer

    def get_permissions(self):
        """Skip IsTeamMember for list/create (handled differently)."""
        if self.action in ["list", "create"]:
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        """List members of a team."""
        team = self.get_object()
        memberships = team.memberships.select_related("user")
        serializer = TeamMembershipSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="add-member")
    def add_member(self, request, pk=None):
        """
        Add existing user to team by user_id.
        For non-existent users, use invite_member instead.
        """
        team = self.get_object()
        user_id = request.data.get("user_id")
        role = request.data.get("role", "member")

        if not user_id:
            return Response(
                {"error": "user_id is required. For new users, use invite_member."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify user exists
        if not User.objects.filter(id=user_id).exists():
            return Response(
                {"error": "User not found. Use invite_member for non-existent users."},
                status=status.HTTP_404_NOT_FOUND,
            )

        membership, created = TeamMembership.objects.get_or_create(
            team=team,
            user_id=user_id,
            defaults={"role": role},
        )
        return Response(TeamMembershipSerializer(membership).data)

    @action(detail=True, methods=["post"], url_path="invite-member")
    def invite_member(self, request, pk=None):
        """
        Invite user by email. Works for both existing and non-existent users.
        - If user exists: creates TeamMembership directly
        - If user doesn't exist: creates TeamInvitation (pending)
        """
        team = self.get_object()
        email = request.data.get("email")
        role = request.data.get("role", "member")

        if not email:
            return Response(
                {"error": "email is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user already exists
        try:
            existing_user = User.objects.get(email=email)
            # User exists - create membership directly
            membership, created = TeamMembership.objects.get_or_create(
                team=team,
                user=existing_user,
                defaults={"role": role},
            )
            return Response({
                "status": "added",
                "membership": TeamMembershipSerializer(membership).data,
            })
        except User.DoesNotExist:
            # User doesn't exist - create invitation
            invitation, created = TeamInvitation.objects.update_or_create(
                team=team,
                email=email,
                defaults={
                    "role": role,
                    "token": secrets.token_urlsafe(32),
                    "invited_by": request.user,
                    "status": TeamInvitation.Status.PENDING,
                    "expires_at": timezone.now() + timedelta(days=7),
                },
            )
            return Response(
                {
                    "status": "invited",
                    "invitation": TeamInvitationSerializer(invitation).data,
                },
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

    @action(detail=True, methods=["post"], url_path="remove-member")
    def remove_member(self, request, pk=None):
        """Remove a member from a team."""
        team = self.get_object()
        user_id = request.data.get("user_id")

        if not user_id:
            return Response(
                {"error": "user_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            membership = team.memberships.get(user_id=user_id)
            membership.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except TeamMembership.DoesNotExist:
            return Response(
                {"error": "Member not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        """
        Allow org member to explicitly join a team.
        Required for write access to team's threat models.
        """
        team = self.get_object()
        user = request.user

        # Verify user is org member
        if not team.organization.members.filter(user=user).exists():
            return Response(
                {"error": "Not a member of this organization"},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership, created = TeamMembership.objects.get_or_create(
            team=team,
            user=user,
            defaults={"role": TeamMembership.Role.MEMBER},
        )

        return Response({
            "joined": created,
            "membership": TeamMembershipSerializer(membership).data,
        })


class MagicLinkViewSet(viewsets.ModelViewSet):
    """ViewSet for MagicLink CRUD operations."""

    serializer_class = MagicLinkSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["threat_model", "is_revoked"]

    def get_queryset(self):
        """Return magic links for threat models user has access to."""
        user = self.request.user
        return MagicLink.objects.filter(
            threat_model__organization__members__user=user
        ).select_related("threat_model")

    def perform_create(self, serializer):
        """Create magic link with token and expiration."""
        serializer.save(
            token=secrets.token_urlsafe(32),
            created_by=self.request.user,
            expires_at=timezone.now() + timedelta(days=30),
        )

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        """Revoke a magic link."""
        magic_link = self.get_object()
        magic_link.is_revoked = True
        magic_link.save(update_fields=["is_revoked"])
        return Response({"status": "revoked"})


class MagicLinkAccessView(APIView):
    """Public view for accessing a magic link (no auth required)."""

    permission_classes = []  # No auth required

    def get(self, request, token):
        """Access a threat model via magic link."""
        try:
            link = MagicLink.objects.select_related(
                "threat_model", "threat_model__organization", "created_by"
            ).get(token=token)
        except MagicLink.DoesNotExist:
            return Response(
                {"error": "Invalid link"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not link.is_valid():
            return Response(
                {"error": "Link expired or revoked"},
                status=status.HTTP_410_GONE,
            )

        link.accessed_count += 1
        link.save(update_fields=["accessed_count"])

        # If user is logged in, add to their "Shared with Me" list
        is_authenticated = request.user.is_authenticated
        saved_to_account = False
        if is_authenticated:
            shared_record, created = SharedWithMe.objects.get_or_create(
                user=request.user,
                threat_model=link.threat_model,
                defaults={"magic_link": link},
            )
            if not created:
                # Update access count and last accessed time
                shared_record.access_count += 1
                shared_record.save(update_fields=["access_count", "last_accessed_at"])
            saved_to_account = True

        # Return read-only threat model data
        from apps.diagrams.serializers import ThreatModelSerializer

        serializer = ThreatModelSerializer(link.threat_model)

        # Compute summary stats
        stats = self._compute_threat_model_stats(link.threat_model)

        # Get threat analysis data
        threat_analysis = self._get_threat_analysis_data(link.threat_model)

        return Response({
            "threat_model": serializer.data,
            "stats": stats,
            "threat_analysis": threat_analysis,
            "read_only": True,
            "expires_at": link.expires_at,
            "is_authenticated": is_authenticated,
            "saved_to_account": saved_to_account,
        })

    def _compute_threat_model_stats(self, threat_model):
        """
        Compute summary statistics for the threat model.
        Uses the threat registry to compute threats dynamically from canvas data,
        mirroring the frontend behavior.
        """
        from .threat_registry import compute_threat_model_stats_from_canvas

        return compute_threat_model_stats_from_canvas(threat_model)

    def _get_threat_analysis_data(self, threat_model):
        """
        Get threat analysis data for the threat model.
        Returns threats with their countermeasures, organized by component.
        Same format as ThreatModelViewSet.threats() action.
        """
        from apps.threats.models import ComponentInstanceThreat

        # Get all DFDs for this threat model
        dfd_associations = threat_model.dfd_associations.select_related("dfd").all()
        dfds = [assoc.dfd for assoc in dfd_associations]

        # Build node_id -> component_id mapping from all DFDs
        node_component_map = {}
        for dfd in dfds:
            canvas_data = dfd.canvas_data or {}
            for node in canvas_data.get("nodes", []):
                node_id = node.get("id")
                component_id = node.get("data", {}).get("component_id")
                if node_id and component_id:
                    node_component_map[node_id] = {
                        "component_id": component_id,
                        "dfd_id": str(dfd.id),
                        "dfd_name": dfd.name,
                    }

        # Get all component IDs
        component_ids = [v["component_id"] for v in node_component_map.values()]

        if not component_ids:
            return {
                "threat_model_id": str(threat_model.id),
                "threats": [],
                "total_count": 0,
                "node_component_map": node_component_map,
            }

        # Fetch all threats for these components
        threats = ComponentInstanceThreat.objects.filter(
            component_id__in=component_ids
        ).select_related(
            "component", "threat_library"
        ).prefetch_related(
            "countermeasures__countermeasure_library",
            "countermeasures__assigned_owner",
            "countermeasures__verified_by",
        )

        # Build response with node mapping
        result = []
        for threat in threats:
            # Find which node this component corresponds to
            node_info = None
            for node_id, info in node_component_map.items():
                if info["component_id"] == threat.component_id:
                    node_info = {"node_id": node_id, **info}
                    break

            threat_data = {
                "id": threat.id,
                "component_id": threat.component_id,
                "component_name": threat.component.name if threat.component else None,
                "node_id": node_info["node_id"] if node_info else None,
                "dfd_id": node_info["dfd_id"] if node_info else None,
                "dfd_name": node_info["dfd_name"] if node_info else None,
                "threat_library_id": threat.threat_library_id,
                "threat_name": threat.threat_library.name if threat.threat_library else None,
                "threat_description": threat.threat_library.description if threat.threat_library else None,
                "stride_category": threat.threat_library.stride_category if threat.threat_library else None,
                "inherent_severity": threat.inherent_severity,
                "residual_severity": threat.residual_severity,
                "status": threat.status,
                "justification": threat.justification,
                "countermeasures": [
                    {
                        "id": cm.id,
                        "countermeasure_library_id": cm.countermeasure_library_id,
                        "countermeasure_name": cm.countermeasure_library.name if cm.countermeasure_library else None,
                        "control_type": cm.countermeasure_library.control_type if cm.countermeasure_library else None,
                        "status": cm.status,
                        "evidence_url": cm.evidence_url,
                        "assigned_owner_email": cm.assigned_owner.email if cm.assigned_owner else None,
                        "verified_by_email": cm.verified_by.email if cm.verified_by else None,
                    }
                    for cm in threat.countermeasures.all()
                ],
            }
            result.append(threat_data)

        return {
            "threat_model_id": str(threat_model.id),
            "threats": result,
            "total_count": len(result),
            "node_component_map": node_component_map,
        }


class TeamInvitationViewSet(viewsets.ModelViewSet):
    """Manage team invitations (for admins/leads)."""

    serializer_class = TeamInvitationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["team", "status"]

    def get_queryset(self):
        """Show invitations for teams user can manage."""
        user = self.request.user
        return TeamInvitation.objects.filter(
            team__memberships__user=user,
            team__memberships__role="lead",
        ).select_related("team", "team__organization", "invited_by")

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        """Revoke a pending invitation."""
        invitation = self.get_object()
        if invitation.status != TeamInvitation.Status.PENDING:
            return Response(
                {"error": "Can only revoke pending invitations"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.status = TeamInvitation.Status.REVOKED
        invitation.save(update_fields=["status"])
        return Response({"status": "revoked"})


class TeamInvitationAcceptView(APIView):
    """
    Accept a team invitation.
    - GET: returns invitation details (no auth required)
    - POST: accepts the invitation (requires auth)
    """

    permission_classes = []  # No auth required for GET

    def get(self, request, token):
        """Get invitation details (for signup/login page)."""
        try:
            invitation = TeamInvitation.objects.select_related(
                "team", "team__organization"
            ).get(token=token)
        except TeamInvitation.DoesNotExist:
            return Response(
                {"error": "Invalid invitation"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not invitation.is_valid():
            return Response(
                {"error": "Invitation expired or already used"},
                status=status.HTTP_410_GONE,
            )

        return Response({
            "invitation": TeamInvitationSerializer(invitation).data,
            "requires_signup": not request.user.is_authenticated,
        })

    def post(self, request, token):
        """Accept the invitation (requires authentication)."""
        if not request.user.is_authenticated:
            return Response(
                {"error": "Must be logged in to accept invitation"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            invitation = TeamInvitation.objects.select_related("team").get(token=token)
        except TeamInvitation.DoesNotExist:
            return Response(
                {"error": "Invalid invitation"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not invitation.is_valid():
            return Response(
                {"error": "Invitation expired or already used"},
                status=status.HTTP_410_GONE,
            )

        # Verify email matches (optional security check)
        if invitation.email.lower() != request.user.email.lower():
            return Response(
                {"error": "Invitation was sent to a different email address"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Accept invitation - creates TeamMembership
        membership = invitation.accept(request.user)

        # Also add to organization if not already a member
        OrganizationMember.objects.get_or_create(
            organization=invitation.team.organization,
            user=request.user,
            defaults={"role": OrganizationMember.Role.VIEWER},
        )

        return Response({
            "status": "accepted",
            "membership": TeamMembershipSerializer(membership).data,
        })


class SharedWithMeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing threat models shared with the current user via magic links.
    Read-only - users cannot modify these records directly.
    """

    serializer_class = SharedWithMeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["last_accessed_at", "first_accessed_at", "access_count"]
    ordering = ["-last_accessed_at"]

    def get_queryset(self):
        """Return threat models shared with the current user."""
        return SharedWithMe.objects.filter(
            user=self.request.user
        ).select_related(
            "threat_model",
            "threat_model__organization",
            "magic_link",
            "magic_link__created_by",
        )

    @action(detail=True, methods=["delete"])
    def remove(self, request, pk=None):
        """Remove a model from the user's 'Shared with Me' list."""
        shared_item = self.get_object()
        shared_item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
