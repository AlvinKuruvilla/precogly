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
from apps.systems.models import ComponentLibrary
from apps.threats.models import (
    ComponentLibraryThreat,
    CountermeasureLibrary,
    ExternalTaxonomy,
    TaxonomyEntry,
    ThreatLibrary,
    ThreatLibraryTaxonomyEntry,
)

from .models import LibraryPack, LibraryPackDependency, PendingFrameworkOverlay

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
    taxonomy_count: int = 0
    depends_on: list = field(default_factory=list)

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
            "taxonomy_count": self.taxonomy_count,
            "depends_on": self.depends_on,
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
    taxonomies_created: int = 0
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
            "taxonomies_created": self.taxonomies_created,
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


def _count_items_in_file(file_path: Path, key: str) -> int:
    """Count items in a YAML file under a specific key."""
    if not file_path.exists():
        return 0
    try:
        with open(file_path) as f:
            data = yaml.safe_load(f) or {}
        return len(data.get(key, []))
    except Exception:
        return 0


def _discover_pack(pack_dir: Path, existing_packs: dict) -> PackInfo | None:
    """Discover a pack from its directory."""
    pack_yaml = pack_dir / "pack.yaml"
    if not pack_yaml.exists():
        return None

    try:
        with open(pack_yaml) as f:
            pack_data = yaml.safe_load(f)

        pack_meta = pack_data.get("pack", {})
        slug = pack_meta.get("slug", pack_dir.name)

        # Count items from separate files
        component_count = _count_items_in_file(pack_dir / "components.yaml", "components")
        threat_count = _count_items_in_file(pack_dir / "threats.yaml", "threats")
        countermeasure_count = _count_items_in_file(pack_dir / "countermeasures.yaml", "countermeasures")
        taxonomy_count = _count_items_in_file(pack_dir / "taxonomy.yaml", "taxonomies")

        return PackInfo(
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
            component_count=component_count,
            threat_count=threat_count,
            countermeasure_count=countermeasure_count,
            taxonomy_count=taxonomy_count,
            depends_on=pack_meta.get("depends_on", []),
        )
    except Exception as e:
        logger.error(f"Error reading pack {pack_dir}: {e}")
        return None


