"""
Signal handlers for organizations app.
Auto-provisions Personal Organization and Team for new users.
Handles invitation acceptance on login.
"""

from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Organization, OrganizationMember, Team, TeamInvitation, TeamMembership
from .utils import check_and_accept_invitations_on_login

User = get_user_model()

# Try to import allauth signals if available
try:
    from allauth.account.signals import user_logged_in, user_signed_up

    ALLAUTH_AVAILABLE = True
except ImportError:
    ALLAUTH_AVAILABLE = False


@receiver(post_save, sender=User)
def create_personal_workspace(sender, instance, created, **kwargs):
    """
    Auto-provision Personal Organization and Team for new users.
    Implements 'Zero-Config' mode from section 2 of the design doc.

    Skips personal workspace creation if the user has pending invitations,
    so they land directly in the inviting org instead of getting a throwaway workspace.
    """
    if not created:
        return

    # Skip if user already has an organization (e.g., invited to existing org)
    if instance.organization_memberships.exists():
        return

    # Skip if there are pending invitations for this email
    pending_invitations = TeamInvitation.objects.filter(
        email__iexact=instance.email,
        status=TeamInvitation.Status.PENDING,
        expires_at__gt=timezone.now(),
    )
    if pending_invitations.exists():
        return

    # Create personal organization
    org = Organization.objects.create(
        name=f"{instance.email}'s Workspace",
        plan=Organization.Plan.FREE,
    )

    # Add user as admin
    OrganizationMember.objects.create(
        organization=org,
        user=instance,
        role=OrganizationMember.Role.ADMIN,
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
        user=instance,
        role=TeamMembership.Role.LEAD,
    )


def handle_user_auth(request, user, **kwargs):
    """
    On login/signup: auto-accept pending team invitations.
    """
    check_and_accept_invitations_on_login(user)


# Register allauth signals if available
if ALLAUTH_AVAILABLE:
    user_signed_up.connect(handle_user_auth)
    user_logged_in.connect(handle_user_auth)
