"""
3-step migration: One DFD per Threat Model

Step 1: Add threat_model FK on DFD (nullable)
Step 2: Copy ThreatModelDFD.threat_model_id -> DFD.threat_model_id
Step 3: Delete ThreatModelDFD and DFDOrgsystem
"""

import django.db.models.deletion
from django.db import migrations, models


def copy_threat_model_to_dfd(apps, schema_editor):
    """Copy threat_model_id from ThreatModelDFD join table to DFD.threat_model."""
    ThreatModelDFD = apps.get_model("diagrams", "ThreatModelDFD")
    DFD = apps.get_model("diagrams", "DFD")

    for association in ThreatModelDFD.objects.all():
        DFD.objects.filter(id=association.dfd_id).update(
            threat_model_id=association.threat_model_id
        )


class Migration(migrations.Migration):

    dependencies = [
        ("diagrams", "0002_initial"),
        ("threat_models", "0005_add_assumptions_field"),
    ]

    operations = [
        # Step 1: Add threat_model FK on DFD (nullable)
        migrations.AddField(
            model_name="dfd",
            name="threat_model",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="dfds",
                to="threat_models.threatmodel",
            ),
        ),
        # Step 2: Copy data from ThreatModelDFD to DFD.threat_model
        migrations.RunPython(
            copy_threat_model_to_dfd,
            migrations.RunPython.noop,  # No reverse needed - test data
        ),
        # Step 3: Drop ThreatModelDFD and DFDOrgsystem
        migrations.AlterUniqueTogether(
            name="threatmodeldfd",
            unique_together=None,
        ),
        migrations.RemoveField(
            model_name="threatmodeldfd",
            name="dfd",
        ),
        migrations.RemoveField(
            model_name="threatmodeldfd",
            name="threat_model",
        ),
        migrations.DeleteModel(
            name="DFDOrgsystem",
        ),
        migrations.DeleteModel(
            name="ThreatModelDFD",
        ),
    ]
