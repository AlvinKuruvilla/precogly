"""
RBAC migration: Replace 4 org roles with 2, add is_primary to Organization,
seed primary organization and default team.
"""

from django.db import migrations, models


def migrate_roles_forward(apps, schema_editor):
    """Migrate existing roles: ADMIN -> security_team, CHAMPION/VIEWER -> member."""
    OrganizationMember = apps.get_model("organizations", "OrganizationMember")
    OrganizationMember.objects.filter(role="admin").update(role="security_team")
    OrganizationMember.objects.filter(role="champion").update(role="member")
    OrganizationMember.objects.filter(role="viewer").update(role="member")


def seed_primary_organization(apps, schema_editor):
    """Create the primary organization and default team if none exists."""
    Organization = apps.get_model("organizations", "Organization")

    if Organization.objects.filter(is_primary=True).exists():
        return

    # If there's exactly one org, promote it to primary
    if Organization.objects.count() == 1:
        org = Organization.objects.first()
        org.is_primary = True
        org.save(update_fields=["is_primary"])
    else:
        # Create new primary org
        org = Organization.objects.create(
            name="Precogly",
            plan="free",
            is_primary=True,
        )

    # Ensure a default team exists
    Team = apps.get_model("organizations", "Team")
    if not Team.objects.filter(organization=org, is_default=True).exists():
        Team.objects.create(
            organization=org,
            name="Default Team",
            is_default=True,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0004_team_code_conditional_unique"),
    ]

    operations = [
        # 1. Add is_primary field (no constraint yet, so migration data step works)
        migrations.AddField(
            model_name="organization",
            name="is_primary",
            field=models.BooleanField(default=False),
        ),
        # 2. Migrate role data before changing choices
        migrations.RunPython(migrate_roles_forward, migrations.RunPython.noop),
        # 3. Alter role field to new choices
        migrations.AlterField(
            model_name="organizationmember",
            name="role",
            field=models.CharField(
                choices=[
                    ("security_team", "Security Team"),
                    ("member", "Member"),
                ],
                default="member",
                max_length=20,
            ),
        ),
        # 4. Seed primary organization
        migrations.RunPython(seed_primary_organization, migrations.RunPython.noop),
        # 5. Add unique constraint for is_primary=True
        migrations.AddConstraint(
            model_name="organization",
            constraint=models.UniqueConstraint(
                condition=models.Q(is_primary=True),
                fields=("is_primary",),
                name="unique_primary_organization",
            ),
        ),
    ]
