"""
Management command to import a library pack from YAML files.

Usage:
    python manage.py import_pack /path/to/pack-directory [--org-id=1]
"""

import os
from pathlib import Path

import yaml
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.compliance.models import CountermeasureLibraryStandard, StandardFramework, StandardRequirement
from apps.diagrams.models import DFDTemplatesLibrary
from apps.packs.models import LibraryPack, LibraryPackDependency
from apps.systems.models import ComponentLibrary
from apps.threats.models import (
    ComponentLibraryThreat,
    CountermeasureLibrary,
    TaxonomyEntry,
    ThreatLibrary,
    ThreatLibraryTaxonomyEntry,
)


def _link_taxonomy_references(threat_obj, threat_data):
    """Create M2M links from taxonomy_references."""
    taxonomy_refs = threat_data.get("taxonomy_references")

    if not taxonomy_refs:
        return

    for taxonomy_slug, entry_ids in taxonomy_refs.items():
        for external_id in entry_ids:
            try:
                taxonomy_entry = TaxonomyEntry.objects.get(
                    taxonomy__slug=taxonomy_slug,
                    external_id=str(external_id),
                )
                ThreatLibraryTaxonomyEntry.objects.get_or_create(
                    threat_library=threat_obj,
                    taxonomy_entry=taxonomy_entry,
                )
            except TaxonomyEntry.DoesNotExist:
                pass  # Skip unknown taxonomy entries


