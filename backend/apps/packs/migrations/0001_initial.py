import django.contrib.postgres.fields
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="LibraryPack",
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
                    "slug",
                    models.SlugField(
                        help_text="Unique identifier, e.g., 'banking-technologies'",
                        max_length=100,
                        unique=True,
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField()),
                (
                    "pack_type",
                    models.CharField(
                        choices=[
                            ("technology", "Technology Pack"),
                            ("threat", "Threat Pack"),
                            ("countermeasure", "Countermeasure Pack"),
                            ("compliance", "Compliance Pack"),
                            ("template", "DFD Template Pack"),
                            ("full", "Full Stack Pack"),
                            ("taxonomy", "Taxonomy Pack"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "version",
                    models.CharField(
                        help_text="Semantic version, e.g., '1.2.0'",
                        max_length=20,
                    ),
                ),
                (
                    "author",
                    models.CharField(
                        help_text="Author or organization name",
                        max_length=255,
                    ),
                ),
                (
                    "tags",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(max_length=50),
                        blank=True,
                        default=list,
                        help_text="Tags for search/filtering, e.g., ['aws', 'cloud', 'serverless']",
                        size=None,
                    ),
                ),
            ],
            options={
                "verbose_name": "Library Pack",
                "verbose_name_plural": "Library Packs",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="LibraryPackDependency",
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
                    "depends_on_pack",
                    models.ForeignKey(
                        help_text="The pack being depended upon",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dependents",
                        to="packs.librarypack",
                    ),
                ),
                (
                    "pack",
                    models.ForeignKey(
                        help_text="The pack that has the dependency",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dependencies",
                        to="packs.librarypack",
                    ),
                ),
            ],
            options={
                "verbose_name": "Pack Dependency",
                "verbose_name_plural": "Pack Dependencies",
                "unique_together": {("pack", "depends_on_pack")},
            },
        ),
        migrations.CreateModel(
            name="PendingFrameworkOverlay",
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
                    "framework_slug",
                    models.CharField(
                        help_text="The slug of the framework this overlay maps to",
                        max_length=100,
                    ),
                ),
                (
                    "overlay_file_name",
                    models.CharField(
                        help_text="Name of the overlay file (e.g., 'countermeasures-owasp-2021.yaml')",
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
                        related_name="pending_overlays",
                        to="packs.librarypack",
                    ),
                ),
            ],
            options={
                "verbose_name": "Pending Framework Overlay",
                "verbose_name_plural": "Pending Framework Overlays",
                "ordering": ["pack", "framework_slug"],
                "unique_together": {("pack", "framework_slug")},
            },
        ),
        migrations.CreateModel(
            name="PendingRequirementOverlay",
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
                    "source_framework_slug",
                    models.CharField(
                        help_text="The slug of the source framework (from_requirement side)",
                        max_length=100,
                    ),
                ),
                (
                    "target_framework_slug",
                    models.CharField(
                        help_text="The slug of the target framework (to_requirement side)",
                        max_length=100,
                    ),
                ),
                (
                    "overlay_file_name",
                    models.CharField(
                        help_text="Name of the overlay file (e.g., 'requirements-iec-81001-5-1.yaml')",
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
                        related_name="pending_requirement_overlays",
                        to="packs.librarypack",
                    ),
                ),
            ],
            options={
                "verbose_name": "Pending Requirement Overlay",
                "verbose_name_plural": "Pending Requirement Overlays",
                "ordering": ["pack", "source_framework_slug", "target_framework_slug"],
                "unique_together": {("pack", "source_framework_slug", "target_framework_slug")},
            },
        ),
    ]
