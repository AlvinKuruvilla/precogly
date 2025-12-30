"""
Management command to clean up orphaned OrgsystemComponents.

Orphaned components are those not referenced by any DFD node's component_id.
This command will also delete associated ComponentInstanceThreats via CASCADE.

Usage:
    # Dry run (preview what will be deleted)
    python manage.py cleanup_orphaned_components

    # Actually delete orphaned records
    python manage.py cleanup_orphaned_components --execute

    # Also clean up empty Orgsystems
    python manage.py cleanup_orphaned_components --execute --include-empty-orgsystems
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.diagrams.models import DFD
from apps.systems.models import OrgsystemComponent, Orgsystem
from apps.threats.models import ComponentInstanceThreat


class Command(BaseCommand):
    help = "Clean up orphaned OrgsystemComponents not referenced by any DFD"

    def add_arguments(self, parser):
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Actually delete orphaned records (default is dry-run)",
        )
        parser.add_argument(
            "--include-empty-orgsystems",
            action="store_true",
            help="Also delete Orgsystems that have no components",
        )

    def handle(self, *args, **options):
        execute = options["execute"]
        include_empty_orgsystems = options["include_empty_orgsystems"]

        if not execute:
            self.stdout.write(
                self.style.WARNING("\n[DRY RUN] No records will be deleted. Use --execute to delete.\n")
            )

        # Find all component_ids referenced by DFD nodes
        referenced_component_ids = set()
        all_dfds = DFD.objects.all()

        self.stdout.write(f"Scanning {all_dfds.count()} DFDs for component references...")

        for dfd in all_dfds:
            canvas_data = dfd.canvas_data or {}
            for node in canvas_data.get("nodes", []):
                comp_id = node.get("data", {}).get("component_id")
                if comp_id:
                    referenced_component_ids.add(comp_id)

        self.stdout.write(f"Found {len(referenced_component_ids)} component IDs referenced by DFDs")

        # Find orphaned components
        all_components = OrgsystemComponent.objects.select_related(
            "component_library", "orgsystem"
        ).all()

        orphaned_components = [
            comp for comp in all_components
            if comp.id not in referenced_component_ids
        ]

        self.stdout.write(
            self.style.WARNING(f"\nFound {len(orphaned_components)} orphaned OrgsystemComponents:")
        )

        # Count associated threats that will be deleted
        orphaned_ids = [c.id for c in orphaned_components]
        threats_to_delete = ComponentInstanceThreat.objects.filter(
            component_id__in=orphaned_ids
        )
        threat_count = threats_to_delete.count()

        for comp in orphaned_components:
            lib_name = comp.component_library.name if comp.component_library else "None"
            org_name = comp.orgsystem.name if comp.orgsystem else "None"
            comp_threats = ComponentInstanceThreat.objects.filter(component=comp).count()
            self.stdout.write(
                f"  - ID={comp.id}: \"{comp.name}\" | Library: {lib_name} | "
                f"Orgsystem: {org_name} | Threats: {comp_threats}"
            )

        self.stdout.write(
            self.style.WARNING(f"\nTotal threats that will be deleted (CASCADE): {threat_count}")
        )

        # Find empty orgsystems if requested
        empty_orgsystems = []
        if include_empty_orgsystems:
            # Get orgsystem IDs that have components
            orgsystems_with_components = set(
                OrgsystemComponent.objects.values_list("orgsystem_id", flat=True)
            )
            # After deleting orphaned components, recalculate which will be empty
            remaining_component_orgsystem_ids = set(
                comp.orgsystem_id for comp in all_components
                if comp.id in referenced_component_ids
            )

            all_orgsystems = Orgsystem.objects.all()
            empty_orgsystems = [
                org for org in all_orgsystems
                if org.id not in remaining_component_orgsystem_ids
            ]

            self.stdout.write(
                self.style.WARNING(f"\nFound {len(empty_orgsystems)} Orgsystems that will be empty:")
            )
            for org in empty_orgsystems:
                self.stdout.write(f"  - ID={org.id}: \"{org.name}\"")

        # Execute deletion if requested
        if execute:
            self.stdout.write(self.style.NOTICE("\nExecuting deletion..."))

            with transaction.atomic():
                # Delete orphaned components (threats CASCADE automatically)
                deleted_count, deleted_details = OrgsystemComponent.objects.filter(
                    id__in=orphaned_ids
                ).delete()

                self.stdout.write(
                    self.style.SUCCESS(f"\nDeleted {deleted_count} records:")
                )
                for model, count in deleted_details.items():
                    self.stdout.write(f"  - {model}: {count}")

                # Delete empty orgsystems if requested
                if include_empty_orgsystems and empty_orgsystems:
                    empty_ids = [org.id for org in empty_orgsystems]
                    org_deleted_count, org_deleted_details = Orgsystem.objects.filter(
                        id__in=empty_ids
                    ).delete()

                    self.stdout.write(
                        self.style.SUCCESS(f"\nDeleted {org_deleted_count} empty Orgsystem records:")
                    )
                    for model, count in org_deleted_details.items():
                        self.stdout.write(f"  - {model}: {count}")

            self.stdout.write(self.style.SUCCESS("\nCleanup complete!"))
        else:
            self.stdout.write(
                self.style.NOTICE("\n[DRY RUN] To delete these records, run with --execute")
            )
