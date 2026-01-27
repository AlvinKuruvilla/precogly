"""
Serializers for packs app.
"""

from rest_framework import serializers

from apps.systems.models import ComponentLibrary
from apps.threats.models import CountermeasureLibrary, ThreatLibrary
from apps.diagrams.models import DFDTemplatesLibrary
from apps.compliance.models import StandardFramework

from .models import LibraryPack, LibraryPackDependency


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

    is_imported = serializers.SerializerMethodField()

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
            "is_imported",
        ]

    def get_is_imported(self, obj):
        """Check if pack has library items in the database."""
        # A pack is "imported" if it has components, threats, countermeasures, or frameworks
        return (
            ComponentLibrary.objects.filter(source_pack=obj).exists()
            or ThreatLibrary.objects.filter(source_pack=obj).exists()
            or CountermeasureLibrary.objects.filter(source_pack=obj).exists()
            or StandardFramework.objects.filter(source_pack=obj).exists()
        )


class LibraryPackDetailSerializer(serializers.ModelSerializer):
    """Full serializer for pack detail view."""

    dependencies = LibraryPackDependencySerializer(many=True, read_only=True)
    content_summary = serializers.SerializerMethodField()
    is_imported = serializers.SerializerMethodField()

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
            "is_imported",
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
            "components": ComponentLibrary.objects.filter(source_pack=obj).count(),
            "threats": ThreatLibrary.objects.filter(source_pack=obj).count(),
            "countermeasures": CountermeasureLibrary.objects.filter(source_pack=obj).count(),
            "templates": DFDTemplatesLibrary.objects.filter(source_pack=obj).count(),
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

    def get_is_imported(self, obj):
        """Check if pack has library items in the database."""
        return (
            ComponentLibrary.objects.filter(source_pack=obj).exists()
            or ThreatLibrary.objects.filter(source_pack=obj).exists()
            or CountermeasureLibrary.objects.filter(source_pack=obj).exists()
            or StandardFramework.objects.filter(source_pack=obj).exists()
        )


class PackDependencyTreeSerializer(serializers.Serializer):
    """Serializer for showing dependencies before import."""

    pack = LibraryPackListSerializer()
    dependencies = serializers.ListField(child=serializers.DictField())
    missing_dependencies = serializers.ListField(child=serializers.CharField())
    all_satisfied = serializers.BooleanField()
