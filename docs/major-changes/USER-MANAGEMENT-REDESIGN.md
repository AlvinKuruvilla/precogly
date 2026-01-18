Precogly: User Management & Governance Architecture
Executive Summary
This document outlines the proposed architecture for User Management and Access Control within Precogly. The goal is to satisfy strict enterprise compliance requirements (hierarchy, ownership, auditability) while maintaining a frictionless "Product-Led Growth" experience for individual testers and small teams.

1. Core Enterprise Hierarchy (The "Compliance" Mode)
   To address the feedback regarding governance in large organizations (10,000+ developers), we are shifting from a User-Centric ownership model to a Team-Centric model. This ensures threat models are not orphaned when employees leave and mirrors the organizational structure (Conway’s Law).

The Three-Tier Structure:

Organization (Tenant): The root entity (e.g., "Acme Corp").

Business Unit (or custom label): A flexible grouping layer for budget/risk ownership (e.g., "Consumer Banking", "Product Area", "Division"). The display name is configurable per organization. Used for aggregated compliance reporting.

Team: The functional unit of work (e.g., "Payments Squad").

Asset Ownership: Threat Models belong to a Team, not an individual user.

Role-Based Access Control (RBAC):

Security/Global Admin: Platform-wide visibility; defines templates and policy.

Business Unit Owner: Read-only visibility into aggregate risk for their department.

Team Lead: Manages members and approves models.

Developer: Creates/edits models within their assigned teams. Users can belong to multiple teams.

2. The Small Team Experience (The "Zero-Config" Mode)
   For startups or single consultants where a complex hierarchy is unnecessary overhead, the system uses "Implicit Hierarchies." The database structure remains identical to the enterprise version, but the UI adapts via Progressive Disclosure.

Default Workspace: Upon sign-up, a "Personal Team" and "Personal Organization" are automatically provisioned in the background.

UI Adaptation: If a user belongs to only one team, all hierarchy selectors (Team Switchers, Business Unit dropdowns) are hidden.

Seamless Scaling: A solo user can invite colleagues to their "Personal Team" seamlessly. If they later join a large enterprise, the UI simply reveals the "Team Switcher," allowing them to toggle between Personal and Enterprise contexts.

3. Frictionless Adoption (The "Test Drive" Scenario)
   To support immediate evaluation without forcing registration, we utilize a "Lazy Registration" pattern.

Shadow Users: When a visitor clicks "Start Threat Modeling," a temporary, invisible user account is created in the background.

Full Functionality: The user can create models and assess the tool’s features immediately.

Data Preservation: A "Sign Up to Save" prompt allows the user to claim the account. The temporary data is preserved and associated with their new credentials, ensuring no work is lost during conversion.

4. Collaboration & External Sharing
   We distinguish between adding a persistent collaborator and sharing a snapshot.

A. Team Invitations (Membership)

Mechanism: Users generate unique invite links (or emails) to add members to a Team.

Audit Trail: The system tracks who invited whom and when.

Permissions: New members gain the permissions associated with that Team (e.g., Edit access to all Team models).

B. Magic Links (Read-Only Access)

