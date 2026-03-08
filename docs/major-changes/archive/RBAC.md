# Role-Based Access Control (RBAC)

> **Pre-release code.** All data in the system is test data. Destructive migrations and schema resets are acceptable.
>
> **Environment.** The Python backend must be invoked using the project's available venv.

## Context

Precogly is an open-source threat modeling tool. Organizations self-host via Docker. The current permission model is effectively flat — any authenticated user can import/unimport library packs, modify shared library data, and access any threat model within the org. This document defines the RBAC model needed for real organizational use.

A hosted demo instance will also be maintained for prospective users to take a quick tour without doing the Docker install. The RBAC rules apply identically to the demo — the demo is simply a hosted instance with pre-imported packs.

## Requirements

### R1. Pack management is restricted to security team
Regular users must not be able to import, unimport, or sync library packs. Only security team members can perform these operations. All users can browse and preview packs (both installed and available from source) in read-only mode.

### R2. Single organization per installation
All users who sign up on an instance belong to one organization. The system creates this organization during initial setup (data migration). New user signups are auto-routed into this organization rather than creating personal workspaces.

### R3. Users can create teams and threat models
Any authenticated user can create threat models and teams. The threat model creator becomes the owner. They can add team members with specific sub-roles to collaborate on the threat model.

### R4. Threat models are visible only to team members
A threat model is visible and editable only to members of its owning team. Outsiders can view a threat model in read-only mode only if given a magic link. Security team members can view all threat models across the organization for oversight.

### R5. Library data is read-only for regular users
Library viewsets (`ComponentLibrary`, `ThreatLibrary`, `CountermeasureLibrary`, `DFDTemplatesLibrary`, `StandardFramework`) are browsable by all authenticated users. Write operations on library data (create, update, delete) are restricted to the security team. This includes compliance framework and taxonomy management.

## Role Model

### Access Tiers

There are three access tiers, two of which are org-level roles stored in `OrganizationMember.role`:

| Tier | Stored as | Description |
|------|-----------|-------------|
| **Super-Admin** | Django `is_staff=True`, `is_superuser=True` | Access to the Django admin panel with unrestricted power over all models. Not represented in the application's role enum. Typically the person who runs the Docker install. |
| **Security Team** | `OrganizationMember.Role.SECURITY_TEAM` | Org-level administrators of the tool. Can manage packs, library data, org settings, users, and all threat models. Can also create their own threat models and teams — everything a regular user can do. Multiple security team members per org are supported. |
| **Regular User** | `OrganizationMember.Role.MEMBER` | Creates threat models and teams. Adds members to teams. Browses library packs and library data in read-only mode. Works on threat models they have team access to. |
| **Anonymous** | No stored role (unauthenticated) | Accesses threat models via magic link tokens for read-only viewing. Already implemented via `MagicLinkAccessView` with no auth requirement. No changes needed. |

The current four org roles (`ADMIN`, `SECURITY_TEAM`, `CHAMPION`, `VIEWER`) are replaced by two: `SECURITY_TEAM` and `MEMBER`.

### Team-Level Sub-Roles

Within a team, members have one of three roles stored in `TeamMembership.role`. These govern what a user can do on that team's threat models, regardless of their org-level role:

| Role | Value | Capabilities |
|------|-------|-------------|
| **Team Lead** | `lead` | Full control: edit/delete threat models, manage team membership (add/remove/invite members, change roles), all diagram and analysis operations |
| **Member** | `member` | Edit threat models owned by the team: create/modify DFDs, components, threats, countermeasures, risks, data assets. Cannot manage team membership or delete threat models |
| **Viewer** | `viewer` | Read-only access to the team's threat models. Can browse but not modify any data |

### How the two layers interact

The org role determines *what you can access across the org*. The team role determines *what you can do within a specific team's threat models*.

