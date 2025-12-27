"""
Views for packs app.
"""

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.diagrams.models import DFDTemplatesLibrary
from apps.systems.models import ComponentLibrary
from apps.threats.models import ComponentLibraryThreat, CountermeasureLibrary, ThreatLibrary

from .models import LibraryPack, LibraryPackDependency, OrganizationPackInstallation
from .serializers import (
    LibraryPackDetailSerializer,
    LibraryPackListSerializer,
    OrganizationPackInstallationSerializer,
    PackDependencyTreeSerializer,
    PackInstallResponseSerializer,
)


class LibraryPackViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for browsing and installing library packs.

    list: Browse all published packs
    retrieve: Get pack details
    install: Install a pack for the user's organization
    check_dependencies: Check if dependencies are satisfied
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["pack_type", "tier", "source"]
    search_fields = ["name", "description", "author", "tags", "industries"]
    ordering_fields = ["name", "install_count", "created_at", "published_at"]
    ordering = ["-install_count", "name"]

    def get_queryset(self):
        """Return published packs, optionally filtered by industry."""
        queryset = LibraryPack.objects.filter(is_published=True)

        # Filter by industry if provided
        industry = self.request.query_params.get("industry")
        if industry:
            queryset = queryset.filter(industries__contains=[industry])

        # Filter by tag if provided
        tag = self.request.query_params.get("tag")
        if tag:
            queryset = queryset.filter(tags__contains=[tag])

        return queryset.prefetch_related("dependencies__depends_on_pack")

    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == "list":
            return LibraryPackListSerializer
        return LibraryPackDetailSerializer

    @action(detail=True, methods=["get"])
    def check_dependencies(self, request, pk=None):
        """
        Check if all dependencies are satisfied for installation.
        Returns the dependency tree and any missing dependencies.
        """
        pack = self.get_object()
        user = request.user

        # Get user's org
        org_membership = user.organization_memberships.first()
        if not org_membership:
            return Response(
                {"error": "User must belong to an organization"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        org = org_membership.organization

        # Get installed packs for this org
        installed_pack_ids = set(
            OrganizationPackInstallation.objects.filter(organization=org).values_list(
                "pack_id", flat=True
            )
        )

        # Build dependency tree
        dependencies = []
        missing_dependencies = []

        for dep in pack.dependencies.filter(is_optional=False):
            dep_pack = dep.depends_on_pack
            is_installed = dep_pack.id in installed_pack_ids

            dependencies.append(
                {
                    "pack_id": dep_pack.id,
                    "slug": dep_pack.slug,
                    "name": dep_pack.name,
                    "version": dep_pack.version,
                    "version_constraint": dep.version_constraint,
                    "is_installed": is_installed,
                }
            )

            if not is_installed:
                missing_dependencies.append(dep_pack.slug)

        response_data = {
            "pack": LibraryPackDetailSerializer(pack, context={"request": request}).data,
            "dependencies": dependencies,
            "missing_dependencies": missing_dependencies,
            "all_satisfied": len(missing_dependencies) == 0,
        }

        return Response(response_data)

    @action(detail=True, methods=["post"])
    def install(self, request, pk=None):
        """
        Install a pack for the user's organization.
        Optionally installs missing dependencies if install_dependencies=true.
        """
        pack = self.get_object()
        user = request.user

        # Get user's org
        org_membership = user.organization_memberships.first()
        if not org_membership:
            return Response(
                {"error": "User must belong to an organization"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        org = org_membership.organization

        # Check if already installed
        existing = OrganizationPackInstallation.objects.filter(
            organization=org, pack=pack
        ).first()
        if existing:
            return Response(
                {"error": f"Pack '{pack.name}' is already installed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check dependencies
        install_dependencies = request.data.get("install_dependencies", False)
        missing_deps = []

        for dep in pack.dependencies.filter(is_optional=False):
            dep_pack = dep.depends_on_pack
            if not OrganizationPackInstallation.objects.filter(
                organization=org, pack=dep_pack
            ).exists():
                missing_deps.append(dep_pack)

        if missing_deps and not install_dependencies:
            return Response(
                {
                    "error": "Missing required dependencies",
                    "missing_dependencies": [p.slug for p in missing_deps],
                    "message": "Set install_dependencies=true to install them automatically",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        dependencies_installed = []

        with transaction.atomic():
            # Install missing dependencies first
            for dep_pack in missing_deps:
                self._create_installation(org, dep_pack, user)
                dependencies_installed.append(dep_pack.slug)

            # Install the main pack
            installation = self._create_installation(org, pack, user)

        serializer = PackInstallResponseSerializer(
            {
                "installation": installation,
                "dependencies_installed": dependencies_installed,
                "message": f"Successfully installed {pack.name} v{pack.version}",
            },
            context={"request": request},
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _create_installation(self, org, pack, user):
        """Create an installation record and increment install count."""
        installation = OrganizationPackInstallation.objects.create(
            organization=org,
            pack=pack,
            installed_version=pack.version,
            installed_by=user,
            status=OrganizationPackInstallation.Status.INSTALLED,
        )

        # Increment install count
        pack.install_count += 1
        pack.save(update_fields=["install_count"])

        return installation


class OrganizationPackInstallationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing installed packs.

    list: List installed packs for user's organization
    destroy: Uninstall a pack
    """

    permission_classes = [IsAuthenticated]
    serializer_class = OrganizationPackInstallationSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "pack__pack_type"]
    ordering_fields = ["installed_at", "pack__name"]
    ordering = ["-installed_at"]
    http_method_names = ["get", "delete", "head", "options"]  # No create/update via this endpoint

    def get_queryset(self):
        """Return installations for user's organizations."""
        user = self.request.user
        org_ids = list(
            user.organization_memberships.values_list("organization_id", flat=True)
        )
        return OrganizationPackInstallation.objects.filter(
            organization_id__in=org_ids
        ).select_related("pack", "organization", "installed_by")

    def destroy(self, request, *args, **kwargs):
        """Uninstall a pack (soft-delete library items, remove installation)."""
        installation = self.get_object()
        pack = installation.pack

        # Check if other packs depend on this one
        dependent_packs = LibraryPackDependency.objects.filter(
            depends_on_pack=pack, is_optional=False
        ).values_list("pack__slug", flat=True)

        # Check if any of those dependent packs are installed
        org = installation.organization
        installed_dependents = OrganizationPackInstallation.objects.filter(
            organization=org, pack__slug__in=dependent_packs
        ).values_list("pack__name", flat=True)

        if installed_dependents:
            return Response(
                {
                    "error": "Cannot uninstall: other installed packs depend on this pack",
                    "dependent_packs": list(installed_dependents),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Soft-delete library items from this pack
            now = timezone.now()

            ComponentLibrary.objects.filter(source_pack=pack).update(
                is_deleted=True, deleted_at=now
            )
            ThreatLibrary.objects.filter(source_pack=pack).update(
                is_deleted=True, deleted_at=now
            )
            CountermeasureLibrary.objects.filter(source_pack=pack).update(
                is_deleted=True, deleted_at=now
            )
            DFDTemplatesLibrary.objects.filter(source_pack=pack).update(
                is_deleted=True, deleted_at=now
            )

            # Delete the installation record
            installation.delete()

            # Decrement install count
            if pack.install_count > 0:
                pack.install_count -= 1
                pack.save(update_fields=["install_count"])

        return Response(
            {"message": f"Successfully uninstalled {pack.name}"},
            status=status.HTTP_200_OK,
        )