Use Case: Sharing a model with a stakeholder who does not have (and shouldn't need) a Precogly account.

Mechanism: A unique, tokenized URL is generated for a specific Threat Model (e.g., precogly.com/share/xyz-123). Links expire after a configurable period (default: 30 days).

Behavior:

For Anonymous Visitors: Renders a strictly Read-Only view of the model.

For Logged-in Users: Adds the model to a "Shared with Me" list.

Enterprise Governance (The "Kill Switch"): Enterprise Admins can enforce a policy to disable public link sharing globally or per Business Unit to prevent data leakage.

---

5. Implementation Plan

This section details the technical implementation based on the current Precogly codebase (Django 5.1 backend, React/TypeScript frontend).

5.1 Current State Summary

Backend:
- Organization model exists with plan tiers (FREE, PRO, ENTERPRISE)
- OrganizationMember model with roles: ADMIN, SECURITY_TEAM, CHAMPION, VIEWER
- ThreatModel has `organization` FK and `created_by` user FK
- JWT authentication via dj-rest-auth and simplejwt
- All models inherit from TimestampedModel (created_at, updated_at)

Frontend:
- React with TanStack Query for data fetching
- AuthContext manages user state (minimal: pk, email only)
- Protected routes implemented
- No organization/team management UI exists yet

5.2 Phase 1: Database Models (Backend)

Location: /backend/apps/organizations/models.py

A. BusinessUnit Model (Flexible Grouping Layer)

```python
class BusinessUnit(TimestampedModel):
    """
    Flexible grouping layer between Organization and Team.
    Display label is configurable per organization.
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="business_units",
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)  # e.g., "CONSUMER", "ENTERPRISE"
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )  # Optional nesting for complex orgs

    class Meta:
        unique_together = ["organization", "code"]
        verbose_name_plural = "Business units"
```

B. Add label configuration to Organization

```python
# Add to Organization model
business_unit_label = models.CharField(
    max_length=50,
    default="Business Unit",
    help_text="Custom label for the grouping layer (e.g., 'Department', 'Product Area')"
)
```

C. Team Model

```python
class Team(TimestampedModel):
    """
    The functional unit of work. Owns threat models.
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="teams",
    )
    business_unit = models.ForeignKey(
        BusinessUnit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teams",
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)  # For "Personal Team" auto-provisioning

    class Meta:
        unique_together = ["organization", "code"]
```

D. TeamMembership Model (Many-to-Many)

```python
class TeamMembership(TimestampedModel):
    """
    Bridge table for User <-> Team relationship.
    Users can belong to multiple teams.
    """
    class Role(models.TextChoices):
        LEAD = "lead", "Team Lead"
        MEMBER = "member", "Member"
        VIEWER = "viewer", "Viewer"

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_memberships",
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["team", "user"]
```

E. TeamInvitation Model (for inviting non-existent users)

```python
class TeamInvitation(TimestampedModel):
    """
    Invitation for users who haven't signed up yet.
    Converted to TeamMembership when user registers.
    """
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        EXPIRED = "expired", "Expired"
        REVOKED = "revoked", "Revoked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="invitations",
    )
    email = models.EmailField()  # Email of invited user (may not exist yet)
    role = models.CharField(
        max_length=20,
        choices=TeamMembership.Role.choices,
        default=TeamMembership.Role.MEMBER
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_team_invitations",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["team", "email"]  # One pending invite per email per team

    def is_valid(self):
        return (
            self.status == self.Status.PENDING
            and self.expires_at > timezone.now()
        )

    def accept(self, user):
        """Convert invitation to membership."""
        membership, created = TeamMembership.objects.get_or_create(
            team=self.team,
            user=user,
            defaults={'role': self.role}
        )
        self.status = self.Status.ACCEPTED
        self.accepted_at = timezone.now()
        self.save(update_fields=['status', 'accepted_at'])
        return membership
```

F. Update ThreatModel Ownership

Location: /backend/apps/diagrams/models.py

```python
# Add to ThreatModel model
owning_team = models.ForeignKey(
    'organizations.Team',
    on_delete=models.PROTECT,  # Prevent accidental team deletion
    related_name="threat_models",
    null=True,  # Nullable during migration period
)
# Keep created_by for audit trail
```

F. MagicLink Model (for sharing)

```python
class MagicLink(TimestampedModel):
    """
    Tokenized URL for read-only threat model sharing.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    threat_model = models.ForeignKey(
        'diagrams.ThreatModel',
        on_delete=models.CASCADE,
        related_name="magic_links",
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    expires_at = models.DateTimeField()
    accessed_count = models.PositiveIntegerField(default=0)
    is_revoked = models.BooleanField(default=False)

    def is_valid(self):
        return not self.is_revoked and self.expires_at > timezone.now()
```

G. ShadowUser Model (for PLG)

```python
class ShadowUser(TimestampedModel):
    """
    Temporary user for "test drive" functionality.
    Converted to real user upon registration.
    """
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CONVERTED = "converted", "Converted"
        EXPIRED = "expired", "Expired"

    session_key = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shadow_profile",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="shadow_users",
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="shadow_users",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    expires_at = models.DateTimeField()
    converted_at = models.DateTimeField(null=True, blank=True)
```

5.3 Phase 2: API Endpoints (Backend)

Location: /backend/apps/organizations/

A. New Serializers (/serializers.py)

```python
class BusinessUnitSerializer(serializers.ModelSerializer):
    team_count = serializers.SerializerMethodField()

    class Meta:
        model = BusinessUnit
        fields = ['id', 'name', 'code', 'description', 'parent', 'team_count', 'created_at']

    def get_team_count(self, obj):
        return obj.teams.count()


class TeamSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    business_unit_name = serializers.CharField(source='business_unit.name', read_only=True)

    class Meta:
        model = Team
        fields = ['id', 'name', 'code', 'description', 'business_unit',
                  'business_unit_name', 'member_count', 'is_default', 'created_at']

    def get_member_count(self, obj):
        return obj.memberships.count()


class TeamMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)

    class Meta:
        model = TeamMembership
        fields = ['id', 'team', 'team_name', 'user', 'user_email', 'role', 'joined_at']


class MagicLinkSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = MagicLink
        fields = ['id', 'threat_model', 'token', 'url', 'expires_at',
                  'accessed_count', 'is_revoked', 'created_at']
        read_only_fields = ['token', 'accessed_count']

    def get_url(self, obj):
        return f"/share/{obj.token}"


class TeamInvitationSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    organization_name = serializers.CharField(source='team.organization.name', read_only=True)
    invited_by_email = serializers.EmailField(source='invited_by.email', read_only=True)
    invite_url = serializers.SerializerMethodField()

    class Meta:
        model = TeamInvitation
        fields = [
            'id', 'team', 'team_name', 'organization_name', 'email', 'role',
            'token', 'invite_url', 'invited_by', 'invited_by_email',
            'status', 'expires_at', 'created_at'
        ]
        read_only_fields = ['token', 'invited_by', 'status']

    def get_invite_url(self, obj):
        return f"/invite/{obj.token}"
```

B. New ViewSets (/views.py)

```python
class BusinessUnitViewSet(viewsets.ModelViewSet):
    serializer_class = BusinessUnitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org_ids = self.request.user.organization_memberships.values_list(
            "organization_id", flat=True
        )
        return BusinessUnit.objects.filter(organization_id__in=org_ids)


class IsTeamMember(permissions.BasePermission):
    """
    Permission check for team membership.
    - Org admins can LIST/RETRIEVE teams (read-only visibility)
    - Only explicit team members can perform write operations
    """
    def has_object_permission(self, request, view, obj):
        # Safe methods (GET, HEAD, OPTIONS) allowed for org members
        if request.method in permissions.SAFE_METHODS:
            return obj.organization.members.filter(user=request.user).exists()

        # Write operations require explicit team membership
        return obj.memberships.filter(
            user=request.user,
            role__in=['lead', 'member']  # Viewers can't write
        ).exists()


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated, IsTeamMember]

    def get_queryset(self):
        """
        Org admins can see all teams in their orgs (visibility).
        Filtering for "my teams only" can be done via query param.
        """
        org_ids = self.request.user.organization_memberships.values_list(
            "organization_id", flat=True
        )
        queryset = Team.objects.filter(organization_id__in=org_ids)

        # Optional filter: only teams user is a member of
        my_teams_only = self.request.query_params.get('my_teams', 'false')
        if my_teams_only.lower() == 'true':
            queryset = queryset.filter(memberships__user=self.request.user)

        return queryset

    def get_permissions(self):
        """Skip IsTeamMember for list/create (handled differently)."""
        if self.action in ['list', 'create']:
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        team = self.get_object()
        memberships = team.memberships.select_related('user')
        serializer = TeamMembershipSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """
        Add existing user to team by user_id.
        For non-existent users, use invite_member instead.
        """
        team = self.get_object()
        user_id = request.data.get('user_id')
        role = request.data.get('role', 'member')

        if not user_id:
            return Response(
                {'error': 'user_id is required. For new users, use invite_member.'},
                status=400
            )

        # Verify user exists
        User = get_user_model()
        if not User.objects.filter(id=user_id).exists():
            return Response(
                {'error': 'User not found. Use invite_member for non-existent users.'},
                status=404
            )

        membership, created = TeamMembership.objects.get_or_create(
            team=team,
            user_id=user_id,
            defaults={'role': role}
        )
        return Response(TeamMembershipSerializer(membership).data)

    @action(detail=True, methods=['post'])
    def invite_member(self, request, pk=None):
        """
        Invite user by email. Works for both existing and non-existent users.
        - If user exists: creates TeamMembership directly
        - If user doesn't exist: creates TeamInvitation (pending)
        """
        import secrets
        from datetime import timedelta

        team = self.get_object()
        email = request.data.get('email')
        role = request.data.get('role', 'member')

        if not email:
            return Response({'error': 'email is required'}, status=400)

        # Check if user already exists
        User = get_user_model()
        try:
            existing_user = User.objects.get(email=email)
            # User exists - create membership directly
            membership, created = TeamMembership.objects.get_or_create(
                team=team,
                user=existing_user,
                defaults={'role': role}
            )
            return Response({
                'status': 'added',
                'membership': TeamMembershipSerializer(membership).data
            })
        except User.DoesNotExist:
            # User doesn't exist - create invitation
            invitation, created = TeamInvitation.objects.update_or_create(
                team=team,
                email=email,
                defaults={
                    'role': role,
                    'token': secrets.token_urlsafe(32),
                    'invited_by': request.user,
                    'status': TeamInvitation.Status.PENDING,
                    'expires_at': timezone.now() + timedelta(days=7),
                }
            )
            # TODO: Send invitation email here
            return Response({
                'status': 'invited',
                'invitation': TeamInvitationSerializer(invitation).data
            }, status=201 if created else 200)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """
        Allow org admin to explicitly join a team.
        Required for write access to team's threat models.
        """
        team = self.get_object()
        user = request.user

        # Verify user is org member
        if not team.organization.members.filter(user=user).exists():
            return Response({'error': 'Not a member of this organization'}, status=403)

        membership, created = TeamMembership.objects.get_or_create(
            team=team,
            user=user,
            defaults={'role': TeamMembership.Role.MEMBER}
        )

        return Response({
            'joined': created,
            'membership': TeamMembershipSerializer(membership).data
        })


class MagicLinkViewSet(viewsets.ModelViewSet):
    serializer_class = MagicLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MagicLink.objects.filter(
            threat_model__organization__members__user=self.request.user
        )

    def perform_create(self, serializer):
        import secrets
        from datetime import timedelta
        serializer.save(
            token=secrets.token_urlsafe(32),
            created_by=self.request.user,
            expires_at=timezone.now() + timedelta(days=30)
        )
```

C. Public Magic Link View (no auth required)

```python
class MagicLinkAccessView(APIView):
    permission_classes = []  # No auth required

    def get(self, request, token):
        try:
            link = MagicLink.objects.select_related(
                'threat_model', 'threat_model__organization'
            ).get(token=token)
        except MagicLink.DoesNotExist:
            return Response({'error': 'Invalid link'}, status=404)

        if not link.is_valid():
            return Response({'error': 'Link expired or revoked'}, status=410)

        link.accessed_count += 1
        link.save(update_fields=['accessed_count'])

        # Return read-only threat model data
        from apps.diagrams.serializers import ThreatModelDetailSerializer
        serializer = ThreatModelDetailSerializer(link.threat_model)
        return Response({
            'threat_model': serializer.data,
            'read_only': True,
            'expires_at': link.expires_at,
        })


class TeamInvitationViewSet(viewsets.ModelViewSet):
    """Manage team invitations (for admins/leads)."""
    serializer_class = TeamInvitationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Show invitations for teams user can manage."""
        return TeamInvitation.objects.filter(
            team__memberships__user=self.request.user,
            team__memberships__role='lead'
        ).select_related('team', 'team__organization', 'invited_by')

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke a pending invitation."""
        invitation = self.get_object()
        if invitation.status != TeamInvitation.Status.PENDING:
            return Response({'error': 'Can only revoke pending invitations'}, status=400)

        invitation.status = TeamInvitation.Status.REVOKED
        invitation.save(update_fields=['status'])
        return Response({'status': 'revoked'})


class TeamInvitationAcceptView(APIView):
    """
    Accept a team invitation.
    - If user is logged in: accepts immediately
    - If user is not logged in: returns invitation details for signup flow
    """
    permission_classes = []  # No auth required to view invitation

    def get(self, request, token):
        """Get invitation details (for signup/login page)."""
        try:
            invitation = TeamInvitation.objects.select_related(
                'team', 'team__organization'
            ).get(token=token)
        except TeamInvitation.DoesNotExist:
            return Response({'error': 'Invalid invitation'}, status=404)

        if not invitation.is_valid():
            return Response({'error': 'Invitation expired or already used'}, status=410)

        return Response({
            'invitation': TeamInvitationSerializer(invitation).data,
            'requires_signup': not request.user.is_authenticated,
        })

    def post(self, request, token):
        """Accept the invitation (requires authentication)."""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Must be logged in to accept invitation'},
                status=401
            )

        try:
            invitation = TeamInvitation.objects.select_related('team').get(token=token)
        except TeamInvitation.DoesNotExist:
            return Response({'error': 'Invalid invitation'}, status=404)

        if not invitation.is_valid():
            return Response({'error': 'Invitation expired or already used'}, status=410)

        # Verify email matches (optional security check)
        if invitation.email.lower() != request.user.email.lower():
            return Response(
                {'error': 'Invitation was sent to a different email address'},
                status=403
            )

        # Accept invitation - creates TeamMembership
        membership = invitation.accept(request.user)

        # Also add to organization if not already a member
        OrganizationMember.objects.get_or_create(
            organization=invitation.team.organization,
            user=request.user,
            defaults={'role': OrganizationMember.Role.VIEWER}
        )

        return Response({
            'status': 'accepted',
            'membership': TeamMembershipSerializer(membership).data
        })
```

D. URL Configuration (/urls.py)

```python
router = DefaultRouter()
router.register(r"organizations", OrganizationViewSet, basename="organization")
router.register(r"memberships", OrganizationMemberViewSet, basename="membership")
router.register(r"business-units", BusinessUnitViewSet, basename="business-unit")
router.register(r"teams", TeamViewSet, basename="team")
router.register(r"magic-links", MagicLinkViewSet, basename="magic-link")
router.register(r"team-invitations", TeamInvitationViewSet, basename="team-invitation")

urlpatterns = [
    path("", include(router.urls)),
    path("share/<str:token>/", MagicLinkAccessView.as_view(), name="magic-link-access"),
    path("invite/<str:token>/", TeamInvitationAcceptView.as_view(), name="invitation-accept"),
]
```

5.4 Phase 3: Auto-Provisioning (Backend)

Location: /backend/apps/organizations/signals.py

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(post_save, sender=User)
def create_personal_workspace(sender, instance, created, **kwargs):
    """
    Auto-provision Personal Organization and Team for new users.
    Implements "Zero-Config" mode from section 2.
    """
    if not created:
        return

    # Skip if user already has an organization (e.g., invited to existing org)
    if instance.organization_memberships.exists():
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
```

B. Shadow User Merge Utility

Location: /backend/apps/organizations/utils.py

```python
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


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
    from apps.diagrams.models import ThreatModel, DFD
    from apps.threats.models import (
        ComponentInstanceCountermeasure,
        FlowInstanceCountermeasure,
    )

    stats = {
        'team_memberships': 0,
        'org_memberships': 0,
        'threat_models': 0,
        'dfds': 0,
        'countermeasures': 0,
    }

    shadow_django_user = shadow_user.user

    # 1. Transfer team memberships
    for membership in TeamMembership.objects.filter(user=shadow_django_user):
        # Check if real user already has this membership
        existing = TeamMembership.objects.filter(
            team=membership.team,
            user=real_user
        ).first()

        if existing:
            # Keep the better role (lead > member > viewer)
            role_priority = {'lead': 3, 'member': 2, 'viewer': 1}
            if role_priority.get(membership.role, 0) > role_priority.get(existing.role, 0):
                existing.role = membership.role
                existing.save(update_fields=['role'])
            membership.delete()
        else:
            membership.user = real_user
            membership.save(update_fields=['user'])
            stats['team_memberships'] += 1

    # 2. Transfer organization memberships
    for org_membership in OrganizationMember.objects.filter(user=shadow_django_user):
        existing = OrganizationMember.objects.filter(
            organization=org_membership.organization,
            user=real_user
        ).first()

        if existing:
            # Keep the better role
            role_priority = {'admin': 4, 'security_team': 3, 'champion': 2, 'viewer': 1}
            if role_priority.get(org_membership.role, 0) > role_priority.get(existing.role, 0):
                existing.role = org_membership.role
                existing.save(update_fields=['role'])
            org_membership.delete()
        else:
            org_membership.user = real_user
            org_membership.save(update_fields=['user'])
            stats['org_memberships'] += 1

    # 3. Transfer threat model ownership
    stats['threat_models'] = ThreatModel.objects.filter(
        created_by=shadow_django_user
    ).update(created_by=real_user)

    # 4. Transfer DFD ownership
    stats['dfds'] = DFD.objects.filter(
        updated_by=shadow_django_user
    ).update(updated_by=real_user)

    # 5. Transfer countermeasure assignments
    stats['countermeasures'] += ComponentInstanceCountermeasure.objects.filter(
        assigned_owner=shadow_django_user
    ).update(assigned_owner=real_user)

    stats['countermeasures'] += ComponentInstanceCountermeasure.objects.filter(
        verified_by=shadow_django_user
    ).update(verified_by=real_user)

    stats['countermeasures'] += FlowInstanceCountermeasure.objects.filter(
        assigned_owner=shadow_django_user
    ).update(assigned_owner=real_user)

    stats['countermeasures'] += FlowInstanceCountermeasure.objects.filter(
        verified_by=shadow_django_user
    ).update(verified_by=real_user)

    # 6. Mark shadow user as converted
    shadow_user.status = ShadowUser.Status.CONVERTED
    shadow_user.converted_at = timezone.now()
    shadow_user.save(update_fields=['status', 'converted_at'])

    # 7. Delete the temporary Django user (shadow_user FK will be updated first)
    shadow_user.user = real_user  # Point to real user before deleting temp user
    shadow_user.save(update_fields=['user'])
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
        user__email=user.email
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
        expires_at__gt=timezone.now()
    )

    accepted_count = 0
    for invitation in pending_invitations:
        invitation.accept(user)
        # Also add to organization
        OrganizationMember.objects.get_or_create(
            organization=invitation.team.organization,
            user=user,
            defaults={'role': OrganizationMember.Role.VIEWER}
        )
        accepted_count += 1

    return accepted_count