def discover_packs_from_source() -> list[PackInfo]:
    """
    Discover all packs from the libraries folder.

    Scans the libraries/packs directory for packs and returns
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

    # Scan for pack directories - support both flat and categorized structures
    def scan_directory(base_dir: Path):
        """Recursively scan for pack directories."""
        for item in base_dir.iterdir():
            if not item.is_dir():
                continue

            # Check if this directory is a pack (has pack.yaml)
            if (item / "pack.yaml").exists():
                pack_info = _discover_pack(item, existing_packs)
                if pack_info:
                    packs.append(pack_info)
            else:
                # This might be a category directory, scan it recursively
                scan_directory(item)

    scan_directory(libraries_path)

    # Resolve depends_on slugs to {slug, name, is_imported} dicts
    pack_by_slug = {p.slug: p for p in packs}
    for pack_info in packs:
        resolved_dependencies = []
        for dep_entry in pack_info.depends_on:
            if isinstance(dep_entry, str):
                dep_slug = dep_entry
            else:
                dep_slug = dep_entry.get("pack", dep_entry.get("slug", ""))
            dep = pack_by_slug.get(dep_slug)
            resolved_dependencies.append({
                "slug": dep_slug,
                "name": dep.name if dep else dep_slug,
                "is_imported": dep_slug in existing_packs,
            })
        pack_info.depends_on = resolved_dependencies

    return packs


def get_pack_preview_from_source(slug: str) -> dict | None:
    """
    Get full pack content for preview from the libraries folder.

    Reads pack metadata from pack.yaml and components/threats/countermeasures
    from their respective YAML files.

    Supports both flat (packs directly in libraries/packs/) and
    nested (packs in libraries/packs/category/pack/) directory structures.

    Args:
        slug: The pack slug to find

    Returns:
        Dictionary with pack metadata, components, threats, and countermeasures
        or None if pack not found
    """
    libraries_path = get_libraries_path()

    if not libraries_path.exists():
        return None

    def find_pack_dir(base_path: Path) -> Path | None:
        """Recursively find a pack directory by slug."""
        for item in base_path.iterdir():
            if not item.is_dir():
                continue

            pack_yaml = item / "pack.yaml"
            if pack_yaml.exists():
                try:
                    with open(pack_yaml) as f:
                        pack_data = yaml.safe_load(f)
                    pack_meta = pack_data.get("pack", {})
                    if pack_meta.get("slug", item.name) == slug:
                        return item
                except Exception:
                    pass

            # Check subdirectories (for nested structure)
            result = find_pack_dir(item)
            if result:
                return result

        return None

    pack_dir = find_pack_dir(libraries_path)
    if not pack_dir:
        return None

    try:
        pack_yaml = pack_dir / "pack.yaml"
        with open(pack_yaml) as f:
            pack_data = yaml.safe_load(f)

        return _extract_pack_preview(pack_dir, pack_data)
    except Exception as e:
        logger.error(f"Error reading pack {pack_dir}: {e}")
        return None


def get_pack_preview_from_database(pack: "LibraryPack") -> dict:
    """
    Get full pack content for preview from a database pack.

    Reads preview data from the source YAML files rather than the database,
    ensuring consistent results regardless of how the pack was imported.

    Args:
        pack: The LibraryPack model instance

    Returns:
        Dictionary with pack metadata, components, threats, and countermeasures
    """
    return get_pack_preview_from_source(pack.slug)


def _extract_pack_preview(pack_dir: Path, pack_data: dict) -> dict:
    """
    Extract preview data from separate YAML files.

    Reads components/threats/countermeasures from their respective files
    in the pack directory.

    Args:
        pack_dir: Path to the pack directory
        pack_data: The pack.yaml content as a dictionary

    Returns:
        Structured preview dictionary with snake_case keys (auto-converted by middleware)
    """
    pack_meta = pack_data.get("pack", {})

    # Load components from components.yaml
    components = []
    components_file = pack_dir / "components.yaml"
    if components_file.exists():
        try:
            with open(components_file) as f:
                comp_data = yaml.safe_load(f) or {}
            for comp in comp_data.get("components", []):
                components.append({
                    "slug": comp.get("slug", comp.get("id", "")),
                    "name": comp.get("name", ""),
                    "category": comp.get("category", ""),
                    "component_type": comp.get("type", comp.get("component_type", "")),
                    "description": comp.get("description", ""),
                })
        except Exception as e:
            logger.error(f"Error reading components.yaml in {pack_dir}: {e}")

    # Load threats from threats.yaml
    threats = []
    threats_file = pack_dir / "threats.yaml"
    if threats_file.exists():
        try:
            with open(threats_file) as f:
                threat_data = yaml.safe_load(f) or {}
            for threat in threat_data.get("threats", []):
                threats.append({
                    "slug": threat.get("slug", threat.get("id", "")),
                    "name": threat.get("name", ""),
                    "taxonomy_entries": [],
                    "severity": threat.get("severity", ""),
                    "description": threat.get("description", ""),
                })
        except Exception as e:
            logger.error(f"Error reading threats.yaml in {pack_dir}: {e}")

    # Build taxonomy entries from join files
    joins_dir = pack_dir / "joins"
    if joins_dir.exists():
        threat_slug_to_idx = {t["slug"]: i for i, t in enumerate(threats)}
        for join_file in joins_dir.glob("threats-*.yaml"):
            if join_file.name == "threats-countermeasures.yaml":
                continue
            try:
                with open(join_file) as f:
                    join_data = yaml.safe_load(f) or {}
                taxonomy_slug = join_data.get("taxonomy", "")
                for mapping in join_data.get("mappings", []):
                    threat_ref = mapping.get("threat", "")
                    idx = threat_slug_to_idx.get(threat_ref)
                    if idx is None:
                        continue
                    for entry_id in mapping.get("entries", []):
                        title = str(entry_id).replace("-", " ").title()
                        threats[idx]["taxonomy_entries"].append({
                            "taxonomy_slug": taxonomy_slug,
                            "external_id": str(entry_id),
                            "title": title,
                        })
            except Exception as e:
                logger.error(f"Error reading join file {join_file}: {e}")

    # Load countermeasures from countermeasures.yaml
    countermeasures = []
    cm_file = pack_dir / "countermeasures.yaml"
    if cm_file.exists():
        try:
            with open(cm_file) as f:
                cm_data = yaml.safe_load(f) or {}
            for cm in cm_data.get("countermeasures", []):
                countermeasures.append({
                    "slug": cm.get("slug", cm.get("id", "")),
                    "name": cm.get("name", ""),
                    "control_type": cm.get("control_type", ""),
                    "cost": cm.get("cost", ""),
                    "default_status": cm.get("default_status", "gap"),
                    "description": cm.get("description", ""),
                })
        except Exception as e:
            logger.error(f"Error reading countermeasures.yaml in {pack_dir}: {e}")

    # Extract requirements from frameworks section (for compliance packs)
    requirements = []
    for framework in pack_data.get("frameworks", []):
        for req in framework.get("requirements", []):
            requirements.append({
                "section_code": req.get("section_code", ""),
                "description": req.get("description", ""),
                "framework_name": framework.get("name", ""),
            })

    # Load taxonomies from taxonomy.yaml
    taxonomies = []
    taxonomy_file = pack_dir / "taxonomy.yaml"
    if taxonomy_file.exists():
        try:
            with open(taxonomy_file) as f:
                tax_data = yaml.safe_load(f) or {}
            for taxonomy in tax_data.get("taxonomies", []):
                raw_entries = taxonomy.get("entries", [])
                entries = [
                    {
                        "external_id": entry.get("external_id", ""),
                        "title": entry.get("title", ""),
                        "description": entry.get("description", ""),
                    }
                    for entry in raw_entries
                ]
                taxonomies.append({
                    "slug": taxonomy.get("slug", ""),
                    "name": taxonomy.get("name", ""),
                    "description": taxonomy.get("description", ""),
                    "entry_count": len(raw_entries),
                    "entries": entries,
                })
        except Exception as e:
            logger.error(f"Error reading taxonomy.yaml in {pack_dir}: {e}")

    return {
        "pack": {
            "slug": pack_meta.get("slug", ""),
            "name": pack_meta.get("name", ""),
            "description": pack_meta.get("description", ""),
            "version": pack_meta.get("version", ""),
            "pack_type": pack_meta.get("pack_type", ""),
            "tier": pack_meta.get("tier", ""),
            "author": pack_meta.get("author", ""),
            "tags": pack_meta.get("tags", []),
            "industries": pack_meta.get("industries", []),
        },
        "components": components,
        "threats": threats,
        "countermeasures": countermeasures,
        "requirements": requirements,
        "taxonomies": taxonomies,
    }


@dataclass
class ValidationError:
    """A reference validation error."""

    file: str
    line: Optional[int]
    ref_type: str  # 'component', 'threat', 'countermeasure', 'template_component'
    reference: str
    message: str


@dataclass
class ValidationWarning:
    """A structural validation warning that allows import with user confirmation."""

    file: str
    field: str
    message: str
    suggestion: str


@dataclass
class ValidationResult:
    """Result of pack validation."""

    success: bool
    pack_slug: str
    pack_name: str
    version: str
    errors: list[ValidationError] = field(default_factory=list)
    warnings: list[ValidationWarning] = field(default_factory=list)

    def to_dict(self):
        return {
            "success": self.success,
            "pack_slug": self.pack_slug,
            "pack_name": self.pack_name,
            "version": self.version,
            "errors": [
                {
                    "file": e.file,
                    "line": e.line,
                    "ref_type": e.ref_type,
                    "reference": e.reference,
                    "message": e.message,
                }
                for e in self.errors
            ],
            "warnings": [
                {
                    "file": w.file,
                    "field": w.field,
                    "message": w.message,
                    "suggestion": w.suggestion,
                }
                for w in self.warnings
            ],
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
        }


def validate_pack(pack_path: Path) -> ValidationResult:
    """
    Validate a pack's structure and references without importing.

    Performs two categories of checks:
    1. Structural checks: metadata, enum values, slug vs id key usage
    2. Reference checks: cross-file references in joins and templates

    Errors block import entirely. Warnings allow "Import Anyway".

    Args:
        pack_path: Path to the pack directory

    Returns:
        ValidationResult with any errors or warnings found
    """
    pack_yaml = pack_path / "pack.yaml"

    if not pack_yaml.exists():
        return ValidationResult(
            success=False,
            pack_slug="",
            pack_name="",
            version="",
            errors=[ValidationError(
                file="pack.yaml",
                line=None,
                ref_type="pack",
                reference="",
                message="pack.yaml not found",
            )],
        )

    try:
        with open(pack_yaml) as f:
            pack_data = yaml.safe_load(f)
    except Exception as e:
        return ValidationResult(
            success=False,
            pack_slug="",
            pack_name="",
            version="",
            errors=[ValidationError(
                file="pack.yaml",
                line=None,
                ref_type="pack",
                reference="",
                message=f"Failed to parse pack.yaml: {e}",
            )],
        )

    pack_meta = pack_data.get("pack", {})
    slug = pack_meta.get("slug", "")
    name = pack_meta.get("name", slug)
    version = pack_meta.get("version", "0.0.0")

    errors = []
    warnings = []

    # =========================================================================
    # Structural checks
    # =========================================================================

    # Required metadata fields
    required_metadata = ["slug", "name", "version", "pack_type"]
    for required_field in required_metadata:
        if required_field not in pack_meta:
            errors.append(ValidationError(
                file="pack.yaml",
                line=None,
                ref_type="pack",
                reference=required_field,
                message=f"Missing required field: {required_field}",
            ))

    # Valid pack_type enum
    valid_pack_types = {"technology", "threat", "countermeasure", "compliance", "template", "full", "taxonomy"}
    pack_type_value = pack_meta.get("pack_type", "")
    if pack_type_value and pack_type_value not in valid_pack_types:
        warnings.append(ValidationWarning(
            file="pack.yaml",
            field="pack_type",
            message=f"Unknown pack_type: '{pack_type_value}'",
            suggestion=f"Use one of: {', '.join(sorted(valid_pack_types))}",
        ))

    # Valid tier enum (if present)
    valid_tiers = {"free", "premium", "enterprise"}
    tier_value = pack_meta.get("tier", "")
    if tier_value and tier_value not in valid_tiers:
        warnings.append(ValidationWarning(
            file="pack.yaml",
            field="tier",
            message=f"Unknown tier: '{tier_value}'",
            suggestion=f"Use one of: {', '.join(sorted(valid_tiers))}",
        ))

    # Framework entries use 'slug' not 'id'
    for framework_data in pack_data.get("frameworks", []):
        if "id" in framework_data and "slug" not in framework_data:
            warnings.append(ValidationWarning(
                file="pack.yaml",
                field="frameworks[].id",
                message=f"Framework uses 'id' instead of 'slug' (id: '{framework_data['id']}')",
                suggestion="Rename 'id' to 'slug'. Frameworks use 'slug' because they are shared across packs.",
            ))

    # Taxonomy entries use 'slug' not 'id'
    taxonomy_file = pack_path / "taxonomy.yaml"
    if taxonomy_file.exists():
        try:
            with open(taxonomy_file) as f:
                tax_data = yaml.safe_load(f) or {}
            for taxonomy_data in tax_data.get("taxonomies", []):
                if "id" in taxonomy_data and "slug" not in taxonomy_data:
                    warnings.append(ValidationWarning(
                        file="taxonomy.yaml",
                        field="taxonomies[].id",
                        message=f"Taxonomy uses 'id' instead of 'slug' (id: '{taxonomy_data['id']}')",
                        suggestion="Rename 'id' to 'slug'. Taxonomies use 'slug' because they are shared across packs.",
                    ))
        except Exception:
            pass  # Parse errors are caught in reference checks below

    # Components must have 'id'
    components_file = pack_path / "components.yaml"
    if components_file.exists():
        try:
            with open(components_file) as f:
                comp_data = yaml.safe_load(f) or {}
            valid_categories = {"process", "datastore", "external", "human_actor", "system_actor"}
            for i, comp in enumerate(comp_data.get("components", [])):
                if "id" not in comp and "slug" not in comp:
                    errors.append(ValidationError(
                        file="components.yaml",
                        line=None,
                        ref_type="component",
                        reference=f"components[{i}]",
                        message=f"Component at index {i} has no 'id' field",
                    ))
                category_value = comp.get("category", "")
                if category_value and category_value not in valid_categories:
                    warnings.append(ValidationWarning(
                        file="components.yaml",
                        field="category",
                        message=f"Component '{comp.get('id', comp.get('slug', f'[{i}]'))}' has unknown category: '{category_value}'",
                        suggestion=f"Use one of: {', '.join(sorted(valid_categories))}",
                    ))
        except Exception:
            pass

    # Threats must have 'id'
    threats_file = pack_path / "threats.yaml"
    if threats_file.exists():
        try:
            with open(threats_file) as f:
                threat_data = yaml.safe_load(f) or {}
            for i, threat in enumerate(threat_data.get("threats", [])):
                if "id" not in threat and "slug" not in threat:
                    errors.append(ValidationError(
                        file="threats.yaml",
                        line=None,
                        ref_type="threat",
                        reference=f"threats[{i}]",
                        message=f"Threat at index {i} has no 'id' field",
                    ))
        except Exception:
            pass

    # Countermeasures must have 'id', and validate control_type/cost enums
    valid_control_types = {"preventive", "detective", "corrective", "procedural"}
    valid_costs = {"low", "medium", "high"}
    cm_file = pack_path / "countermeasures.yaml"
    if cm_file.exists():
        try:
            with open(cm_file) as f:
                cm_data_raw = yaml.safe_load(f) or {}
            for i, cm in enumerate(cm_data_raw.get("countermeasures", [])):
                cm_id = cm.get("id", cm.get("slug", ""))
                if "id" not in cm and "slug" not in cm:
                    errors.append(ValidationError(
                        file="countermeasures.yaml",
                        line=None,
                        ref_type="countermeasure",
                        reference=f"countermeasures[{i}]",
                        message=f"Countermeasure at index {i} has no 'id' field",
                    ))
                control_type_value = cm.get("control_type", "")
                if control_type_value and control_type_value not in valid_control_types:
                    warnings.append(ValidationWarning(
                        file="countermeasures.yaml",
                        field="control_type",
                        message=f"Countermeasure '{cm_id or f'[{i}]'}' has unknown control_type: '{control_type_value}'",
                        suggestion=f"Use one of: {', '.join(sorted(valid_control_types))}",
                    ))
                cost_value = cm.get("cost", "")
                if cost_value and cost_value not in valid_costs:
                    warnings.append(ValidationWarning(
                        file="countermeasures.yaml",
                        field="cost",
                        message=f"Countermeasure '{cm_id or f'[{i}]'}' has unknown cost: '{cost_value}'",
                        suggestion=f"Use one of: {', '.join(sorted(valid_costs))}",
                    ))
        except Exception:
            pass

    # =========================================================================
    # Reference checks (existing logic)
    # =========================================================================

    # Collect all defined items in this pack
    pack_components = set()
    pack_threats = set()
    pack_countermeasures = set()

    # Load components from components.yaml
    components_file = pack_path / "components.yaml"
    if components_file.exists():
        try:
            with open(components_file) as f:
                comp_data = yaml.safe_load(f) or {}
            for comp in comp_data.get("components", []):
                comp_id = comp.get("id", comp.get("slug", ""))
                if comp_id:
                    pack_components.add(comp_id)
        except Exception as e:
            errors.append(ValidationError(
                file="components.yaml",
                line=None,
                ref_type="component",
                reference="",
                message=f"Failed to parse: {e}",
            ))

    # Load threats from threats.yaml
    threats_file = pack_path / "threats.yaml"
    if threats_file.exists():
        try:
            with open(threats_file) as f:
                threat_data = yaml.safe_load(f) or {}
            for threat in threat_data.get("threats", []):
                threat_id = threat.get("id", threat.get("slug", ""))
                if threat_id:
                    pack_threats.add(threat_id)
        except Exception as e:
            errors.append(ValidationError(
                file="threats.yaml",
                line=None,
                ref_type="threat",
                reference="",
                message=f"Failed to parse: {e}",
            ))

    # Load countermeasures from countermeasures.yaml
    cm_file = pack_path / "countermeasures.yaml"
    if cm_file.exists():
        try:
            with open(cm_file) as f:
                cm_data = yaml.safe_load(f) or {}
            for cm in cm_data.get("countermeasures", []):
                cm_id = cm.get("id", cm.get("slug", ""))
                if cm_id:
                    pack_countermeasures.add(cm_id)
        except Exception as e:
            errors.append(ValidationError(
                file="countermeasures.yaml",
                line=None,
                ref_type="countermeasure",
                reference="",
                message=f"Failed to parse: {e}",
            ))

    # Validate joins
    joins_dir = pack_path / "joins"
    if joins_dir.exists():
        # Validate component-threat joins
        ct_file = joins_dir / "components-threats.yaml"
        if ct_file.exists():
            try:
                with open(ct_file) as f:
                    ct_data = yaml.safe_load(f) or {}
                for mapping in ct_data.get("mappings", []):
                    comp_ref = mapping.get("component", "")
                    if comp_ref and "/" not in comp_ref and comp_ref not in pack_components:
                        errors.append(ValidationError(
                            file="joins/components-threats.yaml",
                            line=None,
                            ref_type="component",
                            reference=comp_ref,
                            message=f"Component '{comp_ref}' not found in pack",
                        ))

                    for threat_entry in mapping.get("threats", []):
                        # Threats can be plain strings or dicts with a "threat" key
                        if isinstance(threat_entry, dict):
                            threat_ref = threat_entry.get("threat", "")
                        else:
                            threat_ref = threat_entry
                        if threat_ref and "/" not in threat_ref and threat_ref not in pack_threats:
                            # Check if it's a cross-pack reference to existing threat
                            if not _resolve_threat_reference_exists(slug, threat_ref):
                                errors.append(ValidationError(
                                    file="joins/components-threats.yaml",
                                    line=None,
                                    ref_type="threat",
                                    reference=threat_ref,
                                    message=f"Threat '{threat_ref}' not found in pack or database",
                                ))
            except Exception as e:
                errors.append(ValidationError(
                    file="joins/components-threats.yaml",
                    line=None,
                    ref_type="join",
                    reference="",
                    message=f"Failed to parse: {e}",
                ))

        # Validate threat-countermeasure joins
        tc_file = joins_dir / "threats-countermeasures.yaml"
        if tc_file.exists():
            try:
                with open(tc_file) as f:
                    tc_data = yaml.safe_load(f) or {}
                for mapping in tc_data.get("mappings", []):
                    threat_ref = mapping.get("threat", "")
                    if threat_ref and "/" not in threat_ref and threat_ref not in pack_threats:
                        if not _resolve_threat_reference_exists(slug, threat_ref):
                            errors.append(ValidationError(
                                file="joins/threats-countermeasures.yaml",
                                line=None,
                                ref_type="threat",
                                reference=threat_ref,
                                message=f"Threat '{threat_ref}' not found in pack or database",
                            ))

                    for cm_ref in mapping.get("countermeasures", []):
                        if "/" not in cm_ref and cm_ref not in pack_countermeasures:
                            if not _resolve_countermeasure_reference_exists(slug, cm_ref):
                                errors.append(ValidationError(
                                    file="joins/threats-countermeasures.yaml",
                                    line=None,
                                    ref_type="countermeasure",
                                    reference=cm_ref,
                                    message=f"Countermeasure '{cm_ref}' not found in pack or database",
                                ))
            except Exception as e:
                errors.append(ValidationError(
                    file="joins/threats-countermeasures.yaml",
                    line=None,
                    ref_type="join",
                    reference="",
                    message=f"Failed to parse: {e}",
                ))

    # Validate DFD templates
    templates_dir = pack_path / "dfd-templates"

    if templates_dir.exists():
        for template_file in list(templates_dir.glob("*.yaml")) + list(templates_dir.glob("*.yml")):
            try:
                with open(template_file) as f:
                    template_data = yaml.safe_load(f)

                canvas_data = template_data.get("canvas_data", {})
                for node in canvas_data.get("nodes", []):
                    comp_ref = node.get("data", {}).get("component_ref")
                    if comp_ref:
                        if "/" not in comp_ref and comp_ref not in pack_components:
                            # Check if it's a cross-pack reference
                            if not _resolve_component_reference_exists(slug, comp_ref):
                                errors.append(ValidationError(
                                    file=f"dfd-templates/{template_file.name}",
                                    line=None,
                                    ref_type="template_component",
                                    reference=comp_ref,
                                    message=f"Component '{comp_ref}' not found in pack or database",
                                ))
            except Exception as e:
                errors.append(ValidationError(
                    file=f"dfd-templates/{template_file.name}",
                    line=None,
                    ref_type="template",
                    reference="",
                    message=f"Failed to parse: {e}",
                ))

    return ValidationResult(
        success=len(errors) == 0,
        pack_slug=slug,
        pack_name=name,
        version=version,
        errors=errors,
        warnings=warnings,
    )


# Backwards-compatible alias
validate_pack_references = validate_pack


def _resolve_component_reference_exists(pack_slug: str, ref: str) -> bool:
    """Check if a component reference exists in the database."""
    if "/" in ref:
        return ComponentLibrary.objects.filter(qualified_slug=ref).exists()
    else:
        qualified_slug = f"{pack_slug}/{ref}"
        return ComponentLibrary.objects.filter(qualified_slug=qualified_slug).exists()


def _resolve_threat_reference_exists(pack_slug: str, ref: str) -> bool:
    """Check if a threat reference exists in the database."""
    if "/" in ref:
        return ThreatLibrary.objects.filter(qualified_slug=ref).exists()
    else:
        qualified_slug = f"{pack_slug}/{ref}"
        if ThreatLibrary.objects.filter(qualified_slug=qualified_slug).exists():
            return True
        # Also check global threats
        return ThreatLibrary.objects.filter(qualified_slug=f"global/{ref}").exists()


def _resolve_countermeasure_reference_exists(pack_slug: str, ref: str) -> bool:
    """Check if a countermeasure reference exists in the database."""
    if "/" in ref:
        return CountermeasureLibrary.objects.filter(qualified_slug=ref).exists()
    else:
        qualified_slug = f"{pack_slug}/{ref}"
        return CountermeasureLibrary.objects.filter(qualified_slug=qualified_slug).exists()


def import_pack_from_path(
    pack_path: Path,
    force: bool = False,
    selected_overlays: Optional[list[str]] = None,
    dry_run: bool = False,
    skip_validation: bool = False,
) -> ImportResult | ValidationResult:
    """
    Import a pack from a directory path.

    Args:
        pack_path: Path to the pack directory containing pack.yaml
        force: If True, reinstall even if pack exists
        selected_overlays: Optional list of framework IDs to load overlays for.
                          If None, all overlays are loaded. If empty list, no overlays.
        dry_run: If True, validate references without importing
        skip_validation: If True, skip pre-import validation (used by batch sync)

    Returns:
        ImportResult with details of the import operation, or ValidationResult if dry_run
    """
    if dry_run:
        return validate_pack(pack_path)
    return _import_pack(pack_path, force, selected_overlays, skip_validation)


def _import_pack(
    pack_path: Path,
    force: bool = False,
    selected_overlays: Optional[list[str]] = None,
    skip_validation: bool = False,
) -> ImportResult | ValidationResult:
    """
    Import a pack from a directory path.

    Expects multi-file structure:
    - pack.yaml: Metadata only
    - components.yaml: Component definitions
    - threats.yaml: Threat definitions
    - countermeasures.yaml: Countermeasure definitions
    - joins/: Relationship mappings
    - dfd-templates/: DFD templates

    Args:
        pack_path: Path to the pack directory
        force: If True, reinstall even if pack exists
        selected_overlays: Optional list of framework IDs to load overlays for.
                          If None, all overlays are loaded. If empty list, no overlays.
        skip_validation: If True, skip pre-import validation
    """
    # Run validation before import unless skipped
    if not skip_validation:
        validation_result = validate_pack(pack_path)
        if not validation_result.success or validation_result.warnings:
            return validation_result

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
        # Count items in database
        active_components = ComponentLibrary.objects.filter(source_pack=existing).count()
        active_threats = ThreatLibrary.objects.filter(source_pack=existing).count()
        active_countermeasures = CountermeasureLibrary.objects.filter(source_pack=existing).count()
        active_taxonomies = ExternalTaxonomy.objects.filter(source_pack=existing).count()
        active_templates = DFDTemplatesLibrary.objects.filter(source_pack=existing).count()

        has_active_items = (
            active_components > 0
            or active_threats > 0
            or active_countermeasures > 0
            or active_taxonomies > 0
            or active_templates > 0
        )

        if has_active_items:
            return ImportResult(
                success=True,
                pack_slug=slug,
                pack_name=name,
                version=existing.version,
                message=f"Pack '{slug}' already exists (v{existing.version}). Use force=True to reimport.",
            )
        else:
            logger.info(f"Pack '{slug}' exists but has no items. Creating items...")

    try:
        with transaction.atomic():
            # Hard delete existing items if forcing reinstall
            if existing and force:
                _hard_delete_pack_items(existing)

            # Create/update LibraryPack
            library_pack = _create_or_update_pack(pack_data)

            # Process dependencies
            _process_dependencies(library_pack, pack_data)

            # Load taxonomies (before threats, since threats reference taxonomy entries)
            taxonomy_file = pack_path / "taxonomy.yaml"
            taxonomies_count = _load_taxonomy(library_pack, taxonomy_file)

            # Load components
            components_file = pack_path / "components.yaml"
            components_count = _load_components(library_pack, components_file)

            # Load threats
            threats_file = pack_path / "threats.yaml"
            threats_count = _load_threats(library_pack, threats_file)

            # Load countermeasures
            cm_file = pack_path / "countermeasures.yaml"
            countermeasures_count = _load_countermeasures(library_pack, cm_file)

            # Phase 2: Load join files
            joins_dir = pack_path / "joins"
            if joins_dir.exists():
                _load_component_threat_joins(library_pack, joins_dir / "components-threats.yaml")
                _load_threat_countermeasure_joins(library_pack, joins_dir / "threats-countermeasures.yaml")

                # Load threat-taxonomy joins
                for join_file in joins_dir.glob("threats-*.yaml"):
                    if join_file.name == "threats-countermeasures.yaml":
                        continue
                    _load_threat_taxonomy_joins(library_pack, join_file)

                # Phase 3: Load framework overlays
                for join_file in joins_dir.glob("countermeasures-*.yaml"):
                    # Skip the threat-countermeasure join file
                    if "threats" not in join_file.name:
                        # Check if we should load this overlay
                        if selected_overlays is not None:
                            # Read the framework ID from the file to check against selected list
                            try:
                                with open(join_file) as f:
                                    overlay_data = yaml.safe_load(f) or {}
                                framework_id = overlay_data.get("framework", "")
                                if framework_id not in selected_overlays:
                                    logger.info(f"Skipping overlay {join_file.name} (framework {framework_id} not selected)")
                                    continue
                            except Exception as e:
                                logger.error(f"Error reading overlay file {join_file.name}: {e}")
                                continue
                        logger.info(f"Loading framework overlay: {join_file.name}")
                        mappings_count = _load_framework_overlay(library_pack, join_file)
                        logger.info(f"Loaded {mappings_count} mappings from {join_file.name}")

            # Phase 4: Load DFD templates
            templates_count = _load_templates(library_pack, pack_path / "dfd-templates")

            # Phase 5: Load frameworks and requirements (for compliance packs)
            frameworks_count = _load_frameworks(library_pack, pack_data)

            return ImportResult(
                success=True,
                pack_slug=slug,
                pack_name=name,
                version=version,
                message=f"Successfully imported {name} v{version} (v2 format)",
                components_created=components_count,
                threats_created=threats_count,
                countermeasures_created=countermeasures_count,
                templates_created=templates_count,
                taxonomies_created=taxonomies_count,
            )

    except Exception as e:
        logger.exception(f"Failed to import v2 pack {slug}")
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
) -> list[ImportResult | ValidationResult]:
    """
    Sync all packs from the libraries folder to the database.

    Args:
        force: If True, reinstall all packs even if they exist

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

        # Validate before importing — skip packs with issues
        validation_result = validate_pack(Path(pack_info.path))
        if not validation_result.success or validation_result.warnings:
            results.append(validation_result)
            continue

        # Import the pack (already validated above)
        result = import_pack_from_path(
            Path(pack_info.path),
            force=force,
            skip_validation=True,
        )
        results.append(result)

    return results