| Org Role | Team Role | Result |
|----------|-----------|--------|
| Security Team | any/none | Full read/write access to all threat model data org-wide via `CanWrite` bypass. Pack and library management. Org settings. **Team management** (add/remove members, invitations) requires explicit team membership — security team members must join a team to manage it. |
| Member | `lead` | Full control on that team's threat models. Manage team membership. |
| Member | `member` | Edit that team's threat models. Cannot manage team membership. |
| Member | `viewer` | Read-only on that team's threat models. |
| Member | not on team | Cannot see the team's threat models. |
| Anonymous | N/A | Read-only on a specific threat model via magic link token. |

## Current State vs Required Changes

### What already exists
- `OrganizationMember.Role` enum: `ADMIN`, `SECURITY_TEAM`, `CHAMPION`, `VIEWER` (to be replaced)
- `TeamMembership.Role` enum: `LEAD`, `MEMBER`, `VIEWER` (no changes needed)
- `CanWrite` permission class enforces team-level write gating on instance data (threat models, components, threats, countermeasures, risks, DFDs)
- Django admin is already configured with all models registered — super-admin access works out of the box
- Magic link access for anonymous users is fully implemented

### What needs to change

#### 1. Replace org-level role enum

Change `OrganizationMember.Role` from four roles to two:

```python
class Role(models.TextChoices):
    SECURITY_TEAM = "security_team", "Security Team"
    MEMBER = "member", "Member"
```

This requires a schema migration. Existing data with `ADMIN`, `CHAMPION`, or `VIEWER` roles must be migrated:
- `ADMIN` → `SECURITY_TEAM`
- `SECURITY_TEAM` → `SECURITY_TEAM` (unchanged)
- `CHAMPION` → `MEMBER`
- `VIEWER` → `MEMBER`

The default role for new users becomes `MEMBER`.

**Code locations that hardcode old role values (must be updated alongside the enum change):**

| File | Line | Current value | New value |
|------|------|---------------|-----------|
| `organizations/models.py` | 57 | `default=Role.VIEWER` | `default=Role.MEMBER` |
| `organizations/signals.py` | 59 | `role=OrganizationMember.Role.ADMIN` | `role=OrganizationMember.Role.SECURITY_TEAM` (or `MEMBER` depending on context) |
| `organizations/utils.py` | 32 | `defaults={"role": OrganizationMember.Role.VIEWER}` | `defaults={"role": OrganizationMember.Role.MEMBER}` |
| `organizations/views.py` | ~72 | `role=OrganizationMember.Role.ADMIN` (in `perform_create`) | `role=OrganizationMember.Role.SECURITY_TEAM` |
| `frontend/src/types/organization.ts` | 6 | `'admin' \| 'security_team' \| 'champion' \| 'viewer'` | `'security_team' \| 'member'` |

#### 2. Update `CanWrite` permission class

Current behavior: `CanWrite` grants unconditional write access to any non-viewer org role (`admin`, `security_team`, `champion`). For `viewer`, it falls through to team-role checks.

New behavior: `CanWrite` should grant unconditional write access to `SECURITY_TEAM`. For `MEMBER`, enforce team-role checks (same logic currently applied to `viewer`).

```
# Current logic (core/permissions.py, has_object_permission)
if org_membership.role != "viewer":
    return True  # admin, security_team, champion all pass

# New logic
if org_membership.role == OrganizationMember.Role.SECURITY_TEAM:
    return True  # only security team gets unconditional write
# For MEMBER, fall through to team-role checks
```

**Note:** `CanWrite.has_permission` (the request-level gate) only checks `is_authenticated` — it does not check roles. This means `create` actions (POST to list endpoints) bypass team-role checks entirely, since DRF only calls `has_object_permission` on `get_object()` (update/delete). This is a pre-existing gap. To fully enforce team-role gating on create, `has_permission` would need to inspect the request body for the target team/threat model and validate team membership. Address this if convenient during implementation.

#### 3. Create `IsSecurityTeam` permission class

A new permission class for gating pack, library, and org-management operations:

```python
class IsSecurityTeam(permissions.BasePermission):
    """
    Restricts write operations to security team members.
    Read operations are allowed for all authenticated users.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        return request.user.organization_memberships.filter(
            role="security_team",
        ).exists()
```

#### 4. Gate pack operations

`LibraryPackViewSet` currently uses only `IsAuthenticated`. Apply `IsSecurityTeam` to mutating actions:

| Action | Method | Current | Required |
|--------|--------|---------|----------|
| `sync_from_source` | POST | `IsAuthenticated` | `IsSecurityTeam` |
| `import_single` | POST | `IsAuthenticated` | `IsSecurityTeam` |
| `unimport` | DELETE | `IsAuthenticated` | `IsSecurityTeam` |
| `validate` | POST | `IsAuthenticated` | `IsSecurityTeam` |

Read-only actions (`list`, `retrieve`, `preview`, `preview_from_source`, `available_from_source`, `available_overlays`, `check_dependencies`) remain open to all authenticated users.

#### 5. Gate library write operations

These viewsets currently allow any authenticated user to create/update/delete shared library data. Apply `IsSecurityTeam`:

| ViewSet | Current | Required |
|---------|---------|----------|
| `ComponentLibraryViewSet` | `IsAuthenticated` (full CRUD) | Read: all. Write: `IsSecurityTeam` |
| `ThreatLibraryViewSet` | `IsAuthenticated` (full CRUD) | Read: all. Write: `IsSecurityTeam` |
| `CountermeasureLibraryViewSet` | `IsAuthenticated` (full CRUD) | Read: all. Write: `IsSecurityTeam` |
| `ComponentLibraryThreatViewSet` | `IsAuthenticated` (full CRUD) | Read: all. Write: `IsSecurityTeam` |
| `StandardFrameworkViewSet` | `IsAuthenticated` (full CRUD) | Read: all. Write: `IsSecurityTeam` |
| `StandardRequirementViewSet` | `IsAuthenticated` (full CRUD) | Read: all. Write: `IsSecurityTeam` |
| `CountermeasureLibraryStandardViewSet` | `IsAuthenticated` (full CRUD) | Read: all. Write: `IsSecurityTeam` |

#### 6. Gate org management actions

In `OrganizationViewSet`, these actions need `IsSecurityTeam`:
- `create` — in a single-org-per-instance model, regular users should not create new organizations
- `add_member`, `remove_member` — manage org membership
- `update`, `partial_update` — change org settings (name, domain, business unit label)
- `destroy` — delete the org

`BusinessUnitViewSet` should also be gated with `IsSecurityTeam` — business units are org-level structure managed by security team, not regular users.

Currently any authenticated org member can call all of these.

#### 7. Single-org user routing

Modify the `create_personal_workspace` signal in `organizations/signals.py`:

- Look up the installation's org using an `is_primary=True` flag on the `Organization` model (add a `BooleanField` with `default=False` and a unique constraint where `is_primary=True`). This avoids name-based lookups which have no uniqueness guarantee.
- Add the user as `MEMBER` org role + default team membership with `MEMBER` team role
- Fall back to personal workspace creation if no primary org exists (for fresh installs before initial setup)
- Preserve existing invitation flow — invited users still skip auto-routing

A data migration seeds the initial organization (with `is_primary=True`) and default team on first run.

#### 8. Threat model visibility for security team

`ThreatModelViewSet.get_queryset` currently filters by the user's team memberships. Add a bypass for security team members so they can see all threat models across the organization:

```python
def get_queryset(self):
    user = self.request.user
    org_ids = user.organization_memberships.values_list("organization_id", flat=True)

    # Security team sees all threat models in their org
    if user.organization_memberships.filter(role="security_team").exists():
        return ThreatModel.objects.filter(organization_id__in=org_ids)

    # Regular users see only their teams' threat models
    team_ids = user.team_memberships.values_list("team_id", flat=True)
    return ThreatModel.objects.filter(
        Q(owning_team_id__in=team_ids) | Q(owning_team__isnull=True),
        organization_id__in=org_ids,
    )
```