```

C. Integration with Auth Flow

Location: /backend/apps/organizations/signals.py (additional signal)

```python
from allauth.account.signals import user_logged_in, user_signed_up
from .utils import check_and_merge_shadow_on_login, check_and_accept_invitations_on_login


@receiver(user_signed_up)
@receiver(user_logged_in)
def handle_user_auth(sender, request, user, **kwargs):
    """
    On login/signup:
    1. Merge any shadow user data
    2. Auto-accept pending team invitations
    """
    check_and_merge_shadow_on_login(user)
    check_and_accept_invitations_on_login(user)
```

5.5 Phase 4: Frontend Types

Location: /frontend/src/types/organization.ts

```typescript
// Role types
export type OrganizationRole = 'admin' | 'security_team' | 'champion' | 'viewer'
export type TeamRole = 'lead' | 'member' | 'viewer'

// Organization
export interface Organization {
  id: number
  name: string
  domain: string
  plan: 'free' | 'pro' | 'enterprise'
  businessUnitLabel: string  // Custom label for grouping layer
  memberCount: number
  createdAt: string
  updatedAt: string
}

// Business Unit (flexible grouping layer)
export interface BusinessUnit {
  id: number
  organization: number
  name: string
  code: string
  description: string
  parent: number | null
  teamCount: number
  createdAt: string
}

