"""
Pack discovery and import services.

This module provides services for:
- Discovering packs from the libraries folder
- Importing packs from YAML files into the database
- Syncing pack metadata from source files
"""

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.diagrams.models import DFDTemplatesLibrary
from apps.organizations.models import Organization
from apps.systems.models import ComponentLibrary
from apps.threats.models import (
    ComponentLibraryThreat,
    CountermeasureLibrary,
    ThreatLibrary,
)

from .models import LibraryPack, LibraryPackDependency, OrganizationPackInstallation

logger = logging.getLogger(__name__)


@dataclass
class PackInfo:
    """Information about a pack discovered from the libraries folder."""

    slug: str
    name: str
    description: str
    version: str
    pack_type: str
    tier: str = "free"
    source: str = "official"
    author: str = ""
    industries: list = field(default_factory=list)
    tags: list = field(default_factory=list)
    path: str = ""
    is_in_database: bool = False
    database_version: Optional[str] = None
    component_count: int = 0
    threat_count: int = 0
    countermeasure_count: int = 0

    def to_dict(self):
        return {
            "slug": self.slug,
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "pack_type": self.pack_type,
            "tier": self.tier,
            "source": self.source,
            "author": self.author,
            "industries": self.industries,
            "tags": self.tags,
            "path": self.path,
            "is_in_database": self.is_in_database,
            "database_version": self.database_version,
            "needs_update": self.is_in_database and self.database_version != self.version,
            "component_count": self.component_count,
            "threat_count": self.threat_count,
            "countermeasure_count": self.countermeasure_count,
        }


@dataclass
class ImportResult:
    """Result of a pack import operation."""

    success: bool
    pack_slug: str
    pack_name: str
    version: str
    message: str
    components_created: int = 0
    threats_created: int = 0
    countermeasures_created: int = 0
    templates_created: int = 0
    errors: list = field(default_factory=list)

    def to_dict(self):
        return {
            "success": self.success,
            "pack_slug": self.pack_slug,
            "pack_name": self.pack_name,
            "version": self.version,
            "message": self.message,
            "components_created": self.components_created,
            "threats_created": self.threats_created,
            "countermeasures_created": self.countermeasures_created,
            "templates_created": self.templates_created,
            "errors": self.errors,
        }


def get_libraries_path() -> Path:
    """Get the path to the libraries folder."""
    # Look for libraries folder relative to backend
    backend_dir = Path(settings.BASE_DIR)
    # Go up one level from backend to project root, then into libraries
    libraries_path = backend_dir.parent / "libraries" / "packs"

    if not libraries_path.exists():
        # Fallback: check if libraries is in backend directory
        libraries_path = backend_dir / "libraries" / "packs"

    return libraries_path


def discover_packs_from_source() -> list[PackInfo]:
    """
    Discover all packs from the libraries folder.

    Scans the libraries/packs directory for pack.yaml files and returns
    information about each pack found, including whether it exists in
    the database and if it needs updating.
    """
    libraries_path = get_libraries_path()
    packs = []

    if not libraries_path.exists():
        logger.warning(f"Libraries path does not exist: {libraries_path}")
        return packs

    # Get existing packs from database for comparison
    existing_packs = {p.slug: p.version for p in LibraryPack.objects.all()}

    # Scan for pack directories
    for category_dir in libraries_path.iterdir():
        if not category_dir.is_dir():
            continue

        # Look for pack directories within category (e.g., technologies/aws)
        for pack_dir in category_dir.iterdir():
            if not pack_dir.is_dir():
                continue

            pack_yaml = pack_dir / "pack.yaml"
            if not pack_yaml.exists():
                continue

            try:
                with open(pack_yaml) as f:
                    pack_data = yaml.safe_load(f)

                pack_meta = pack_data.get("pack", {})
                slug = pack_meta.get("slug", pack_dir.name)

                # Count items
                components = pack_data.get("components", [])
                threats = pack_data.get("threats", [])
                countermeasures = pack_data.get("countermeasures", [])

                # Count nested threats/countermeasures in components
                for comp in components:
                    comp_threats = comp.get("threats", [])
                    threats_count = len(comp_threats)
                    for t in comp_threats:
                        countermeasures_count = len(t.get("countermeasures", []))
                        countermeasures = countermeasures + [None] * countermeasures_count
                    threats = threats + [None] * threats_count

                pack_info = PackInfo(
                    slug=slug,
                    name=pack_meta.get("name", slug),
                    description=pack_meta.get("description", ""),
                    version=pack_meta.get("version", "0.0.0"),
                    pack_type=pack_meta.get("pack_type", "technology"),
                    tier=pack_meta.get("tier", "free"),
                    source=pack_meta.get("source", "official"),
                    author=pack_meta.get("author", ""),
                    industries=pack_meta.get("industries", []),
                    tags=pack_meta.get("tags", []),
                    path=str(pack_dir),
                    is_in_database=slug in existing_packs,
                    database_version=existing_packs.get(slug),
                    component_count=len(pack_data.get("components", [])),
                    threat_count=len(threats),
                    countermeasure_count=len(countermeasures),
                )
                packs.append(pack_info)

            except Exception as e:
                logger.error(f"Error reading pack {pack_dir}: {e}")
                continue

    return packs