# =============================================================================
# Private helper functions
# =============================================================================


def _hard_delete_pack_items(pack: LibraryPack):
    """Hard delete all library items from a pack.

    Note: Instance models use SET_NULL for library FKs, so deleting library items
    will orphan instances but not delete them. This preserves user work.
    """
    ComponentLibrary.objects.filter(source_pack=pack).delete()
    ThreatLibrary.objects.filter(source_pack=pack).delete()
    CountermeasureLibrary.objects.filter(source_pack=pack).delete()
    DFDTemplatesLibrary.objects.filter(source_pack=pack).delete()
    ExternalTaxonomy.objects.filter(source_pack=pack).delete()


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


def _resolve_threat_reference(library_pack: LibraryPack, threat_ref: str) -> Optional[ThreatLibrary]:
    """Resolve a threat reference (slug or qualified slug)."""
    if "/" in threat_ref:
        return ThreatLibrary.objects.filter(qualified_slug=threat_ref).first()

    # Try current pack first
    qualified = f"{library_pack.slug}/{threat_ref}"
    threat = ThreatLibrary.objects.filter(qualified_slug=qualified).first()

    if not threat:
        # Try global
        threat = ThreatLibrary.objects.filter(
            qualified_slug=f"global/{threat_ref}"
        ).first()

    return threat


