"""
Utility functions for organizations app.
Includes shadow user merge and invitation acceptance helpers.
"""

from django.db import transaction
from django.utils import timezone

from .models import (
    OrganizationMember,
    ShadowUser,
    TeamInvitation,
    TeamMembership,
)


@transaction.atomic
def merge_shadow_user(shadow_user, real_user):
    """
    Merge a Shadow User's data into a Real User account upon registration/login.

    This function:
    1. Transfers all team memberships from shadow to real user
    2. Transfers all organization memberships
    3. Re-assigns ownership of threat models created by shadow user
    4. Re-assigns any other user-attributed data
    5. Marks the shadow user as converted
    6. Deletes the temporary Django user account

    Args:
        shadow_user: ShadowUser instance to merge from
        real_user: User instance to merge into

    Returns:
        dict with merge statistics
    """
    from apps.threat_models.models import ThreatModel
    from apps.diagrams.models import DFD
    from apps.threats.models import (
        ComponentInstanceCountermeasure,
        FlowInstanceCountermeasure,
    )

    stats = {
        "team_memberships": 0,
        "org_memberships": 0,
        "threat_models": 0,
        "dfds": 0,
        "countermeasures": 0,
    }

    shadow_django_user = shadow_user.user

    # 1. Transfer team memberships
    for membership in TeamMembership.objects.filter(user=shadow_django_user):
        # Check if real user already has this membership
        existing = TeamMembership.objects.filter(
            team=membership.team,
            user=real_user,
        ).first()

        if existing:
            # Keep the better role (lead > member > viewer)
            role_priority = {"lead": 3, "member": 2, "viewer": 1}
            if role_priority.get(membership.role, 0) > role_priority.get(
                existing.role, 0
            ):
                existing.role = membership.role
                existing.save(update_fields=["role"])
            membership.delete()
        else:
            membership.user = real_user
            membership.save(update_fields=["user"])
            stats["team_memberships"] += 1

    # 2. Transfer organization memberships
    for org_membership in OrganizationMember.objects.filter(user=shadow_django_user):
        existing = OrganizationMember.objects.filter(
            organization=org_membership.organization,
            user=real_user,
        ).first()

        if existing:
            # Keep the better role
            role_priority = {"admin": 4, "security_team": 3, "champion": 2, "viewer": 1}
            if role_priority.get(org_membership.role, 0) > role_priority.get(
                existing.role, 0
            ):
                existing.role = org_membership.role
                existing.save(update_fields=["role"])
            org_membership.delete()
        else:
            org_membership.user = real_user
            org_membership.save(update_fields=["user"])
            stats["org_memberships"] += 1

    # 3. Transfer threat model ownership
    stats["threat_models"] = ThreatModel.objects.filter(
        created_by=shadow_django_user
    ).update(created_by=real_user)

    # 4. Transfer DFD ownership
    stats["dfds"] = DFD.objects.filter(updated_by=shadow_django_user).update(
        updated_by=real_user
    )

    # 5. Transfer countermeasure assignments
    stats["countermeasures"] += ComponentInstanceCountermeasure.objects.filter(
        assigned_owner=shadow_django_user
    ).update(assigned_owner=real_user)

    stats["countermeasures"] += ComponentInstanceCountermeasure.objects.filter(
        verified_by=shadow_django_user
    ).update(verified_by=real_user)

    stats["countermeasures"] += FlowInstanceCountermeasure.objects.filter(
        assigned_owner=shadow_django_user
    ).update(assigned_owner=real_user)

    stats["countermeasures"] += FlowInstanceCountermeasure.objects.filter(
        verified_by=shadow_django_user
    ).update(verified_by=real_user)

    # 6. Mark shadow user as converted
    shadow_user.status = ShadowUser.Status.CONVERTED
    shadow_user.converted_at = timezone.now()
    shadow_user.save(update_fields=["status", "converted_at"])

    # 7. Delete the temporary Django user (shadow_user FK will be updated first)
    shadow_user.user = real_user  # Point to real user before deleting temp user
    shadow_user.save(update_fields=["user"])
    shadow_django_user.delete()

    return stats


def check_and_merge_shadow_on_login(user):
    """
    Called after successful login/registration to check for pending shadow data.
    Looks for shadow users with matching email and merges if found.
    """
    # Find any shadow users that were created with this email
    pending_shadows = ShadowUser.objects.filter(
        status=ShadowUser.Status.ACTIVE,
        user__email=user.email,
    ).exclude(user=user)

    merged_count = 0
    for shadow in pending_shadows:
        merge_shadow_user(shadow, user)
        merged_count += 1

    return merged_count


def check_and_accept_invitations_on_login(user):
    """
    Called after successful login/registration to auto-accept pending invitations.
    """
    pending_invitations = TeamInvitation.objects.filter(
        email__iexact=user.email,
        status=TeamInvitation.Status.PENDING,
        expires_at__gt=timezone.now(),
    )

    accepted_count = 0
    for invitation in pending_invitations:
        invitation.accept(user)
        # Also add to organization
        OrganizationMember.objects.get_or_create(
            organization=invitation.team.organization,
            user=user,
            defaults={"role": OrganizationMember.Role.VIEWER},
        )
        accepted_count += 1

    return accepted_count