def get_pack_preview_from_source(slug: str) -> dict | None:
    """
    Get full pack content for preview from the libraries folder.

    Args:
        slug: The pack slug to find

    Returns:
        Dictionary with pack metadata, components, threats, and countermeasures
        or None if pack not found
    """
    libraries_path = get_libraries_path()

    if not libraries_path.exists():
        return None

    # Scan for the pack
    for category_dir in libraries_path.iterdir():
        if not category_dir.is_dir():
            continue

        for pack_dir in category_dir.iterdir():
            if not pack_dir.is_dir():
                continue

            pack_yaml = pack_dir / "pack.yaml"
            if not pack_yaml.exists():
                continue

            try:
                with open(pack_yaml) as f:
                    pack_data = yaml.safe_load(f)

                pack_meta = pack_data.get("pack", {})
                if pack_meta.get("slug", pack_dir.name) == slug:
                    # Found the pack - extract preview data
                    return _extract_pack_preview(pack_data)
            except Exception as e:
                logger.error(f"Error reading pack {pack_dir}: {e}")
                continue

    return None


def get_pack_preview_from_database(pack: "LibraryPack") -> dict:
    """
    Get full pack content for preview from a database pack.

    Args:
        pack: The LibraryPack model instance

    Returns:
        Dictionary with pack metadata, components, threats, and countermeasures
    """
    # The content field stores the full pack.yaml data
    pack_data = pack.content or {}
    return _extract_pack_preview(pack_data, pack=pack)


def _extract_pack_preview(pack_data: dict, pack: "LibraryPack" = None) -> dict:
    """
    Extract preview data from pack_data dictionary.

    Args:
        pack_data: The full pack.yaml content as a dictionary
        pack: Optional LibraryPack model for additional metadata

    Returns:
        Structured preview dictionary
    """
    pack_meta = pack_data.get("pack", {})

    # Extract components
    components = []
    for comp in pack_data.get("components", []):
        components.append({
            "slug": comp.get("slug", ""),
            "name": comp.get("name", ""),
            "category": comp.get("category", ""),
            "component_type": comp.get("component_type", ""),
            "description": comp.get("description", ""),
        })

    # Extract threats (both standalone and nested in components)
    threats = []
    for threat in pack_data.get("threats", []):
        threats.append({
            "slug": threat.get("slug", ""),
            "name": threat.get("name", ""),
            "stride_category": threat.get("stride_category", ""),
            "severity": threat.get("severity", ""),
            "description": threat.get("description", ""),
        })

    # Also get threats nested in components
    for comp in pack_data.get("components", []):
        for threat in comp.get("threats", []):
            threats.append({
                "slug": threat.get("slug", ""),
                "name": threat.get("name", ""),
                "stride_category": threat.get("stride_category", ""),
                "severity": threat.get("severity", ""),
                "description": threat.get("description", ""),
            })

    # Extract countermeasures (standalone, nested in threats, or nested in component threats)
    countermeasures = []
    for cm in pack_data.get("countermeasures", []):
        countermeasures.append({
            "slug": cm.get("slug", ""),
            "name": cm.get("name", ""),
            "control_type": cm.get("control_type", ""),
            "cost": cm.get("cost", ""),
            "description": cm.get("description", ""),
        })

    # Countermeasures nested in standalone threats
    for threat in pack_data.get("threats", []):
        for cm in threat.get("countermeasures", []):
            countermeasures.append({
                "slug": cm.get("slug", ""),
                "name": cm.get("name", ""),
                "control_type": cm.get("control_type", ""),
                "cost": cm.get("cost", ""),
                "description": cm.get("description", ""),
            })

    # Countermeasures nested in component threats
    for comp in pack_data.get("components", []):
        for threat in comp.get("threats", []):
            for cm in threat.get("countermeasures", []):
                countermeasures.append({
                    "slug": cm.get("slug", ""),
                    "name": cm.get("name", ""),
                    "control_type": cm.get("control_type", ""),
                    "cost": cm.get("cost", ""),
                    "description": cm.get("description", ""),
                })

    return {
        "pack": {
            "slug": pack_meta.get("slug", "") if not pack else pack.slug,
            "name": pack_meta.get("name", "") if not pack else pack.name,
            "description": pack_meta.get("description", "") if not pack else pack.description,
            "version": pack_meta.get("version", "") if not pack else pack.version,
            "pack_type": pack_meta.get("pack_type", "") if not pack else pack.pack_type,
            "tier": pack_meta.get("tier", "") if not pack else pack.tier,
            "author": pack_meta.get("author", "") if not pack else pack.author,
            "tags": pack_meta.get("tags", []) if not pack else pack.tags,
            "industries": pack_meta.get("industries", []) if not pack else pack.industries,
        },
        "components": components,
        "threats": threats,
        "countermeasures": countermeasures,
    }


