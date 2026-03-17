# STATUS - OPEN

# Org/Team Dashboard Scoping Issues

**Date:** 2026-03-17

---

## Problem

The dashboard shows fewer threat models than expected. Admin users with `security_team` role see only a subset of their org's models.

Two root causes:

### 1. No org switcher in the UI

Users who belong to multiple organizations have no way to switch between them. The current org is auto-selected on login (first org returned by the API) and silently persisted to `localStorage`. There's no visible indicator of which org is active, and no UI to change it.

This means a user in both "admin@precogly.dev's Workspace" and "Precogly" gets whichever org loads first, with no way to see the other org's threat models.

### 2. Cross-org team assignment on threat model creation

When creating a threat model, the frontend assigns `owning_team` from `currentTeam` in WorkspaceContext. If the user creates a model in org B while their `currentTeam` belongs to org A, the model gets a cross-org team assignment.

Example from current data: 3 threat models in Precogly (org 5) have `owning_team_id=2` ("My Team" from org 2). The `owning_team` filter then hides these models because team 2 doesn't belong to org 5.

### 3. DashboardStatsView missing security_team bypass

`ThreatModelViewSet.get_queryset` has a `security_team` role bypass — security team members see all threat models in their orgs. `DashboardStatsView` was never updated to match, so the stats card can show a different count than the table.

---

## Recommended Fix

### A. Add org switcher to the UI

- Add an org selector in the sidebar or header (similar to the existing TeamSwitcher)
- Show the current org name visibly so the user knows which workspace they're in
- When switching orgs, clear the current team and re-fetch teams for the new org (WorkspaceContext already does this via the `useEffect` on `currentOrganization`)

### B. Move org/team context to the backend

Replace `localStorage` persistence with a backend-driven default:

- Add `default_organization` field on the user model (or on `OrganizationMember`)
- On login, the API returns the user's default org
- Org/team selection during a session can still be client-side state, but the initial default comes from the server

### C. Validate owning_team on threat model creation

In `ThreatModelViewSet.perform_create` (or the serializer), validate that `owning_team` belongs to the same org as the threat model. Reject or clear cross-org assignments.

### D. Add security_team bypass to DashboardStatsView

Match the logic in `ThreatModelViewSet.get_queryset`:

```python
# In DashboardStatsView.get():
if user.organization_memberships.filter(role="security_team").exists():
    threat_models = ThreatModel.objects.filter(organization_id__in=org_ids)
else:
    # existing team-based filtering
```

---

## Files Involved

- `frontend/src/contexts/WorkspaceContext.tsx` — org/team selection and localStorage persistence
- `frontend/src/components/layout/TeamSwitcher.tsx` — team dropdown (org switcher doesn't exist yet)
- `backend/apps/core/views.py` — `DashboardStatsView` (missing security_team bypass)
- `backend/apps/threat_models/views.py` — `ThreatModelViewSet.get_queryset` (has security_team bypass), `perform_create` (no owning_team validation)
