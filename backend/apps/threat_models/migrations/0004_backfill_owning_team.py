"""
Data migration to backfill owning_team on existing ThreatModels.

For each ThreatModel with owning_team=NULL:
1. Find the org's default team (is_default=True)
2. If none exists, create one named "Default Team" with is_default=True
3. Set owning_team to that team
"""

from django.db import migrations


def backfill_owning_team(apps, schema_editor):
    ThreatModel = apps.get_model("threat_models", "ThreatModel")
    Team = apps.get_model("organizations", "Team")

    # Cache default teams per org to avoid repeated lookups
    default_teams = {}

    for threat_model in ThreatModel.objects.filter(owning_team__isnull=True):
        org_id = threat_model.organization_id
        if org_id not in default_teams:
            default_team = Team.objects.filter(
                organization_id=org_id, is_default=True
            ).first()
            if default_team is None:
                default_team = Team.objects.create(
                    organization_id=org_id,
                    name="Default Team",
                    is_default=True,
                )
            default_teams[org_id] = default_team

        threat_model.owning_team = default_teams[org_id]
        threat_model.save(update_fields=["owning_team"])


def reverse_backfill(apps, schema_editor):
    ThreatModel = apps.get_model("threat_models", "ThreatModel")
    ThreatModel.objects.all().update(owning_team=None)


class Migration(migrations.Migration):

    dependencies = [
        ("threat_models", "0003_threatmodel_scope_locked_threatmodel_scope_locked_at_and_more"),
        ("organizations", "0003_remove_shadow_user"),
    ]

    operations = [
        migrations.RunPython(backfill_owning_team, reverse_backfill),
    ]