def import_pack_from_path(
    pack_path: Path,
    organization: Optional[Organization] = None,
    installed_by=None,
    force: bool = False,
) -> ImportResult:
    """
    Import a pack from a directory path.

    Args:
        pack_path: Path to the pack directory containing pack.yaml
        organization: Optional organization to install the pack for
        installed_by: User who is installing the pack
        force: If True, reinstall even if pack exists

    Returns:
        ImportResult with details of the import operation
    """
    pack_yaml = pack_path / "pack.yaml"

    if not pack_yaml.exists():
        return ImportResult(
            success=False,
            pack_slug="",
            pack_name="",
            version="",
            message=f"pack.yaml not found in {pack_path}",
            errors=[f"pack.yaml not found in {pack_path}"],
        )

    try:
        with open(pack_yaml) as f:
            pack_data = yaml.safe_load(f)
    except Exception as e:
        return ImportResult(
            success=False,
            pack_slug="",
            pack_name="",
            version="",
            message=f"Failed to parse pack.yaml: {e}",
            errors=[str(e)],
        )

    pack_meta = pack_data.get("pack", {})
    slug = pack_meta.get("slug", "")
    name = pack_meta.get("name", slug)
    version = pack_meta.get("version", "0.0.0")

    # Validate required fields
    required_fields = ["slug", "name", "version", "pack_type"]
    missing = [f for f in required_fields if f not in pack_meta]
    if missing:
        return ImportResult(
            success=False,
            pack_slug=slug,
            pack_name=name,
            version=version,
            message=f"Missing required fields: {missing}",
            errors=[f"Missing required field: {f}" for f in missing],
        )

    # Check if pack exists
    existing = LibraryPack.objects.filter(slug=slug).first()
    if existing and not force:
        # Check if pack has components - if not, we should create them
        has_components = ComponentLibrary.objects.filter(source_pack=existing).exists()

        if has_components:
            # Pack exists with components - just create installation if org provided
            if organization and installed_by:
                _create_installation(existing, organization, installed_by)
                return ImportResult(
                    success=True,
                    pack_slug=slug,
                    pack_name=name,
                    version=existing.version,
                    message=f"Pack '{slug}' already exists (v{existing.version}). Installed for your organization.",
                )
            return ImportResult(
                success=False,
                pack_slug=slug,
                pack_name=name,
                version=version,
                message=f"Pack '{slug}' already exists (v{existing.version}). Use force=True to reinstall.",
                errors=["Pack already exists"],
            )
        else:
            # Pack exists but has no components - recreate them
            logger.info(f"Pack '{slug}' exists but has no components. Creating components...")
            # Fall through to the import logic below to create components

    try:
        with transaction.atomic():
            # Soft delete existing items if forcing reinstall
            if existing and force:
                _soft_delete_pack_items(existing)

            # Create/update LibraryPack
            library_pack = _create_or_update_pack(pack_data)

            # Process dependencies
            _process_dependencies(library_pack, pack_data)

            # Create library items
            components_count = _create_components(library_pack, pack_data)
            threats_count = _create_standalone_threats(library_pack, pack_data)
            countermeasures_count = _create_standalone_countermeasures(library_pack, pack_data)

            # Load DFD templates
            templates_count = _load_dfd_templates(library_pack, pack_path)

            # Create installation if organization specified
            if organization and installed_by:
                _create_installation(library_pack, organization, installed_by)

            return ImportResult(
                success=True,
                pack_slug=slug,
                pack_name=name,
                version=version,
                message=f"Successfully imported {name} v{version}",
                components_created=components_count,
                threats_created=threats_count,
                countermeasures_created=countermeasures_count,
                templates_created=templates_count,
            )

    except Exception as e:
        logger.exception(f"Failed to import pack {slug}")
        return ImportResult(
            success=False,
            pack_slug=slug,
            pack_name=name,
            version=version,
            message=f"Import failed: {e}",
            errors=[str(e)],
        )


