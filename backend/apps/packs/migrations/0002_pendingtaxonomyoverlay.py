import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("packs", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="PendingTaxonomyOverlay",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "taxonomy_slug",
                    models.CharField(
                        help_text="The slug of the taxonomy this overlay maps to",
                        max_length=100,
                    ),
                ),
                (
                    "overlay_file_name",
                    models.CharField(
                        help_text="Name of the overlay file (e.g., 'threats-mitre-atlas.yaml')",
                        max_length=255,
                    ),
                ),
                (
                    "overlay_data",
                    models.JSONField(
                        default=dict,
                        help_text="The raw overlay data from the YAML file",
                    ),
                ),
                (
                    "mapping_count",
                    models.PositiveIntegerField(
                        default=0,
                        help_text="Number of mappings in this overlay",
                    ),
                ),
                (
                    "pack",
                    models.ForeignKey(
                        help_text="The pack that contains this overlay",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pending_taxonomy_overlays",
                        to="packs.librarypack",
                    ),
                ),
            ],
            options={
                "verbose_name": "Pending Taxonomy Overlay",
                "verbose_name_plural": "Pending Taxonomy Overlays",
                "ordering": ["pack", "taxonomy_slug"],
                "unique_together": {("pack", "taxonomy_slug")},
            },
        ),
    ]
