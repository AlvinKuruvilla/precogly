# Workspace Data Cleanup

**Date:** 2026-02-28
**Status:** Proposed

---

## Problem

`ThreatModel.workspace_data` is a JSONField that mixes **definitional data** (what the system is, what's in scope) with **UI state** (progress checklists). Definitional data belongs in proper database columns and models — it's queryable, validated, and explicit in the schema.

### Current workspace_data inventory

```
workspace_data = {
  status:              ← REDUNDANT: duplicates ThreatModel.status
  criticality:         ← REDUNDANT: duplicates ThreatModel.criticality
  frameworks:          ← REDUNDANT: duplicates ThreatModelFramework
  currentVersion:      ← REDUNDANT: partially duplicates ThreatModel.version
  systemContext: {
    description:       ← REDUNDANT: duplicates ThreatModel.description
    assets: [...]      ← DEFINITIONAL: should be a model
    outOfScopeItems: [...]  ← DEFINITIONAL: should be a model
    scopeLocked:       ← DEFINITIONAL: should be a column
    scopeLockedAt:     ← DEFINITIONAL: should be a column
    integrations: {}   ← unused placeholder
    uploads: {}        ← unused placeholder
  },
  progressChecklist: [...]  ← UI STATE: stays here
}
```

**Why this matters:** You can't query "which threat models have scope locked?" or "list all scope assets across the org" because the data is buried in JSON. The frontend hook (`useWorkspaceThreatAnalysis`) writes redundant copies of fields that already exist on the model, creating sync bugs.

---

## Proposal

### Step 1: Stop duplicating existing fields

Stop writing `status`, `criticality`, `frameworks`, `description` into workspace_data. These already have proper DB columns. Frontend reads them from ThreatModel directly.

### Step 2: New columns on ThreatModel

```
scope_locked      BooleanField (default False)
scope_locked_at   DateTimeField (nullable)
```

### Step 3: Migrate workspace assets to DataAsset

Replace `workspace_data.systemContext.assets[]` with the existing `DataAsset` model (see decision in FIELD-ADDITIONS-FRONTEND.md). `DataAsset` already has `name`, `description`, `classification`, plus richer fields (`data_sensitivity`, `compliance_tags`, component associations via `ComponentDataAsset`). No new model needed — refactor `AssetsModal` to CRUD `DataAsset` records directly.

API: existing `/data-assets/` endpoints, filtered by `threat_model`.

**Prerequisite:** `ComponentDataAsset` (the join table linking components to data assets, with `encrypted` toggle) currently has no serializer or API endpoint. These must be created before asset unification can expose component-asset associations and the encrypted toggle in the UI. See FIELD-ADDITIONS-FRONTEND.md for the UI placement decision.

### Step 4: New model — OutOfScopeItem

Replace `workspace_data.systemContext.outOfScopeItems[]` with a proper model:

```
OutOfScopeItem
  - threat_model (FK → ThreatModel, CASCADE)
  - name (CharField)
  - reason (TextField)
```

API: `GET/POST /api/threat-models/{id}/out-of-scope-items/`, `PATCH/DELETE /api/out-of-scope-items/{id}/`

### Step 5: What stays in workspace_data

After cleanup:

```
workspace_data = {
  progressChecklist: [
    { id, label, checked, autoComputed }
  ]
}
```

Everything else is in proper DB columns/models.

**Bonus:** The `assets_defined` checklist item changes from `autoComputed: false` (manual checkbox) to `autoComputed: true` — computed as `DataAsset.objects.filter(threat_model=tm).exists()`. All checklist items become auto-computed.

**Decision: Auto-compute location.** The backend ThreatModel serializer injects auto-computed checklist values into `workspace_data.progressChecklist` before returning the response. The frontend treats auto-computed items as read-only — it never writes their `checked` value back. This keeps the source of truth server-side and avoids extra network calls.

---

## Frontend Changes

| Component | Change |
|---|---|
| `useWorkspaceThreatAnalysis` | Simplify — only manages `progressChecklist` via workspace_data. Everything else reads from ThreatModel fields and related models. |
| `SystemContextModal` | Calls ThreatModel PATCH for `scope_locked` instead of writing to workspace_data |
| `AssetsModal` | Calls `/data-assets/` CRUD endpoints instead of updating a JSON array (see FIELD-ADDITIONS-FRONTEND.md) |
| `OutOfScopeModal` | Calls `/out-of-scope-items/` CRUD endpoints instead of updating a JSON array |
| Backend serializer | Default `workspace_data` simplified to `{ "progressChecklist": [] }` only |

### Fix Required: WorkspaceStatus Alignment

The frontend `WorkspaceStatus` type (`'draft' | 'in_review' | 'approved' | 'archived'`) does not match the backend `ThreatModel.Status` choices (`draft`, `in_progress`, `pending_review`, `approved`, `archived` — which become `draft`, `inProgress`, `pendingReview`, `approved`, `archived` after camelCase conversion).

Since Step 1 removes the redundant `status` from workspace_data and reads it from `ThreatModel.status` directly, the frontend type must match. **Fix:** Change `WorkspaceStatus` to `'draft' | 'inProgress' | 'pendingReview' | 'approved' | 'archived'` and update `WORKSPACE_STATUS_CONFIG` accordingly.

**Save semantics change:** Currently everything batches into a single debounced PATCH to `workspace_data`. After this, scope operations become individual API calls. Use TanStack Query's `useMutation` with optimistic updates — actually more reliable than the debounced batch, which can lose data if the user navigates away during the debounce window.

---

## Impact

- 1 new table (OutOfScopeItem), 2 new columns on ThreatModel, 1 migration
- 1 new serializer + endpoint for ComponentDataAsset (prerequisite for Step 3)
- No changes to existing models (workspace_data field stays, just gets smaller)
- Backend serializer updated to inject auto-computed checklist values
- Frontend refactor of ~4 components
- Since all data is test data, no migration of existing workspace_data content needed — clean cut