def sync_all_packs_from_source(
    force: bool = False,
    organization: Optional[Organization] = None,
    installed_by=None,
) -> list[ImportResult]:
    """
    Sync all packs from the libraries folder to the database.

    Args:
        force: If True, reinstall all packs even if they exist
        organization: Optional organization to install packs for
        installed_by: User who is installing the packs

    Returns:
        List of ImportResult for each pack processed
    """
    packs = discover_packs_from_source()
    results = []

    for pack_info in packs:
        # Skip if already in database and not forcing
        if pack_info.is_in_database and not force:
            # Check if version changed
            if pack_info.database_version == pack_info.version:
                results.append(
                    ImportResult(
                        success=True,
                        pack_slug=pack_info.slug,
                        pack_name=pack_info.name,
                        version=pack_info.version,
                        message=f"Pack already up to date (v{pack_info.version})",
                    )
                )
                continue

        # Import the pack and auto-install for org if provided
        result = import_pack_from_path(
            Path(pack_info.path),
            organization=organization,
            installed_by=installed_by,
            force=force,
        )
        results.append(result)

    return results


# =============================================================================
# Private helper functions
# =============================================================================


def _soft_delete_pack_items(pack: LibraryPack):
    """Soft delete all library items from a pack."""
    now = timezone.now()
    ComponentLibrary.objects.filter(source_pack=pack).update(is_deleted=True, deleted_at=now)
    ThreatLibrary.objects.filter(source_pack=pack).update(is_deleted=True, deleted_at=now)
    CountermeasureLibrary.objects.filter(source_pack=pack).update(is_deleted=True, deleted_at=now)
    DFDTemplatesLibrary.objects.filter(source_pack=pack).update(is_deleted=True, deleted_at=now)


def _create_or_update_pack(pack_data: dict) -> LibraryPack:
    """Create or update the LibraryPack record."""
    pack = pack_data["pack"]
    slug = pack["slug"]

    library_pack, _ = LibraryPack.objects.update_or_create(
        slug=slug,
        defaults={
            "name": pack["name"],
            "description": pack.get("description", ""),
            "version": pack["version"],
            "pack_type": pack["pack_type"],
            "tier": pack.get("tier", "free"),
            "source": pack.get("source", "official"),
            "author": pack.get("author", ""),
            "repository_url": pack.get("repository_url", ""),
            "documentation_url": pack.get("documentation_url", ""),
            "industries": pack.get("industries", []),
            "tags": pack.get("tags", []),
            "content": pack_data,
            "is_published": True,
            "published_at": timezone.now(),
        },
    )

    return library_pack