# =============================================================================
# V2 Format Loader Functions
# =============================================================================


def _load_threat_taxonomy_joins(library_pack: LibraryPack, file_path: Path) -> int:
    """Load threat-taxonomy mappings from joins/threats-{taxonomy}.yaml."""
    if not file_path.exists():
        return 0

    try:
        with open(file_path) as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Error loading threat taxonomy join {file_path}: {e}")
        return 0

    taxonomy_slug = data.get("taxonomy", "")
    if not taxonomy_slug:
        logger.warning(f"No taxonomy specified in {file_path}")
        return 0

    count = 0
    for mapping in data.get("mappings", []):
        threat_ref = mapping.get("threat", "")
        if not threat_ref:
            continue

        threat_obj = _resolve_threat_reference(library_pack, threat_ref)
        if not threat_obj:
            logger.warning(f"Threat not found: {threat_ref}")
            continue

        for external_id in mapping.get("entries", []):
            try:
                taxonomy_entry = TaxonomyEntry.objects.get(
                    taxonomy__slug=taxonomy_slug,
                    external_id=str(external_id),
                )
                ThreatLibraryTaxonomyEntry.objects.get_or_create(
                    threat_library=threat_obj,
                    taxonomy_entry=taxonomy_entry,
                )
                count += 1
            except TaxonomyEntry.DoesNotExist:
                logger.warning(
                    f"Taxonomy entry {taxonomy_slug}:{external_id} not found — "
                    f"import the taxonomy pack first"
                )

    return count


