"""
Views for compliance app.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsSecurityTeam

from .models import CountermeasureLibraryStandard, StandardFramework, StandardRequirement
from .serializers import (
    CountermeasureLibraryStandardSerializer,
    StandardFrameworkListSerializer,
    StandardFrameworkSerializer,
    StandardRequirementSerializer,
)


class StandardFrameworkViewSet(viewsets.ModelViewSet):
    """ViewSet for StandardFramework CRUD operations."""

    queryset = StandardFramework.objects.all()
    permission_classes = [IsAuthenticated, IsSecurityTeam]
    pagination_class = None  # Return all items without pagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "issuer", "description"]
    ordering_fields = ["name", "version"]
    ordering = ["name"]

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == "list":
            return StandardFrameworkListSerializer
        return StandardFrameworkSerializer


class StandardRequirementViewSet(viewsets.ModelViewSet):
    """ViewSet for StandardRequirement CRUD operations."""

    queryset = StandardRequirement.objects.select_related("framework", "parent").all()
    serializer_class = StandardRequirementSerializer
    permission_classes = [IsAuthenticated, IsSecurityTeam]
    pagination_class = None  # Return all items without pagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["framework"]
    search_fields = ["section_code", "description"]


class CountermeasureLibraryStandardViewSet(viewsets.ModelViewSet):
    """ViewSet for countermeasure-standard mappings."""

    queryset = CountermeasureLibraryStandard.objects.select_related(
        "countermeasure_library", "requirement", "requirement__framework"
    ).all()
    serializer_class = CountermeasureLibraryStandardSerializer
    permission_classes = [IsAuthenticated, IsSecurityTeam]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["countermeasure_library", "requirement", "sufficiency"]