**Edge case:** A security team member who is not on any team can view and edit all threat models (via the queryset bypass + `CanWrite` security team bypass). If they *create* a threat model, `ThreatModelCreateSerializer` must handle assigning an `owning_team`. Options: require the team to be specified in the request body, or allow `owning_team=null` (unassigned) for security team members.

## Frontend Changes

- **Surface the current user's org role.** The current API does not provide a direct way to get the logged-in user's org role. `useOrganizations()` returns org metadata (name, plan) but not the user's role. `useOrganizationMembers(orgId)` returns all members. Options:
  - Add the current user's role to the `OrganizationSerializer` response (e.g., a `my_role` method field)
  - Add a `/me/` endpoint that returns the user's org role
  - Filter `useOrganizationMembers()` client-side (functional but wasteful for large orgs)
- Update `OrganizationRole` type in `frontend/src/types/organization.ts` from `'admin' | 'security_team' | 'champion' | 'viewer'` to `'security_team' | 'member'`
- Disable/hide import, unimport, and sync buttons in the Libraries page for non-security-team users
- Disable/hide library write actions (create/edit/delete) for non-security-team users
- Disable/hide org settings management for non-security-team users
- No changes needed for team management or threat model CRUD — those are governed by team roles, which the frontend already respects

## Demo Instance

The hosted demo instance uses the same RBAC model — it is simply a deployed instance with:
- A seeded organization ("Precogly Demo", `is_primary=True`) created via data migration
- Library packs pre-imported by the super-admin
- New signups auto-routed into the demo org as regular users (`MEMBER` role)
- The instance operator serves as both super-admin and security team member

No special demo-specific code paths are needed. The demo behaves identically to a self-hosted installation.

## Scope

### In scope
- Replace `OrganizationMember.Role` enum (4 roles → 2) with data migration
- Update all code locations that hardcode old role values (see table in section 1)
- Update `CanWrite` to enforce team-role checks for `MEMBER` (not just `VIEWER`)
- New `IsSecurityTeam` permission class
- Apply `IsSecurityTeam` to pack, library, compliance, org-management, and business unit viewsets
- Security team bypass in `ThreatModelViewSet.get_queryset`
- Add `is_primary` field to `Organization` model
- Data migration to seed the installation org
- Signal modification for single-org user routing
- Surface current user's org role to the frontend
- Frontend: update `OrganizationRole` type and role-based UI gating for security-team-only actions

### Out of scope (deferred)
- Org-scoped library data (FK on library models, composite unique constraints, org-scoped import pipeline) — not needed until multi-tenant SaaS
- Per-user data isolation within a shared org — not needed; team-level isolation via `CanWrite` is sufficient
- Audit logging — useful but orthogonal to RBAC; can be added independently
- `CanWrite.has_permission` enforcement on `create` actions — pre-existing gap, address separately if needed
- `IsTeamMember` bypass for security team — security team members must join a team to manage its membership; this is intentional

## Existing Gaps to Address Alongside RBAC

Several viewsets are missing `CanWrite` enforcement on instance data. These should be fixed as part of this work to ensure team-level write gating is consistent:

| ViewSet | Issue |
|---------|-------|
| `OutOfScopeItemViewSet` | No `CanWrite` — any org member can modify |
| `ThreatModelReferenceImageViewSet` | No `CanWrite` — any org member can upload/delete |
| `VerificationTestViewSet` | No `CanWrite` — any org member can modify |
| `ComponentDataAssetViewSet` | No `CanWrite` — any org member can modify |
| `DataFlowAssetViewSet` | No `CanWrite` — any org member can modify |
| `IntegrationSourceViewSet` | No `CanWrite` — any org member can modify |
| `ComponentInstanceCountermeasureStandardViewSet` | No `CanWrite` — any org member can modify |
| `FlowInstanceCountermeasureStandardViewSet` | No `CanWrite` — any org member can modify |