// Team
export interface Team {
  id: number
  organization: number
  businessUnit: number | null
  businessUnitName: string | null
  name: string
  code: string
  description: string
  memberCount: number
  isDefault: boolean
  createdAt: string
}

// Memberships
export interface OrganizationMembership {
  id: number
  organization: number
  organizationName: string
  user: number
  userEmail: string
  role: OrganizationRole
  joinedAt: string
}

export interface TeamMembership {
  id: number
  team: number
  teamName: string
  user: number
  userEmail: string
  role: TeamRole
  joinedAt: string
}

// Magic Link
export interface MagicLink {
  id: string
  threatModel: number
  token: string
  url: string
  expiresAt: string
  accessedCount: number
  isRevoked: boolean
  createdAt: string
}

// Extended User (update AuthContext)
export interface User {
  pk: number
  email: string
  organizations: OrganizationMembership[]
  teams: TeamMembership[]
  currentOrganization: Organization | null
  currentTeam: Team | null
}
```

5.6 Phase 5: Frontend API Hooks

Location: /frontend/src/api/organizations.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Organization, BusinessUnit, Team, TeamMembership, MagicLink } from '@/types/organization'

// Query keys
export const organizationKeys = {
  all: ['organizations'] as const,
  list: () => [...organizationKeys.all, 'list'] as const,
  detail: (id: number) => [...organizationKeys.all, 'detail', id] as const,
  businessUnits: (orgId: number) => [...organizationKeys.all, orgId, 'business-units'] as const,
  teams: (orgId: number) => [...organizationKeys.all, orgId, 'teams'] as const,
}

export const teamKeys = {
  all: ['teams'] as const,
  list: () => [...teamKeys.all, 'list'] as const,
  detail: (id: number) => [...teamKeys.all, 'detail', id] as const,
  members: (id: number) => [...teamKeys.all, id, 'members'] as const,
}

// Organization queries
export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: () => api.get<{ results: Organization[] }>('/organizations/'),
  })
}

export function useOrganization(id: number) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: () => api.get<Organization>(`/organizations/${id}/`),
    enabled: id > 0,
  })
}

// Team queries
export function useTeams(organizationId?: number) {
  return useQuery({
    queryKey: teamKeys.list(),
    queryFn: async () => {
      const url = organizationId
        ? `/teams/?organization=${organizationId}`
        : '/teams/'
      const response = await api.get<{ results: Team[] }>(url)
      return response.results
    },
  })
}

export function useTeamMembers(teamId: number) {
  return useQuery({
    queryKey: teamKeys.members(teamId),
    queryFn: () => api.get<TeamMembership[]>(`/teams/${teamId}/members/`),
    enabled: teamId > 0,
  })
}

// Team mutations
export function useAddTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId, role }: { teamId: number; userId: number; role: string }) =>
      api.post(`/teams/${teamId}/add_member/`, { user_id: userId, role }),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(teamId) })
    },
  })
}

// Magic link mutations
export function useCreateMagicLink() {
  return useMutation({
    mutationFn: (threatModelId: number) =>
      api.post<MagicLink>('/magic-links/', { threat_model: threatModelId }),
  })
}

export function useRevokeMagicLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) =>
      api.patch(`/magic-links/${linkId}/`, { is_revoked: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['magic-links'] })
    },
  })
}
```

