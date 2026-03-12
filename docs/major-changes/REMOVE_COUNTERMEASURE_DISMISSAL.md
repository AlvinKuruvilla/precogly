# Remove Countermeasure Dismissal

## Summary

Remove the ability to "dismiss" countermeasures in the Threat Analysis UI. The waiver workflow (`status="waived"` + reason) becomes the only path for countermeasures that are not applicable or whose risk is accepted.

## Problem

Countermeasure dismissal creates an accountability gap:

- **Waive** a countermeasure → reason required, stays visible, appears in reports → accountable
- **Dismiss** a countermeasure → no reason required, hidden from view, absent from reports → no accountability

A user who doesn't want to deal with a countermeasure has two paths, and the easier one (dismiss) has zero audit trail. This undermines the waiver process.

Worse: **dismissal is frontend-only and ephemeral.** The `dismissed` flag is stored in React component state — it is not persisted to the backend and is lost on page reload. This means:

1. A user dismisses 5 countermeasures → refreshes the page → they all reappear
2. No API call is made — the backend never knows a countermeasure was dismissed
3. There is no database field for countermeasure dismissal (unlike threat dismissal, which has `is_dismissed` on `ComponentInstanceThreat`)

## Solution

Remove countermeasure dismissal entirely. If a countermeasure is not applicable, the user waives it with a reason:

> "Not applicable — countermeasure was auto-generated from library but doesn't match our architecture."

This provides a single, auditable workflow for all countermeasures that won't be implemented.

**Dismissed threats stay as-is.** Threat dismissal (`is_dismissed` on `ComponentInstanceThreat` / `DataFlowInstanceThreat`) is a different concern: "this threat doesn't apply to this component" is a valid analytical conclusion persisted in the backend. It has `dismissal_reason` and appears in reports (Section 2.4 Dismissed Threats).

## Frontend Changes

### `features/dfd-editor/types/threat-analysis.ts`

Remove the `dismissed` field from `ComponentThreatCountermeasure`:

```typescript
// Remove this line:
dismissed?: boolean
```

### `components/workspace/useWorkspaceThreatAnalysis.ts`

Remove these functions (lines ~433-473):

- `removeCountermeasure` — sets `dismissed: true` in frontend state
- `restoreCountermeasure` — sets `dismissed: false` in frontend state

### `features/dfd-editor/components/threat-analysis/ComponentView.tsx`

- **Remove the X (dismiss) button** on each countermeasure row (~line 1888)
- **Remove the `.filter((cm) => !cm.dismissed)` filter** on the active countermeasure list (~line 1858)
- **Remove the "Dismissed Countermeasures" collapsible section** (~lines 2080-2103) and its restore buttons
- **Remove `onRemoveCountermeasure` and `onRestoreCountermeasure` props** from the component interface

### `pages/ThreatModelDetail.tsx`

- Remove `removeCountermeasure` and `restoreCountermeasure` from the hook destructuring and prop passing (~line 852)

## Backend Changes

None. Countermeasure dismissal was never persisted to the backend.

## Reporting Impact

No "Dismissed Countermeasures" section needed in reports. The waived countermeasures section (Section 3.3 in the report template) covers all countermeasures that won't be implemented, with mandatory justification.
