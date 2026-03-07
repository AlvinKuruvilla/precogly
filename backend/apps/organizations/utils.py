"""
Utility functions for organizations app.
Includes invitation acceptance helpers.
"""

from django.utils import timezone

from .models import (
    OrganizationMember,
    TeamInvitation,
    TeamMembership,
)


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