5.7 Phase 6: Frontend Components

A. Organization/Team Context

Location: /frontend/src/contexts/WorkspaceContext.tsx

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useOrganizations, useTeams } from '@/api/organizations'
import type { Organization, Team } from '@/types/organization'

interface WorkspaceContextType {
  organizations: Organization[]
  currentOrganization: Organization | null
  setCurrentOrganization: (org: Organization) => void
  teams: Team[]
  currentTeam: Team | null
  setCurrentTeam: (team: Team) => void
  isMultiOrg: boolean  // For progressive disclosure
  isMultiTeam: boolean
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: orgsData } = useOrganizations()
  const organizations = orgsData?.results ?? []

  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)

  const { data: teams = [] } = useTeams(currentOrganization?.id)
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)

  // Auto-select first org/team
  useEffect(() => {
    if (organizations.length > 0 && !currentOrganization) {
      setCurrentOrganization(organizations[0])
    }
  }, [organizations])

  useEffect(() => {
    if (teams.length > 0 && !currentTeam) {
      const defaultTeam = teams.find(t => t.isDefault) ?? teams[0]
      setCurrentTeam(defaultTeam)
    }
  }, [teams])

  return (
    <WorkspaceContext.Provider value={{
      organizations,
      currentOrganization,
      setCurrentOrganization,
      teams,
      currentTeam,
      setCurrentTeam,
      isMultiOrg: organizations.length > 1,
      isMultiTeam: teams.length > 1,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return context
}
```

B. Team Switcher Component (Progressive Disclosure)

Location: /frontend/src/components/layout/TeamSwitcher.tsx

```typescript
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, Users } from 'lucide-react'

export function TeamSwitcher() {
  const { teams, currentTeam, setCurrentTeam, isMultiTeam } = useWorkspace()

  // Progressive disclosure: hide if only one team
  if (!isMultiTeam) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          {currentTeam?.name ?? 'Select Team'}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Team</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onSelect={() => setCurrentTeam(team)}
            className={currentTeam?.id === team.id ? 'bg-accent' : ''}
          >
            {team.name}
            {team.businessUnitName && (
              <span className="ml-auto text-xs text-muted-foreground">
                {team.businessUnitName}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

C. Magic Link Share Dialog

Location: /frontend/src/components/sharing/MagicLinkDialog.tsx

```typescript
import { useState } from 'react'
import { useCreateMagicLink } from '@/api/organizations'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, Link } from 'lucide-react'

interface MagicLinkDialogProps {
  threatModelId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MagicLinkDialog({ threatModelId, open, onOpenChange }: MagicLinkDialogProps) {
  const [copied, setCopied] = useState(false)
  const { mutate: createLink, data: magicLink, isPending } = useCreateMagicLink()

  const handleCreate = () => {
    createLink(threatModelId)
  }

  const handleCopy = () => {
    if (magicLink?.url) {
      navigator.clipboard.writeText(`${window.location.origin}${magicLink.url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Threat Model</DialogTitle>
          <DialogDescription>
            Create a read-only link to share with stakeholders. Link expires in 30 days.
          </DialogDescription>
        </DialogHeader>

        {!magicLink ? (
          <Button onClick={handleCreate} disabled={isPending}>
            <Link className="mr-2 h-4 w-4" />
            {isPending ? 'Creating...' : 'Create Share Link'}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Input
              readOnly
              value={`${window.location.origin}${magicLink.url}`}
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

5.8 Phase 7: Routes & Navigation Updates

A. Add Settings Routes

Location: /frontend/src/routes.tsx (additions)

```typescript
// Add these routes inside the protected Layout children:
{ path: 'settings', element: <SettingsLayout />, children: [
  { index: true, element: <Navigate to="profile" replace /> },
  { path: 'profile', element: <ProfileSettings /> },
  { path: 'organization', element: <OrganizationSettings /> },
  { path: 'members', element: <MemberManagement /> },
  { path: 'teams', element: <TeamManagement /> },
]},

// Add public magic link route (outside protected routes):
{ path: 'share/:token', element: <SharedThreatModelView /> },
```

B. Update Navbar

Location: /frontend/src/components/layout/Navbar.tsx (additions)

```typescript
// Add TeamSwitcher to navbar (with progressive disclosure)
import { TeamSwitcher } from './TeamSwitcher'

// In the navbar JSX, add after logo:
<TeamSwitcher />

// Update Profile/Settings menu items:
<DropdownMenuItem asChild>
  <Link to="/settings/profile">
    <User className="mr-2 h-4 w-4" />
    Profile
  </Link>
</DropdownMenuItem>
<DropdownMenuItem asChild>
  <Link to="/settings/organization">
    <Settings className="mr-2 h-4 w-4" />
    Settings
  </Link>
</DropdownMenuItem>
```

5.9 Migration Strategy

Step 1: Database migrations (non-breaking)
```bash
python manage.py makemigrations organizations --name add_business_unit_team_models
python manage.py migrate
```

Step 2: Data migration for existing threat models
```python
# Migration: Assign existing threat models to auto-created teams
def migrate_threat_models(apps, schema_editor):
    ThreatModel = apps.get_model('diagrams', 'ThreatModel')
    Team = apps.get_model('organizations', 'Team')

    for tm in ThreatModel.objects.filter(owning_team__isnull=True):
        # Find or create default team for this org
        team, _ = Team.objects.get_or_create(
            organization=tm.organization,
            is_default=True,
            defaults={'name': 'Default Team'}
        )
        tm.owning_team = team
        tm.save(update_fields=['owning_team'])
```

Step 3: Frontend deployment
- Deploy new types and API hooks
- Deploy WorkspaceContext
- Deploy TeamSwitcher (hidden by progressive disclosure for single-team users)
- Deploy settings pages

Step 4: Enable features progressively
- Magic links: Feature flag or plan-based
- Business units: Enterprise plan only

5.10 Testing Checklist

Backend:
- [ ] BusinessUnit CRUD operations
- [ ] Team CRUD operations
- [ ] TeamMembership many-to-many relationships
- [ ] User can belong to multiple teams
- [ ] Auto-provisioning on user registration
- [ ] MagicLink creation and validation
- [ ] MagicLink expiration enforcement
- [ ] Organization-scoped query filtering

Team Invitations:
- [ ] TeamInvitation created for non-existent user email
- [ ] TeamInvitation converts to TeamMembership when user registers
- [ ] Existing user added directly via invite_member (no invitation created)
- [ ] Invitation expiration enforced
- [ ] Invitation revocation works
- [ ] Duplicate invitations handled (update_or_create)

Shadow User Merge:
- [ ] merge_shadow_user transfers all team memberships
- [ ] merge_shadow_user transfers organization memberships
- [ ] merge_shadow_user re-assigns threat model ownership
- [ ] merge_shadow_user re-assigns countermeasure assignments
- [ ] Role conflicts resolved (keeps better role)
- [ ] Shadow user marked as CONVERTED after merge
- [ ] Temporary Django user deleted after merge
- [ ] Auto-merge triggered on login/signup signal

Permission Scope:
- [ ] Org admin can LIST all teams in org (read visibility)
- [ ] Org admin can RETRIEVE team details (read visibility)
- [ ] Org admin CANNOT update/delete team without explicit membership
- [ ] Team member with 'lead' role can update team
- [ ] Team member with 'member' role can update team
- [ ] Team member with 'viewer' role CANNOT update team
- [ ] Org admin can use /join endpoint to add themselves to team

Frontend:
- [ ] WorkspaceContext loads organizations and teams
- [ ] TeamSwitcher hidden when user has one team (progressive disclosure)
- [ ] TeamSwitcher visible and functional with multiple teams
- [ ] MagicLink creation and copy-to-clipboard
- [ ] SharedThreatModelView renders read-only
- [ ] Settings pages render and save correctly
- [ ] Invitation flow: send invite, user receives, user accepts

Integration:
- [ ] New user gets Personal Org + Team automatically
- [ ] Invited user joins existing org without creating personal workspace
- [ ] Threat models scoped to current team
- [ ] Magic links work for anonymous visitors
- [ ] User with pending invitation auto-joins team on signup
- [ ] Shadow user data preserved and merged on registration
