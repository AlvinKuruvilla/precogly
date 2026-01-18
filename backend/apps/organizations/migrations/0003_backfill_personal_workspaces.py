"""
Data migration to backfill Personal Organization and Team for existing users.
This runs once and is tracked by Django's migration system.
"""

from django.conf import settings
from django.db import migrations


def backfill_personal_workspaces(apps, schema_editor):
    """Create Personal Organization and Team for users who don't have one."""
    User = apps.get_model("auth", "User")
    Organization = apps.get_model("organizations", "Organization")
    OrganizationMember = apps.get_model("organizations", "OrganizationMember")
    Team = apps.get_model("organizations", "Team")
    TeamMembership = apps.get_model("organizations", "TeamMembership")

    # Find users without any organization membership
    users_with_orgs = OrganizationMember.objects.values_list("user_id", flat=True)
    users_without_org = User.objects.exclude(id__in=users_with_orgs)

    for user in users_without_org:
        # Create personal organization
        org = Organization.objects.create(
            name=f"{user.email}'s Workspace",
            plan="free",
        )

        # Add user as admin
        OrganizationMember.objects.create(
            organization=org,
            user=user,
            role="admin",
        )

        # Create default team
        team = Team.objects.create(
            organization=org,
            name="My Team",
            is_default=True,
        )

        # Add user as team lead
        TeamMembership.objects.create(
            team=team,
            user=user,
            role="lead",
        )

    # Also handle users WITH orgs but WITHOUT teams (edge case)
    users_with_orgs_no_teams = OrganizationMember.objects.exclude(
        user__team_memberships__isnull=False
    ).select_related("organization", "user")

    for org_member in users_with_orgs_no_teams:
        org = org_member.organization
        user = org_member.user

        # Create default team for this org if none exists
        team, _ = Team.objects.get_or_create(
            organization=org,
            is_default=True,
            defaults={"name": "My Team"},
        )

        # Add user as team lead
        TeamMembership.objects.get_or_create(
            team=team,
            user=user,
            defaults={"role": "lead"},
        )


def reverse_backfill(apps, schema_editor):
    """
    Reverse is a no-op. We don't want to delete user workspaces
    if migration is reversed - that would cause data loss.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0002_organization_business_unit_label_businessunit_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_personal_workspaces, reverse_backfill),
    ]