def _process_dependencies(library_pack: LibraryPack, pack_data: dict):
    """Process pack dependencies with version constraints."""
    depends_on = pack_data.get("pack", {}).get("depends_on", [])

    # Clear existing dependencies
    LibraryPackDependency.objects.filter(pack=library_pack).delete()

    for dep in depends_on:
        if isinstance(dep, str):
            dep_slug = dep
            version_constraint = ""
            is_optional = False
        else:
            dep_slug = dep.get("pack", dep.get("slug", ""))
            version_constraint = dep.get("version", "")
            is_optional = dep.get("optional", False)

        # Find the dependency pack (may not exist yet)
        dep_pack = LibraryPack.objects.filter(slug=dep_slug).first()
        if dep_pack:
            LibraryPackDependency.objects.create(
                pack=library_pack,
                depends_on_pack=dep_pack,
                version_constraint=version_constraint,
                is_optional=is_optional,
            )


def _create_components(library_pack: LibraryPack, pack_data: dict) -> int:
    """Create components with their nested threats and countermeasures."""
    components = pack_data.get("components", [])
    count = 0

    for comp_data in components:
        component = _create_component(library_pack, comp_data)
        count += 1

        # Create nested threats
        for threat_data in comp_data.get("threats", []):
            threat = _create_threat(library_pack, threat_data)

            # Link threat to component
            ComponentLibraryThreat.objects.get_or_create(
                component_library=component,
                threat_library=threat,
                defaults={
                    "default_severity": threat_data.get("severity", "medium"),
                    "applies_to": "component",
                },
            )

            # Create nested countermeasures
            for cm_data in threat_data.get("countermeasures", []):
                countermeasure = _create_countermeasure(library_pack, cm_data)
                countermeasure.applicable_threats.add(threat)

    return count


def _create_component(library_pack: LibraryPack, comp_data: dict) -> ComponentLibrary:
    """Create a ComponentLibrary record."""
    slug = comp_data["slug"]
    qualified_slug = f"{library_pack.slug}/{slug}"

    component, _ = ComponentLibrary.objects.update_or_create(
        qualified_slug=qualified_slug,
        defaults={
            "source_pack": library_pack,
            "slug": slug,
            "name": comp_data["name"],
            "category": comp_data["category"],
            "component_type": comp_data.get("component_type", ""),
            "provider": comp_data.get("provider", library_pack.slug.split("-")[0] if "-" in library_pack.slug else ""),
            "customization_status": "original",
            "is_deleted": False,
            "deleted_at": None,
        },
    )
    return component


def _create_threat(library_pack: LibraryPack, threat_data: dict) -> ThreatLibrary:
    """Create a ThreatLibrary record."""
    slug = threat_data["slug"]
    qualified_slug = f"{library_pack.slug}/{slug}"

    threat, _ = ThreatLibrary.objects.update_or_create(
        qualified_slug=qualified_slug,
        defaults={
            "source_pack": library_pack,
            "slug": slug,
            "name": threat_data["name"],
            "description": threat_data.get("description", ""),
            "stride_category": threat_data.get("stride_category", ""),
            "source": threat_data.get("source", "custom"),
            "source_id": threat_data.get("source_id", ""),
            "customization_status": "original",
            "is_deleted": False,
            "deleted_at": None,
        },
    )
    return threat


def _create_countermeasure(library_pack: LibraryPack, cm_data: dict) -> CountermeasureLibrary:
    """Create a CountermeasureLibrary record."""
    slug = cm_data["slug"]
    qualified_slug = f"{library_pack.slug}/{slug}"

    countermeasure, _ = CountermeasureLibrary.objects.update_or_create(
        qualified_slug=qualified_slug,
        defaults={
            "source_pack": library_pack,
            "slug": slug,
            "name": cm_data["name"],
            "description": cm_data.get("description", ""),
            "control_type": cm_data.get("control_type", "technical"),
            "cost": cm_data.get("cost", "medium"),
            "customization_status": "original",
            "is_deleted": False,
            "deleted_at": None,
        },
    )
    return countermeasure


def _create_standalone_threats(library_pack: LibraryPack, pack_data: dict) -> int:
    """Create standalone threats (not nested under components)."""
    threats = pack_data.get("threats", [])
    count = 0

    for threat_data in threats:
        _create_threat(library_pack, threat_data)
        count += 1

        # Create nested countermeasures for standalone threats
        for cm_data in threat_data.get("countermeasures", []):
            countermeasure = _create_countermeasure(library_pack, cm_data)
            threat = ThreatLibrary.objects.filter(
                qualified_slug=f"{library_pack.slug}/{threat_data['slug']}",
                is_deleted=False,
            ).first()
            if threat:
                countermeasure.applicable_threats.add(threat)

    return count


