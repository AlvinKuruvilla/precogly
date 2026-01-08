"""
Data migration to clean up placeholder Orgsystem records.

1. Set orgsystem=NULL for components belonging to placeholder systems
2. Delete placeholder systems (those starting with "System for ")
"""
from django.db import migrations


def cleanup_placeholder_systems(apps, schema_editor):
    """Clean up auto-generated placeholder systems."""
    Orgsystem = apps.get_model('systems', 'Orgsystem')
    OrgsystemComponent = apps.get_model('systems', 'OrgsystemComponent')

    # Find placeholder systems (auto-generated with "System for " prefix)
    placeholders = Orgsystem.objects.filter(name__startswith="System for ")
    placeholder_ids = list(placeholders.values_list('id', flat=True))

    if not placeholder_ids:
        print("No placeholder systems found to clean up.")
        return

    # Count affected components
    affected_components = OrgsystemComponent.objects.filter(
        orgsystem_id__in=placeholder_ids
    ).count()

    # Unlink components from placeholder systems (set orgsystem to NULL)
    OrgsystemComponent.objects.filter(
        orgsystem_id__in=placeholder_ids
    ).update(orgsystem=None)

    # Delete placeholder systems
    deleted_count, _ = placeholders.delete()

    print(f"Cleaned up {deleted_count} placeholder systems.")
    print(f"Unlinked {affected_components} components (now have orgsystem=NULL).")


def reverse_cleanup(apps, schema_editor):
    """
    Cannot reverse this migration - placeholder systems are permanently deleted.
    Components remain intact with orgsystem=NULL.
    """
    print("WARNING: Cannot restore deleted placeholder systems.")
    print("Components remain intact with orgsystem=NULL.")


class Migration(migrations.Migration):

    dependencies = [
        ('systems', '0007_make_orgsystem_nullable'),
    ]

    operations = [
        migrations.RunPython(cleanup_placeholder_systems, reverse_cleanup),
    ]