def _load_taxonomy(library_pack: LibraryPack, file_path: Path) -> int:
    """Load taxonomies and entries from taxonomy.yaml."""
    if not file_path.exists():
        return 0

    try:
        with open(file_path) as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Error loading taxonomy.yaml: {e}")
        return 0

    count = 0
    for taxonomy_data in data.get("taxonomies", []):
        slug = taxonomy_data.get("slug", "")
        if not slug:
            logger.warning("Skipping taxonomy without slug")
            continue

        taxonomy_obj, _ = ExternalTaxonomy.objects.update_or_create(
            slug=slug,
            defaults={
                "source_pack": library_pack,
                "name": taxonomy_data.get("name", slug),
                "description": taxonomy_data.get("description", ""),
                "source_url": taxonomy_data.get("source_url", ""),
                "version": taxonomy_data.get("version", ""),
            },
        )

        for entry_data in taxonomy_data.get("entries", []):
            external_id = entry_data.get("external_id", "")
            if not external_id:
                continue
            TaxonomyEntry.objects.update_or_create(
                taxonomy=taxonomy_obj,
                external_id=str(external_id),
                defaults={
                    "title": entry_data.get("title", external_id),
                    "description": entry_data.get("description", ""),
                    "reference_url": entry_data.get("reference_url", ""),
                },
            )

        count += 1

    return count


