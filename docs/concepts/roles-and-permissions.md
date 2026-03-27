# Roles and Permissions

Precogly uses role-based access control at two levels — organization and team — to determine who can view, edit, and manage threat models and members.

## Team roles

|                                                    | Lead | Member | Viewer |
|----------------------------------------------------|------|--------|--------|
| View team's threat models                          | Yes  | Yes    | Yes    |
| Create/edit threat models                          | Yes  | Yes    | No     |
| Edit components, threats, countermeasures           | Yes  | Yes    | No     |
| Manage team members (invite, remove, change roles) | Yes  | No     | No     |

Additionally, **Security Team** (org-level role) bypasses all team-level checks — they get unconditional write access across the entire organization regardless of team membership.

!!! note "Coming soon"
    This page will cover:

    - Org-level roles: Security Team and Member
    - Threat model visibility rules
    - Inviting members via email (token-based, 7-day expiry)
    - Adding existing org members to teams and self-joining
    - Auto-provisioning on signup (primary org + default team)
    - Auto-accept invitations on login
    - Changing roles and removing members
