"""
Serializers for packs app.
"""

from rest_framework import serializers

from apps.systems.models import ComponentLibrary
from apps.threats.models import CountermeasureLibrary, ThreatLibrary
from apps.diagrams.models import DFDTemplatesLibrary

from .models import LibraryPack, LibraryPackDependency, OrganizationPackInstallation


class LibraryPackDependencySerializer(serializers.ModelSerializer):
    """Serializer for pack dependencies."""

    depends_on_pack_name = serializers.CharField(
        source="depends_on_pack.name", read_only=True
    )
    depends_on_pack_slug = serializers.CharField(
        source="depends_on_pack.slug", read_only=True
    )

    class Meta:
        model = LibraryPackDependency
        fields = [
            "id",
            "depends_on_pack",
            "depends_on_pack_name",
            "depends_on_pack_slug",
            "version_constraint",
            "is_optional",
        ]
        read_only_fields = ["id"]


class LibraryPackListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for pack listing."""

    is_installed = serializers.SerializerMethodField()

    class Meta:
        model = LibraryPack
        fields = [
            "id",
            "slug",
            "name",
            "description",
            "version",
            "pack_type",
            "tier",
            "source",
            "author",
            "install_count",
            "industries",
            "tags",
            "is_installed",
        ]

    def get_is_installed(self, obj):
        """Check if pack is installed for the user's organization."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        org_ids = list(
            request.user.organization_memberships.values_list("organization_id", flat=True)
        )
        return OrganizationPackInstallation.objects.filter(
            organization_id__in=org_ids, pack=obj
        ).exists()


class LibraryPackDetailSerializer(serializers.ModelSerializer):
    """Full serializer for pack detail view."""

    dependencies = LibraryPackDependencySerializer(many=True, read_only=True)
    content_summary = serializers.SerializerMethodField()
    is_installed = serializers.SerializerMethodField()
    installed_version = serializers.SerializerMethodField()

    class Meta:
        model = LibraryPack
        fields = [
            "id",
            "slug",
            "name",
            "description",
            "version",
            "pack_type",
            "tier",
            "source",
            "author",
            "repository_url",
            "documentation_url",
            "icon_url",
            "industries",
            "tags",
            "install_count",
            "is_published",
            "published_at",
            "dependencies",
            "content_summary",
            "is_installed",
            "installed_version",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "install_count"]

    def get_content_summary(self, obj):
        """Return count of items in the pack.

        First tries to count from database records. If no records exist,
        falls back to counting from the pack.content field which stores
        the original pack.yaml data.
        """
        # Try database counts first
        db_counts = {
            "components": ComponentLibrary.objects.filter(
                source_pack=obj, is_deleted=False
            ).count(),
            "threats": ThreatLibrary.objects.filter(
                source_pack=obj, is_deleted=False
            ).count(),
            "countermeasures": CountermeasureLibrary.objects.filter(
                source_pack=obj, is_deleted=False
            ).count(),
            "templates": DFDTemplatesLibrary.objects.filter(
                source_pack=obj, is_deleted=False
            ).count(),
        }

        # If all DB counts are 0 and pack has content, use content as fallback
        if all(v == 0 for v in db_counts.values()) and obj.content:
            content = obj.content

            # Count components
            components = content.get("components", [])
            component_count = len(components)

            # Count threats (standalone + nested in components)
            threats = content.get("threats", [])
            threat_count = len(threats)
            for comp in components:
                threat_count += len(comp.get("threats", []))

            # Count countermeasures (standalone + nested in threats)
            countermeasures = content.get("countermeasures", [])
            cm_count = len(countermeasures)
            for threat in threats:
                cm_count += len(threat.get("countermeasures", []))
            for comp in components:
                for threat in comp.get("threats", []):
                    cm_count += len(threat.get("countermeasures", []))

            return {
                "components": component_count,
                "threats": threat_count,
                "countermeasures": cm_count,
                "templates": db_counts["templates"],  # Keep DB count for templates
            }

        return db_counts

    def get_is_installed(self, obj):
        """Check if pack is installed for the user's organization."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        org_ids = list(
            request.user.organization_memberships.values_list("organization_id", flat=True)
        )
        return OrganizationPackInstallation.objects.filter(
            organization_id__in=org_ids, pack=obj
        ).exists()

    def get_installed_version(self, obj):
        """Get the installed version if pack is installed."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None

        org_ids = list(
            request.user.organization_memberships.values_list("organization_id", flat=True)
        )
        installation = OrganizationPackInstallation.objects.filter(
            organization_id__in=org_ids, pack=obj
        ).first()
        return installation.installed_version if installation else None


class OrganizationPackInstallationSerializer(serializers.ModelSerializer):
    """Serializer for pack installations."""

    pack = LibraryPackListSerializer(read_only=True)
    installed_by_email = serializers.EmailField(
        source="installed_by.email", read_only=True
    )
    update_available = serializers.BooleanField(read_only=True)

    class Meta:
        model = OrganizationPackInstallation
        fields = [
            "id",
            "organization",
            "pack",
            "installed_version",
            "status",
            "installed_by",
            "installed_by_email",
            "installed_at",
            "last_updated_at",
            "update_available",
        ]
        read_only_fields = [
            "id",
            "installed_at",
            "last_updated_at",
            "installed_by_email",
            "update_available",
        ]


class PackInstallResponseSerializer(serializers.Serializer):
    """Response serializer for pack installation."""

    installation = OrganizationPackInstallationSerializer()
    dependencies_installed = serializers.ListField(
        child=serializers.CharField(), read_only=True
    )
    message = serializers.CharField(read_only=True)


class PackDependencyTreeSerializer(serializers.Serializer):
    """Serializer for showing dependencies before install."""

    pack = LibraryPackListSerializer()
    dependencies = serializers.ListField(child=serializers.DictField())
    missing_dependencies = serializers.ListField(child=serializers.CharField())
    all_satisfied = serializers.BooleanField()
