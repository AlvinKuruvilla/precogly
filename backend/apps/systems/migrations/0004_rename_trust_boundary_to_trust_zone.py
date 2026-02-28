"""
Rename TrustBoundary → TrustZone across the schema.

Operations:
1. RenameModel: TrustBoundary → TrustZone (renames table + auto-updates FK constraints)
2. AlterModelOptions: Update verbose_name_plural
3. RenameField on OrgsystemComponent: trust_boundary → trust_zone
4. RenameField on DataFlow: crosses_trust_boundary → crosses_trust_zone
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("systems", "0003_add_threat_model_and_instance_compliance"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="TrustBoundary",
            new_name="TrustZone",
        ),
        migrations.AlterModelOptions(
            name="trustzone",
            options={
                "ordering": ["name"],
                "verbose_name_plural": "Trust zones",
            },
        ),
        migrations.RenameField(
            model_name="orgsystemcomponent",
            old_name="trust_boundary",
            new_name="trust_zone",
        ),
        migrations.RenameField(
            model_name="dataflow",
            old_name="crosses_trust_boundary",
            new_name="crosses_trust_zone",
        ),
    ]