class Command(BaseCommand):
    help = "Import a library pack from YAML files"

    def add_arguments(self, parser):
        parser.add_argument("pack_path", type=str, help="Path to pack directory")
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force reinstall even if pack exists",
        )

    def handle(self, *args, **options):
        pack_path = Path(options["pack_path"])
        force = options.get("force", False)

        if not pack_path.exists():
            raise CommandError(f"Pack path does not exist: {pack_path}")

        pack_yaml = pack_path / "pack.yaml"
        if not pack_yaml.exists():
            raise CommandError(f"pack.yaml not found in {pack_path}")

        # Load pack.yaml
        with open(pack_yaml) as f:
            pack_data = yaml.safe_load(f)

        self.stdout.write(f"Importing pack: {pack_data['pack']['name']}")

        try:
            with transaction.atomic():
                # Phase 1: Validation
                self._validate_pack(pack_data)

                # Phase 2: Create/update LibraryPack
                library_pack = self._create_or_update_pack(pack_data, force)

                # Phase 3: Process dependencies
                self._process_dependencies(library_pack, pack_data)

                # Phase 4: Create library items
                self._create_components(library_pack, pack_data)
                self._create_standalone_threats(library_pack, pack_data)
                self._create_standalone_countermeasures(library_pack, pack_data)

                # Phase 5: Create compliance frameworks (for compliance packs)
                self._create_frameworks(library_pack, pack_data)

                # Phase 6: Load DFD templates
                self._load_dfd_templates(library_pack, pack_path)

                self.stdout.write(
                    self.style.SUCCESS(f"Successfully imported pack: {library_pack.name} v{library_pack.version}")
                )

        except Exception as e:
            raise CommandError(f"Import failed: {str(e)}")

    def _validate_pack(self, pack_data):
        """Validate pack structure and required fields."""
        required_fields = ["slug", "name", "version", "pack_type"]
        pack = pack_data.get("pack", {})

        for field in required_fields:
            if field not in pack:
                raise CommandError(f"Missing required field: pack.{field}")

        self.stdout.write(f"  Validated pack structure")

    def _create_or_update_pack(self, pack_data, force):
        """Create or update the LibraryPack record."""
        pack = pack_data["pack"]
        slug = pack["slug"]

        existing = LibraryPack.objects.filter(slug=slug).first()
        if existing and not force:
            raise CommandError(
                f"Pack '{slug}' already exists (v{existing.version}). Use --force to reinstall."
            )

        if existing and force:
            self.stdout.write(f"  Updating existing pack: {slug}")
            # Hard delete existing items
            ComponentLibrary.objects.filter(source_pack=existing).delete()
            ThreatLibrary.objects.filter(source_pack=existing).delete()
            CountermeasureLibrary.objects.filter(source_pack=existing).delete()
            DFDTemplatesLibrary.objects.filter(source_pack=existing).delete()

        library_pack, created = LibraryPack.objects.update_or_create(
            slug=slug,
            defaults={
                "name": pack["name"],
                "description": pack.get("description", ""),
                "version": pack["version"],
                "pack_type": pack["pack_type"],
                "tier": pack.get("tier", "free"),
                "source": pack.get("source", "community"),
                "author": pack.get("author", ""),
                "repository_url": pack.get("repository_url", ""),
                "documentation_url": pack.get("documentation_url", ""),
                "industries": pack.get("industries", []),
                "tags": pack.get("tags", []),
                "content": pack_data,  # Store full content
                "is_published": True,
                "published_at": timezone.now(),
            },
        )

        action = "Created" if created else "Updated"
        self.stdout.write(f"  {action} LibraryPack: {library_pack.name}")
        return library_pack

    def _process_dependencies(self, library_pack, pack_data):
        """Process pack dependencies with version constraints."""
        depends_on = pack_data.get("pack", {}).get("depends_on", [])

        # Clear existing dependencies
        LibraryPackDependency.objects.filter(pack=library_pack).delete()

        for dep in depends_on:
            if isinstance(dep, str):
                # Simple slug format
                dep_slug = dep
                version_constraint = ""
                is_optional = False
            else:
                # Object format with version
                dep_slug = dep.get("pack", dep.get("slug", ""))
                version_constraint = dep.get("version", "")
                is_optional = dep.get("optional", False)

            # Find the dependency pack
            dep_pack = LibraryPack.objects.filter(slug=dep_slug).first()
            if not dep_pack and not is_optional:
                raise CommandError(
                    f"Required dependency '{dep_slug}' not found. Install it first."
                )

            if dep_pack:
                LibraryPackDependency.objects.create(
                    pack=library_pack,
                    depends_on_pack=dep_pack,
                    version_constraint=version_constraint,
                    is_optional=is_optional,
                )
                self.stdout.write(f"  Added dependency: {dep_slug} {version_constraint}")

    def _create_components(self, library_pack, pack_data):
        """Create components with their nested threats and countermeasures."""
        components = pack_data.get("components", [])

        for comp_data in components:
            # Create component
            component = self._create_component(library_pack, comp_data)

            # Create nested threats
            for threat_data in comp_data.get("threats", []):
                threat = self._create_threat(library_pack, threat_data)

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
                    countermeasure = self._create_countermeasure(library_pack, cm_data)
                    # Link countermeasure to threat
                    countermeasure.applicable_threats.add(threat)

        self.stdout.write(f"  Created {len(components)} components with threats/countermeasures")

    def _create_component(self, library_pack, comp_data):
        """Create a ComponentLibrary record."""
        slug = comp_data["slug"]
        qualified_slug = f"{library_pack.slug}/{slug}"

        component, created = ComponentLibrary.objects.update_or_create(
            qualified_slug=qualified_slug,
            defaults={
                "source_pack": library_pack,
                "slug": slug,
                "name": comp_data["name"],
                "category": comp_data["category"],
                "component_type": comp_data.get("component_type", ""),
                "provider": comp_data.get("provider", ""),
                "customization_status": "original",
            },
        )
        return component

    def _create_threat(self, library_pack, threat_data):
        """Create a ThreatLibrary record."""
        slug = threat_data["slug"]
        qualified_slug = f"{library_pack.slug}/{slug}"

        threat, created = ThreatLibrary.objects.update_or_create(
            qualified_slug=qualified_slug,
            defaults={
                "source_pack": library_pack,
                "slug": slug,
                "name": threat_data["name"],
                "description": threat_data.get("description", ""),
                "customization_status": "original",
            },
        )

        _link_taxonomy_references(threat, threat_data)

        return threat

    def _create_countermeasure(self, library_pack, cm_data):
        """Create a CountermeasureLibrary record."""
        slug = cm_data["slug"]
        qualified_slug = f"{library_pack.slug}/{slug}"

        countermeasure, created = CountermeasureLibrary.objects.update_or_create(
            qualified_slug=qualified_slug,
            defaults={
                "source_pack": library_pack,
                "slug": slug,
                "name": cm_data["name"],
                "description": cm_data.get("description", ""),
                "control_type": cm_data["control_type"],
                "cost": cm_data.get("cost", "medium"),
                "customization_status": "original",
            },
        )
        return countermeasure

    def _create_standalone_threats(self, library_pack, pack_data):
        """Create standalone threats (not nested under components)."""
        threats = pack_data.get("threats", [])

        for threat_data in threats:
            self._create_threat(library_pack, threat_data)

        if threats:
            self.stdout.write(f"  Created {len(threats)} standalone threats")

    def _create_standalone_countermeasures(self, library_pack, pack_data):
        """Create standalone countermeasures and link to threats."""
        countermeasures = pack_data.get("countermeasures", [])

        for cm_data in countermeasures:
            countermeasure = self._create_countermeasure(library_pack, cm_data)

            # Link to applicable threats
            for threat_ref in cm_data.get("applicable_threats", []):
                threat = self._resolve_threat_reference(library_pack, threat_ref)
                if threat:
                    countermeasure.applicable_threats.add(threat)

        if countermeasures:
            self.stdout.write(f"  Created {len(countermeasures)} standalone countermeasures")

    def _resolve_threat_reference(self, library_pack, threat_ref):
        """Resolve a threat reference (slug or qualified slug)."""
        if "/" in threat_ref:
            # Qualified slug
            return ThreatLibrary.objects.filter(qualified_slug=threat_ref).first()
        else:
            # Try current pack first
            qualified = f"{library_pack.slug}/{threat_ref}"
            threat = ThreatLibrary.objects.filter(qualified_slug=qualified).first()

            if not threat:
                # Try global
                threat = ThreatLibrary.objects.filter(
                    qualified_slug=f"global/{threat_ref}"
                ).first()

            return threat

    def _load_dfd_templates(self, library_pack, pack_path):
        """Load DFD templates from the dfd-templates directory."""
        templates_dir = pack_path / "dfd-templates"
        if not templates_dir.exists():
            return

        template_files = list(templates_dir.glob("*.yaml")) + list(templates_dir.glob("*.yml"))

        for template_file in template_files:
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
                },
            )

        if template_files:
            self.stdout.write(f"  Created {len(template_files)} DFD templates")

    def _create_frameworks(self, library_pack, pack_data):
        """Create compliance frameworks and their requirements."""
        frameworks = pack_data.get("frameworks", [])

        framework_count = 0
        requirement_count = 0

        for fw_data in frameworks:
            # Create or update framework
            framework, created = StandardFramework.objects.update_or_create(
                slug=fw_data["slug"],
                defaults={
                    "source_pack": library_pack,
                    "name": fw_data["name"],
                    "version": fw_data.get("version", ""),
                    "issuer": fw_data.get("issuer", ""),
                    "description": fw_data.get("description", ""),
                },
            )
            if created:
                framework_count += 1

            # Create requirements
            for req_data in fw_data.get("requirements", []):
                parent = None
                if req_data.get("parent_code"):
                    parent = StandardRequirement.objects.filter(
                        framework=framework,
                        section_code=req_data["parent_code"],
                    ).first()

                _, req_created = StandardRequirement.objects.update_or_create(
                    framework=framework,
                    section_code=req_data["section_code"],
                    defaults={
                        "description": req_data.get("description", ""),
                        "parent": parent,
                    },
                )
                if req_created:
                    requirement_count += 1

        if frameworks:
            self.stdout.write(f"  Created {framework_count} frameworks, {requirement_count} requirements")