def _load_components(library_pack: LibraryPack, file_path: Path) -> int:
    """Load components from components.yaml.

    Uses a two-pass approach to handle parent references:
      Pass 1: Create/update all ComponentLibrary records with parent=None.
      Pass 2: Resolve parent slug references and set the FK.
    """
    if not file_path.exists():
        return 0

    try:
        with open(file_path) as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Error loading components.yaml: {e}")
        return 0

    components_list = data.get("components", [])

    # Pass 1: Create/update all records without parent
    slug_to_instance = {}
    count = 0
    for comp in components_list:
        comp_id = comp.get("id", comp.get("slug", ""))
        if not comp_id:
            logger.warning(f"Skipping component without id: {comp}")
            continue

        qualified_slug = f"{library_pack.slug}/{comp_id}"

        instance, _ = ComponentLibrary.objects.update_or_create(
            qualified_slug=qualified_slug,
            defaults={
                "source_pack": library_pack,
                "slug": comp_id,
                "name": comp.get("name", comp_id),
                "category": comp.get("category", "process"),
                "component_type": comp.get("type", comp.get("component_type", "")),
                "provider": _infer_provider(library_pack.slug),
                "customization_status": "original",
                "parent": None,
            },
        )
        slug_to_instance[comp_id] = instance
        count += 1

    # Pass 2: Resolve parent references
    for comp in components_list:
        parent_slug = comp.get("parent")
        if not parent_slug:
            continue

        comp_id = comp.get("id", comp.get("slug", ""))
        child_instance = slug_to_instance.get(comp_id)
        parent_instance = slug_to_instance.get(parent_slug)

        if not child_instance or not parent_instance:
            logger.warning(
                f"Cannot resolve parent '{parent_slug}' for component "
                f"'{comp_id}' — skipping parent assignment."
            )
            continue

        if child_instance.category != ComponentLibrary.Category.PROCESS:
            logger.warning(
                f"Component '{comp_id}' has category '{child_instance.category}' "
                f"but only process components can have a parent — skipping."
            )
            continue

        if parent_instance.category != ComponentLibrary.Category.PROCESS:
            logger.warning(
                f"Parent '{parent_slug}' has category '{parent_instance.category}' "
                f"but only process components can be parents — skipping."
            )
            continue

        child_instance.parent = parent_instance
        try:
            child_instance.full_clean()
            child_instance.save(update_fields=["parent"])
        except Exception as e:
            logger.warning(
                f"Invalid parent assignment '{parent_slug}' -> '{comp_id}': {e}"
            )
            child_instance.parent = None
            child_instance.save(update_fields=["parent"])

    return count


def _load_threats(library_pack: LibraryPack, file_path: Path) -> int:
    """Load threats from threats.yaml (v2 format)."""
    if not file_path.exists():
        return 0

    try:
        with open(file_path) as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Error loading threats.yaml: {e}")
        return 0

    count = 0
    for threat in data.get("threats", []):
        threat_id = threat.get("id", threat.get("slug", ""))
        if not threat_id:
            logger.warning(f"Skipping threat without id: {threat}")
            continue

        qualified_slug = f"{library_pack.slug}/{threat_id}"

        threat_obj, created = ThreatLibrary.objects.update_or_create(
            qualified_slug=qualified_slug,
            defaults={
                "source_pack": library_pack,
                "slug": threat_id,
                "name": threat.get("name", threat_id),
                "description": threat.get("description", ""),
                "customization_status": "original",
            },
        )

        count += 1

    return count


def _load_countermeasures(library_pack: LibraryPack, file_path: Path) -> int:
    """Load countermeasures from countermeasures.yaml (v2 format)."""
    if not file_path.exists():
        return 0

    try:
        with open(file_path) as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Error loading countermeasures.yaml: {e}")
        return 0

    count = 0
    for cm in data.get("countermeasures", []):
        cm_id = cm.get("id", cm.get("slug", ""))
        if not cm_id:
            logger.warning(f"Skipping countermeasure without id: {cm}")
            continue

        qualified_slug = f"{library_pack.slug}/{cm_id}"

        CountermeasureLibrary.objects.update_or_create(
            qualified_slug=qualified_slug,
            defaults={
                "source_pack": library_pack,
                "slug": cm_id,
                "name": cm.get("name", cm_id),
                "description": cm.get("description", ""),
                "control_type": cm.get("control_type", "preventive"),
                "cost": cm.get("cost", "medium"),
                "default_status": cm.get("default_status", "gap"),
                "customization_status": "original",
            },
        )
        count += 1

    return count


def _load_frameworks(library_pack: LibraryPack, pack_data: dict) -> int:
    """
    Load frameworks and requirements from pack.yaml.

    For compliance packs, the pack.yaml contains a 'frameworks' section
    with framework definitions and their requirements.

    After creating a framework, activates any pending overlays that were
    waiting for this framework.
    """
    from apps.compliance.models import StandardFramework, StandardRequirement

    frameworks = pack_data.get("frameworks", [])
    if not frameworks:
        return 0

    count = 0
    created_frameworks = []

    for framework_data in frameworks:
        framework_slug = framework_data.get("slug", "")
        if not framework_slug:
            logger.warning(f"Skipping framework without slug: {framework_data}")
            continue

        # Check if this is a new framework
        is_new = not StandardFramework.objects.filter(slug=framework_slug).exists()

        # Create or update the framework
        framework, _ = StandardFramework.objects.update_or_create(
            slug=framework_slug,
            defaults={
                "source_pack": library_pack,
                "name": framework_data.get("name", framework_slug),
                "version": framework_data.get("version", ""),
                "issuer": framework_data.get("issuer", ""),
                "description": framework_data.get("description", ""),
            },
        )

        if is_new:
            created_frameworks.append(framework_slug)

        # Create requirements for this framework
        for req_data in framework_data.get("requirements", []):
            section_code = req_data.get("section_code", "")
            if not section_code:
                continue

            StandardRequirement.objects.update_or_create(
                framework=framework,
                section_code=section_code,
                defaults={
                    "description": req_data.get("description", ""),
                },
            )
            count += 1

    # Activate pending overlays for newly created frameworks
    for framework_slug in created_frameworks:
        result = activate_pending_overlays_for_framework(framework_slug)
        if result.get("total_mappings", 0) > 0:
            logger.info(
                f"Activated {result['total_mappings']} pending overlay mappings "
                f"for framework '{framework_slug}'"
            )

    return count


