# Remove Status Dropdown, Versioning & Submit for Review

## Summary

Remove the 5-status dropdown, "Submit for Review" button, and the entire versioning system (version field, previous_version FK, trigger field, version dropdown). Do not replace them with anything. The existing Completion Status checklist on the Overview tab is the only progress indicator needed.

## Motivation

### Problem: Over-Engineered Status Workflow

The current system has a 5-status state machine (Draft → In Progress → Pending Review → Approved → Archived) and a "Submit for Review" button. In practice:

- **No transition validation** — users can jump from any status to any other
- **No edit restrictions** — Approved/Archived threat models are still fully editable
- **No review workflow** — no reviewer assignment, no approval action, no notifications
- **"Submit for Review" is identical to selecting "Pending Review" from the dropdown** — same PATCH call, same endpoint, same backend behavior
- The formal pipeline doesn't match how threat modeling actually works, even in regulated environments (European banks, DORA-compliant orgs). Teams discuss threats in meetings, agree informally, and track status through existing tools (Jira, Teams, Confluence)

### Problem: Half-Implemented Versioning

The versioning system is designed but not functional:

- Each version is a separate `ThreatModel` row linked via `previous_version` FK (linked list)
- The `trigger` field describes why a version was created (New System, Security Incident, Pen Test, etc.)
- The v1 dropdown **displays** previous versions but **cannot navigate to them**
- **No API endpoint exists to create a new version** or copy/snapshot data
- **Frontend/backend mismatch** on trigger values — backend has `pentest`, frontend has `compliance_review`, `periodic_review`, `other`
- Version field is a string on backend (`"1.0"`) but a number on frontend (`1`)
- `workspace_data` stores redundant version metadata (`currentVersion`, `previousVersions`) that duplicates the model-level fields

### Industry Precedent: PyTM

OWASP's PyTM — the most widely-used open-source threat modeling framework — has **no versioning and no status/completion tracking**. Versioning is delegated to Git. The only status-like concept is per-finding disposition (mitigated/transferred/avoided/accepted), not model lifecycle.

### The Completion Status Checklist Already Solves This

The Overview tab has a data-driven **Completion Status** checklist that auto-computes from the actual state of the threat model:

- Primary assets defined
- Components identified
- Trust boundaries identified
- Data flows defined
- Threats linked to components
- Threats linked to flows
- Owners assigned
- Countermeasures assigned

This is a better completeness indicator than any manual status label because:

- It reflects **reality**, not what someone clicked
- It tells the analyst **what's missing**, not just "done" or "not done"
- It gives auditors **evidence of thoroughness**, not just a status badge
- It cannot be gamed — you can't mark a model "Approved" without doing the work

A manual status dropdown next to a data-driven checklist is redundant at best, misleading at worst.

### How Teams Actually Work

| What happens | How the tool helps |
|---|---|
| Analyst builds the threat model | Checklist shows what's done and what's left |
| Team agrees the analysis is complete | All checklist items are green — the work speaks for itself |
| System changes 6 months later | Analyst exports (point-in-time snapshot), then continues editing |
| Auditor needs version history | Compares exported PDFs/JSON in SharePoint/Confluence |

The Export feature already produces a point-in-time artifact. That **is** the version.

## New Design

### Status: Removed

- No status dropdown
- No "Submit for Review" button
- No "Mark as Complete" button
- The Completion Status checklist on the Overview tab is the sole progress indicator

### Versioning: Removed

- No version dropdown
- No version numbers
- No trigger field
- No linked-list version chain
- Export serves as the versioning mechanism

### Header Bar (Before → After)

**Before:** `[v1 ▾] [Approved ▾] [Share] [Export] [System Context] [Delete] [Submit for Review]`

**After:** `[Share] [Export] [System Context] [Delete]`

## Backend Changes

### `threat_models/models.py`

**Remove fields:**

- `version` — `CharField(max_length=50, default="1.0")`
- `status` — `CharField` with `Status.choices`
- `trigger` — `CharField` with `Trigger.choices`
- `previous_version` — `ForeignKey("self", ...)`

**Remove enums:**

- `Status` TextChoices class (Draft, In Progress, Pending Review, Approved, Archived)
- `Trigger` TextChoices class (New, Incident, Pentest, Drift, Feature Addition)

**Update `__str__`:**

```python
# Before:
return f"{self.name} (v{self.version})"

# After:
return self.name
```

### `threat_models/serializers.py`

- Remove `version`, `status`, `trigger`, `previous_version` from serializer field lists (lines 74-84)
- Remove `version`, `status`, `trigger`, `previous_version` from list serializer fields (line 273)
- Remove status-related logic in `_build_progress_checklist()` if any

### `threat_models/views.py`

- Remove `status` and `trigger` from `filterset_fields`
- No write-protection logic needed — threat models are always editable

### Migration

Since `previous_version` is a FK, the migration must:

1. Remove the `previous_version` FK constraint
2. Remove `version`, `status`, `trigger`, `previous_version` columns

No data mapping needed — these fields are simply dropped.

## Frontend Changes

### `types/domain.ts`

**Remove:**

- `ThreatModelStatus` type
- `THREAT_MODEL_STATUSES` array

Remove `status` from the `ThreatModel` interface if present.

### `features/dfd-editor/types/threat-analysis.ts`

**Remove entirely:**

- `WorkspaceStatus` type and `WORKSPACE_STATUS_CONFIG` record
- `VersionTrigger` type and `VERSION_TRIGGER_CONFIG` record
- `ThreatModelVersion` interface

### `components/workspace/useWorkspaceThreatAnalysis.ts`

**Remove from state:**

- `currentVersion` and `previousVersions` from `WorkspaceThreatAnalysisState`
- `extractWorkspaceState()` version extraction logic
- Debounced save of `currentVersion` / `previousVersions` to `workspace_data`

**Remove from return value:**

- `currentVersion` and `previousVersions`

### `pages/ThreatModelDetail.tsx`

**Remove:**

- Version dropdown (lines ~496-521) — the `v1 ▾` control
- Status dropdown (lines ~523-551) — the `Draft ▾` / `Approved ▾` control
- "Submit for Review" button (lines ~609-618)
- `handleStatusChange()` function
- `handleSubmitForReview()` function
- `triggerConfig` variable
- Imports: `VERSION_TRIGGER_CONFIG`, `WORKSPACE_STATUS_CONFIG`, `WorkspaceStatus`

**No replacements added.** The header bar simply has fewer controls.

### `api/threat-models.ts`

No structural changes needed. The `useUpdateThreatModel()` mutation still works for other fields — it just won't be called for status changes anymore.

## Reporting Impact

None. Reports read component/threat/countermeasure data, not status or version metadata.

## Threat Model List Page

Update the threat model list/card view:

- Remove version display (if shown)
- Remove trigger display (if shown)
- Remove status badges
- Remove status filter options

## What We're NOT Building

- No manual status labels of any kind
- No formal review/approval workflow
- No reviewer assignment
- No status transition notifications
- No version history navigation
- No diff between versions
- No "Mark as Complete" button — the checklist is the completion indicator