def _create_standalone_countermeasures(library_pack: LibraryPack, pack_data: dict) -> int:
    """Create standalone countermeasures and link to threats."""
    countermeasures = pack_data.get("countermeasures", [])
    count = 0

    for cm_data in countermeasures:
        countermeasure = _create_countermeasure(library_pack, cm_data)
        count += 1

        # Link to applicable threats
        for threat_ref in cm_data.get("applicable_threats", []):
            threat = _resolve_threat_reference(library_pack, threat_ref)
            if threat:
                countermeasure.applicable_threats.add(threat)

    return count


def _resolve_threat_reference(library_pack: LibraryPack, threat_ref: str) -> Optional[ThreatLibrary]:
    """Resolve a threat reference (slug or qualified slug)."""
    if "/" in threat_ref:
        return ThreatLibrary.objects.filter(qualified_slug=threat_ref, is_deleted=False).first()

    # Try current pack first
    qualified = f"{library_pack.slug}/{threat_ref}"
    threat = ThreatLibrary.objects.filter(qualified_slug=qualified, is_deleted=False).first()

    if not threat:
        # Try global
        threat = ThreatLibrary.objects.filter(
            qualified_slug=f"global/{threat_ref}", is_deleted=False
        ).first()

    return threat


def _load_dfd_templates(library_pack: LibraryPack, pack_path: Path) -> int:
    """Load DFD templates from the DFDTemplates directory."""
    templates_dir = pack_path / "DFDTemplates"
    if not templates_dir.exists():
        return 0

    template_files = list(templates_dir.glob("*.yaml")) + list(templates_dir.glob("*.yml"))
    count = 0

    for template_file in template_files:
        try:
            with open(template_file) as f:
                template_data = yaml.safe_load(f)

            template = template_data.get("template", {})
            slug = template.get("slug", template_file.stem)
            qualified_slug = f"{library_pack.slug}/{slug}"

            DFDTemplatesLibrary.objects.update_or_create(
                qualified_slug=qualified_slug,
                defaults={
                    "source_pack": library_pack,
                    "slug": slug,
                    "name": template.get("name", slug),
                    "description": template.get("description", ""),
                    "category": template.get("category", "webapp"),
                    "diagram_type": template.get("diagram_type", "level1"),
                    "canvas_data": template_data.get("canvas_data", {}),
                    "customization_status": "original",
                    "is_deleted": False,
                    "deleted_at": None,
                },
            )
            count += 1
        except Exception as e:
            logger.error(f"Error loading template {template_file}: {e}")

    return count


def _create_installation(library_pack: LibraryPack, org: Organization, user) -> OrganizationPackInstallation:
    """
    Create installation record for organization.

    Also restores any soft-deleted library items from a previous uninstall.
    """
    installation, created = OrganizationPackInstallation.objects.update_or_create(
        organization=org,
        pack=library_pack,
        defaults={
            "installed_version": library_pack.version,
            "installed_by": user,
            "status": OrganizationPackInstallation.Status.INSTALLED,
        },
    )

    if created:
        library_pack.install_count += 1
        library_pack.save(update_fields=["install_count"])

    # Restore any soft-deleted library items from previous uninstall
    _restore_library_items(library_pack)

    return installation


def _restore_library_items(library_pack: LibraryPack) -> None:
    """
    Restore soft-deleted library items for a pack.

    Called when re-installing a pack that was previously uninstalled.
    """
    from apps.diagrams.models import DFDTemplatesLibrary

    # Restore components
    ComponentLibrary.objects.filter(
        source_pack=library_pack,
        is_deleted=True,
    ).update(is_deleted=False, deleted_at=None)

    # Restore threats
    ThreatLibrary.objects.filter(
        source_pack=library_pack,
        is_deleted=True,
    ).update(is_deleted=False, deleted_at=None)

    # Restore countermeasures
    CountermeasureLibrary.objects.filter(
        source_pack=library_pack,
        is_deleted=True,
    ).update(is_deleted=False, deleted_at=None)

    # Restore DFD templates
    DFDTemplatesLibrary.objects.filter(
        source_pack=library_pack,
        is_deleted=True,
    ).update(is_deleted=False, deleted_at=None)