def _load_component_threat_joins(library_pack: LibraryPack, file_path: Path) -> int:
    """Load component-threat mappings from joins/components-threats.yaml."""
    if not file_path.exists():
        return 0

    try:
        with open(file_path) as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Error loading components-threats.yaml: {e}")
        return 0

    count = 0
    for mapping in data.get("mappings", []):
        component_ref = mapping.get("component", "")
        if not component_ref:
            continue

        component = _resolve_component_reference(library_pack, component_ref)
        if not component:
            logger.warning(f"Component not found: {component_ref}")
            continue

        for threat_entry in mapping.get("threats", []):
            # Expect dict format: {threat: "threat-id", applies_to: "component|flow|both"}
            if not isinstance(threat_entry, dict):
                logger.warning(f"Invalid threat entry format (expected dict): {threat_entry}")
                continue

            threat_ref = threat_entry.get("threat", "")
            applies_to = threat_entry.get("applies_to", "component")

            threat = _resolve_threat_reference(library_pack, threat_ref)
            if not threat:
                logger.warning(f"Threat not found: {threat_ref}")
                continue

            ComponentLibraryThreat.objects.update_or_create(
                component_library=component,
                threat_library=threat,
                defaults={
                    "default_severity": mapping.get("severity", "medium"),
                    "applies_to": applies_to,
                },
            )
            count += 1

    return count


def _load_threat_countermeasure_joins(library_pack: LibraryPack, file_path: Path) -> int:
    """Load threat-countermeasure mappings from joins/threats-countermeasures.yaml."""
    if not file_path.exists():
        return 0

    try:
        with open(file_path) as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Error loading threats-countermeasures.yaml: {e}")
        return 0

    count = 0
    for mapping in data.get("mappings", []):
        threat_ref = mapping.get("threat", "")
        if not threat_ref:
            continue

        threat = _resolve_threat_reference(library_pack, threat_ref)
        if not threat:
            logger.warning(f"Threat not found: {threat_ref}")
            continue

        for cm_ref in mapping.get("countermeasures", []):
            countermeasure = _resolve_countermeasure_reference(library_pack, cm_ref)
            if not countermeasure:
                logger.warning(f"Countermeasure not found: {cm_ref}")
                continue

            countermeasure.applicable_threats.add(threat)
            count += 1

    return count


def _load_framework_overlay(library_pack: LibraryPack, file_path: Path) -> int:
    """
    Load framework overlay from joins/countermeasures-{framework}.yaml.

    Framework overlays map countermeasures to framework requirements.
    If the framework doesn't exist, stores the overlay as pending for later activation.
    """
    if not file_path.exists():
        return 0

    try:
        with open(file_path) as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Error loading framework overlay {file_path}: {e}")
        return 0

    framework_id = data.get("framework", "")
    if not framework_id:
        logger.warning(f"No framework specified in {file_path}")
        return 0

    # Import here to avoid circular imports
    from apps.compliance.models import StandardFramework, StandardRequirement

    # Find the framework
    framework = StandardFramework.objects.filter(slug=framework_id).first()
    if not framework:
        # Store as pending overlay for later activation
        logger.info(f"Framework '{framework_id}' not found. Storing overlay as pending.")
        mapping_count = len(data.get("mappings", []))
        PendingFrameworkOverlay.objects.update_or_create(
            pack=library_pack,
            framework_slug=framework_id,
            defaults={
                "overlay_file_name": file_path.name,
                "overlay_data": data,
                "mapping_count": mapping_count,
            },
        )
        return 0

    # Framework exists - remove any pending overlay and apply
    PendingFrameworkOverlay.objects.filter(pack=library_pack, framework_slug=framework_id).delete()

    count = 0
    for mapping in data.get("mappings", []):
        cm_ref = mapping.get("countermeasure", "")
        if not cm_ref:
            continue

        countermeasure = _resolve_countermeasure_reference(library_pack, cm_ref)
        if not countermeasure:
            logger.warning(f"Countermeasure not found: {cm_ref}")
            continue

        for req_code in mapping.get("requirements", []):
            requirement = StandardRequirement.objects.filter(
                framework=framework,
                section_code=str(req_code),
            ).first()

            if requirement:
                from apps.compliance.models import CountermeasureLibraryStandard

                CountermeasureLibraryStandard.objects.get_or_create(
                    countermeasure_library=countermeasure,
                    requirement=requirement,
                    defaults={
                        "sufficiency": mapping.get("sufficiency", "full"),
                    },
                )
                count += 1
            else:
                logger.warning(f"Requirement '{req_code}' not found in framework '{framework_id}'")

    return count


def activate_pending_overlays_for_framework(framework_slug: str) -> dict:
    """
    Activate all pending overlays for a newly installed framework.

    Called when a framework is installed to apply any overlays that were
    waiting for this framework.

    Args:
        framework_slug: The slug of the framework that was just installed

    Returns:
        Dictionary with activation results including counts per pack
    """
    from apps.compliance.models import CountermeasureLibraryStandard, StandardFramework, StandardRequirement

    framework = StandardFramework.objects.filter(slug=framework_slug).first()
    if not framework:
        logger.error(f"Cannot activate overlays: Framework '{framework_slug}' not found")
        return {"success": False, "error": "Framework not found", "activated": 0}

    pending_overlays = PendingFrameworkOverlay.objects.filter(framework_slug=framework_slug)

    results = {
        "success": True,
        "framework": framework_slug,
        "framework_name": framework.name,
        "packs_activated": [],
        "total_mappings": 0,
    }

    for pending in pending_overlays:
        pack = pending.pack
        data = pending.overlay_data
        mappings_applied = 0

        for mapping in data.get("mappings", []):
            cm_ref = mapping.get("countermeasure", "")
            if not cm_ref:
                continue

            countermeasure = _resolve_countermeasure_reference(pack, cm_ref)
            if not countermeasure:
                logger.warning(f"Countermeasure not found during activation: {cm_ref}")
                continue

            for req_code in mapping.get("requirements", []):
                requirement = StandardRequirement.objects.filter(
                    framework=framework,
                    section_code=str(req_code),
                ).first()

                if requirement:
                    CountermeasureLibraryStandard.objects.get_or_create(
                        countermeasure_library=countermeasure,
                        requirement=requirement,
                        defaults={
                            "sufficiency": mapping.get("sufficiency", "full"),
                        },
                    )
                    mappings_applied += 1

        results["packs_activated"].append({
            "pack_slug": pack.slug,
            "pack_name": pack.name,
            "mappings_applied": mappings_applied,
        })
        results["total_mappings"] += mappings_applied

        # Remove the pending overlay
        pending.delete()

    logger.info(
        f"Activated {len(results['packs_activated'])} pending overlays for framework '{framework_slug}' "
        f"with {results['total_mappings']} total mappings"
    )

    return results


def get_pending_overlays_for_pack(pack: LibraryPack) -> list[dict]:
    """
    Get pending overlays for a pack.

    Args:
        pack: The LibraryPack to check

    Returns:
        List of pending overlay info dicts
    """
    pending = PendingFrameworkOverlay.objects.filter(pack=pack)
    return [
        {
            "framework_slug": p.framework_slug,
            "overlay_file_name": p.overlay_file_name,
            "mapping_count": p.mapping_count,
        }
        for p in pending
    ]


