"""
Views for organizations app.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Organization, OrganizationMember
from .serializers import (
    OrganizationListSerializer,
    OrganizationMemberListSerializer,
    OrganizationMemberSerializer,
    OrganizationSerializer,
)


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

    @action(detail=True, methods=["post"])
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

    @action(detail=True, methods=["post"])
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