def _load_templates(library_pack: LibraryPack, templates_dir: Path) -> int:
    """
    Load DFD templates from dfd-templates/ directory.

    Templates use component_ref to reference components from components.yaml.
    """
    if not templates_dir.exists():
        return 0

    template_files = list(templates_dir.glob("*.yaml")) + list(templates_dir.glob("*.yml"))
    count = 0

    for template_file in template_files:
        try:
            with open(template_file) as f:
                template_data = yaml.safe_load(f)

            template = template_data.get("template", {})
            slug = template.get("id", template.get("slug", template_file.stem))
            qualified_slug = f"{library_pack.slug}/{slug}"

            # Validate component_refs if present
            canvas_data = template_data.get("canvas_data", {})
            _validate_template_component_refs(library_pack, canvas_data, template_file.name)

            DFDTemplatesLibrary.objects.update_or_create(
                qualified_slug=qualified_slug,
                defaults={
                    "source_pack": library_pack,
                    "slug": slug,
                    "name": template.get("name", slug),
                    "description": template.get("description", ""),
                    "category": template.get("category", "webapp"),
                    "diagram_type": template.get("diagram_type", "level1"),
                    "canvas_data": canvas_data,
                    "customization_status": "original",
                },
            )
            count += 1
        except Exception as e:
            logger.exception(f"Error loading template {template_file.name}")

    if template_files and count == 0:
        logger.error(
            f"All {len(template_files)} templates failed to load for pack '{library_pack.slug}'. "
            f"Check that migrations are up to date: python manage.py migrate"
        )

    return count


def _validate_template_component_refs(library_pack: LibraryPack, canvas_data: dict, template_name: str) -> None:
    """Validate that component_refs in template nodes exist."""
    nodes = canvas_data.get("nodes", [])

    for node in nodes:
        component_ref = node.get("data", {}).get("component_ref")
        if component_ref:
            component = _resolve_component_reference(library_pack, component_ref)
            if not component:
                logger.warning(
                    f"Template '{template_name}' references unknown component: {component_ref}"
                )


def _resolve_component_reference(library_pack: LibraryPack, ref: str) -> Optional[ComponentLibrary]:
    """
    Resolve a component reference.

    Supports:
    - 'aws_lambda' → looks in current pack
    - 'generic/database' → looks in generic pack (cross-pack reference)
    """
    if "/" in ref:
        # Cross-pack reference
        return ComponentLibrary.objects.filter(qualified_slug=ref).first()
    else:
        # Current pack reference
        qualified_slug = f"{library_pack.slug}/{ref}"
        return ComponentLibrary.objects.filter(qualified_slug=qualified_slug).first()


def _resolve_countermeasure_reference(library_pack: LibraryPack, ref: str) -> Optional[CountermeasureLibrary]:
    """
    Resolve a countermeasure reference.

    Supports:
    - 'encrypt_at_rest' → looks in current pack
    - 'base-stride/encryption-at-rest' → looks in base-stride pack (cross-pack reference)
    """
    if "/" in ref:
        # Cross-pack reference
        return CountermeasureLibrary.objects.filter(qualified_slug=ref).first()
    else:
        # Current pack reference
        qualified_slug = f"{library_pack.slug}/{ref}"
        return CountermeasureLibrary.objects.filter(qualified_slug=qualified_slug).first()


def _infer_provider(pack_slug: str) -> str:
    """Infer the provider from the pack slug."""
    # Map common pack slugs to providers
    provider_map = {
        "aws": "aws",
        "azure": "azure",
        "gcp": "gcp",
        "generic": "generic",
    }

    # Check if slug starts with a known provider
    for prefix, provider in provider_map.items():
        if pack_slug.startswith(prefix):
            return provider

    return ""


# =============================================================================
# Overlay Discovery Functions
# =============================================================================


@dataclass
class OverlayInfo:
    """Information about an available framework overlay in a pack."""

    framework_id: str
    framework_name: str
    mapping_count: int
    framework_exists: bool


@dataclass
class ActiveOverlayInfo:
    """Information about an active framework overlay for an installed pack."""

    framework_id: str
    framework_name: str
    mapping_count: int


def get_active_overlays_for_pack(pack: LibraryPack) -> list[ActiveOverlayInfo]:
    """
    Get active framework overlays for an installed pack.

    Queries the database for CountermeasureLibraryStandard records
    that map this pack's countermeasures to framework requirements.

    Args:
        pack: The LibraryPack to check

    Returns:
        List of ActiveOverlayInfo with framework_id, framework_name, and mapping_count
    """
    from apps.compliance.models import CountermeasureLibraryStandard, StandardFramework

    # Get all mappings for this pack's countermeasures
    mappings = CountermeasureLibraryStandard.objects.filter(
        countermeasure_library__source_pack=pack
    ).select_related("requirement__framework")

    # Group by framework
    framework_counts: dict[int, dict] = {}
    for mapping in mappings:
        framework = mapping.requirement.framework
        if framework.id not in framework_counts:
            framework_counts[framework.id] = {
                "framework_id": framework.slug,
                "framework_name": framework.name,
                "mapping_count": 0,
            }
        framework_counts[framework.id]["mapping_count"] += 1

    return [
        ActiveOverlayInfo(
            framework_id=info["framework_id"],
            framework_name=info["framework_name"],
            mapping_count=info["mapping_count"],
        )
        for info in framework_counts.values()
    ]


def get_available_overlays_for_pack(slug: str) -> list[OverlayInfo]:
    """
    Get available framework overlays for a pack.

    Scans the pack's joins/ directory for countermeasures-*.yaml files
    and returns information about each overlay.

    Args:
        slug: The pack slug to check

    Returns:
        List of OverlayInfo with framework_id, framework_name, mapping_count, framework_exists
    """
    from apps.compliance.models import StandardFramework

    libraries_path = get_libraries_path()

    if not libraries_path.exists():
        return []

    # Find the pack directory
    def find_pack_dir(base_path: Path) -> Path | None:
        for item in base_path.iterdir():
            if not item.is_dir():
                continue

            pack_yaml = item / "pack.yaml"
            if pack_yaml.exists():
                try:
                    with open(pack_yaml) as f:
                        pack_data = yaml.safe_load(f)
                    pack_meta = pack_data.get("pack", {})
                    if pack_meta.get("slug", item.name) == slug:
                        return item
                except Exception:
                    pass

            # Check subdirectories (for nested structure)
            result = find_pack_dir(item)
            if result:
                return result

        return None

    pack_dir = find_pack_dir(libraries_path)
    if not pack_dir:
        return []

    joins_dir = pack_dir / "joins"
    if not joins_dir.exists():
        return []

    # Get installed frameworks for checking existence
    installed_frameworks = set(StandardFramework.objects.values_list("slug", flat=True))

    overlays = []
    for join_file in joins_dir.glob("countermeasures-*.yaml"):
        # Skip the threat-countermeasure join file
        if "threats" in join_file.name:
            continue

        try:
            with open(join_file) as f:
                data = yaml.safe_load(f) or {}

            framework_id = data.get("framework", "")
            if not framework_id:
                continue

            # Count mappings
            mappings = data.get("mappings", [])
            mapping_count = len(mappings)

            # Check if framework exists
            framework_exists = framework_id in installed_frameworks

            # Get framework name if it exists
            framework_name = framework_id
            if framework_exists:
                framework = StandardFramework.objects.filter(slug=framework_id).first()
                if framework:
                    framework_name = framework.name

            overlays.append(
                OverlayInfo(
                    framework_id=framework_id,
                    framework_name=framework_name,
                    mapping_count=mapping_count,
                    framework_exists=framework_exists,
                )
            )
        except Exception as e:
            logger.error(f"Error reading overlay file {join_file}: {e}")
            continue

    return overlays
