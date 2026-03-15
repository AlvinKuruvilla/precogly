# STATUS - COMPLETED

# Primary DFD Designation

## Summary

Keep multi-DFD support but designate one DFD as **primary**. Only the primary DFD drives threat analysis — its canvas nodes sync to `OrgsystemComponent` records, generate threats, and populate reports. Secondary DFDs remain fully interactive in the editor (draw, annotate, zoom, pan) but do not create components or threats. This solves the component duplication problem without discarding the multi-DFD infrastructure.

## What Changed Already (Migration 0003)

The M2M join tables (`ThreatModelDFD`, `DFDOrgsystem`) have already been removed and replaced with a direct FK on `DFD` pointing to `ThreatModel`. This document describes the **next step**: adding an `is_primary` flag.

## Motivation

### Problem: Component Duplication

When a threat model has multiple DFDs, `sync_dfd_nodes_to_components` runs independently per DFD on every save. Each DFD node gets its own `OrgsystemComponent` record — there is no cross-DFD deduplication. If "API Gateway (Kong)" appears in two DFDs, it creates two separate components, each with their own threats and countermeasures. This produces:

- Duplicate entries in threat analysis
- Inflated component/threat counts
- Confusing report output
- No way to tell which component is the "real" one

### Why Not Restrict to One DFD?

Secondary DFDs have genuine value as interactive reference diagrams. Unlike static reference images, they support pan, zoom, node selection, and annotation in the ReactFlow editor. Common use cases:

| Diagram                       | Purpose                                      | Drives threat analysis? |
| ----------------------------- | -------------------------------------------- | ----------------------- |
| Level 1 detailed architecture | Identify components, flows, trust boundaries | **Yes — primary DFD**   |
| Context diagram               | High-level boundary view for stakeholders    | No — secondary          |
| Level 2 subsystem breakdown   | Detailed view of a critical subsystem        | No — secondary          |
| Workshop capture              | Drawn during threat modeling sessions        | No — secondary          |

When a system is too large for one DFD, the right approach is splitting into separate threat models linked via `ThreatModelRelationship` — which already exists.

### Why Not Deduplicate Components Across DFDs?

An alternative approach — matching components by `component_library_id` + `name` across DFDs — was considered. It introduces significant complexity: canonical key matching, property merge rules (which `dataSensitivity` wins?), cross-DFD sync ordering, and a conflict resolution UX. The primary DFD approach solves the same problem with a single boolean field and one guard clause.

## Design Rules

1. **First DFD created for a threat model is automatically primary.**
2. **Subsequent DFDs are secondary by default.**
3. **Only one DFD per threat model can be primary** (enforced by backend).
4. **To change which DFD is primary: delete the current primary first, then promote another.** No direct "swap" operation. This avoids complex state transitions around component ownership.
5. **Secondary DFDs are fully interactive** — users can draw, edit, annotate — but saving them does not trigger `sync_dfd_nodes_to_components`.

---

## Data Model Changes

### Add to `DFD` model

```python
class DFD(TimestampedModel):
    # ... existing fields ...
    is_primary = models.BooleanField(
        default=False,
        help_text="Only the primary DFD drives threat analysis (component/threat sync).",
    )
```

No unique constraint on `(threat_model, is_primary)` because multiple DFDs can be `is_primary=False`. Uniqueness of "at most one primary per threat model" is enforced in the view's `create()` method.

### Migration

Since all current data is test data, this is a clean migration:

1. **Add field**: `DFD.is_primary` (default=False)
2. **Data migration**: For each threat model that has DFDs, set the first DFD (by `created_at`) to `is_primary=True`

---

## Backend Changes

### `diagrams/models.py`

Add `is_primary` field to `DFD`.

### `diagrams/serializers.py`

Add `is_primary` to both `DFDSerializer` and `DFDListSerializer` fields.

### `diagrams/views.py`

**`DFDViewSet.create()`** — auto-assign primary:

```python
def create(self, request, *args, **kwargs):
    # ... existing threat_model_id validation ...

    # First DFD for this threat model is automatically primary
    has_primary = threat_model.dfds.filter(is_primary=True).exists()

    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    dfd = serializer.save(
        updated_by=request.user,
        threat_model=threat_model,
        is_primary=not has_primary,  # True if no primary exists yet
    )
    # ... rest unchanged ...
```

**`DFDViewSet.perform_update()`** — guard sync behind `is_primary`:

```python
def perform_update(self, serializer):
    dfd = serializer.save(updated_by=self.request.user)

    # Only sync primary DFDs to components/threats
    if dfd.is_primary:
        threat_model = get_threat_model_for_dfd(dfd)
        if threat_model:
            sync_result = sync_dfd_nodes_to_components(dfd, threat_model)
            self._sync_result = sync_result
```

**`DFDViewSet.destroy()`** — warn/handle primary deletion:

No change to delete logic itself (orphaned component handling stays). But: if the deleted DFD was primary, the threat model now has no primary DFD. This is fine — the user can promote another DFD or create a new one.

### `diagrams/admin.py`

Add `is_primary` to `list_display` and `list_filter`.

### `diagrams/services.py`

No changes. `sync_dfd_nodes_to_components` is unchanged — the guard is in the view, not the service.

**Note:** `get_threat_model_for_dfd(dfd)` (line 443) is now just `return dfd.threat_model`. Consider inlining it or keeping for readability.

### `organizations/threat_registry.py`

**`compute_threat_model_stats_from_canvas()`** — filter to primary DFDs:

```python
# Before:
dfds = threat_model.dfds.all()

# After:
dfds = threat_model.dfds.filter(is_primary=True)
```

This function counts raw canvas nodes (processes, datastores, etc.) to compute stats. Without this filter, secondary DFD nodes would inflate component counts in dashboards and registry views.

### `threat_models/views.py`, `threat_models/serializers.py`, `threats/zone_protections.py`, `threat_models/report_service.py`

These all iterate `threat_model.dfds.all()` to extract `component_id` from canvas nodes. Since secondary DFDs never run sync, their canvas nodes never get `component_id` written back — so iterating them is harmless (they contribute zero component IDs). **No changes strictly required**, but for clarity and performance, filtering to primary is cleaner:

```python
# Optional but recommended in _get_scoped_ids, threats(), _compute_progress_checklist,
# analyze_zone_protections:
dfds = threat_model.dfds.filter(is_primary=True)
```

### `threat_models/report_service.py` — `_build_architecture()`

This function lists all DFDs in the report's architecture section. **Keep iterating all DFDs** here — secondary DFDs should still appear in reports as reference diagrams (just not drive threat analysis).

### `threat_models/adapters/tm_library.py`

No changes — TM-Library imports create manual-mode threat models without DFDs.

### Deprecated endpoint

`POST /diagrams/create_for_threat_model/` (views.py:92-100) — currently marked DEPRECATED, delegates to `create()`. Remove it in this change or a follow-up.

---

## Frontend Changes

### Types — `features/dfd-editor/types/diagram.ts`

```typescript
export interface Diagram {
  id: string;
  name: string;
  diagramType?: DiagramTypeValue;
  isPrimary?: boolean; // NEW
  threatModelId?: string; // NEW (backend already returns this)
  canvasData?: CanvasData;
  threatAnalysisData?: Record<string, unknown>;
  updatedBy?: string;
  updatedByEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

### `components/workspace/DFDCarousel.tsx`

- Show a **badge** or **star icon** on the primary DFD thumbnail
- Secondary DFD thumbnails get a subtle "reference" label or muted styling
- "New DFD" button remains — creates secondary DFDs
- "All DFDs" aggregation option: keep or remove (since only the primary drives analysis, aggregating secondary canvas data is misleading for threat counts — consider removing it)

### `pages/ThreatModelDetail.tsx`

- The `aggregatedCanvasData` memo that merges nodes/edges across diagrams: **scope to primary DFD only** for threat analysis tab. Secondary DFDs can still be opened individually in the editor.
- DFD filter dropdown ("Filter by DFD"): remove or change to a simple primary/secondary indicator.
- `selectedDiagramId` state: simplify. The primary DFD is always the one driving threat analysis.

### `components/workspace/ManageModals.tsx` — `ManageDFDsModal`

- Show primary badge next to the primary DFD
- Show tooltip on secondary DFDs: "Components not added to threat analysis workspace"
- If primary DFD is deleted, show a prompt suggesting the user promote another DFD

### `components/threat-models/DeleteDFDDialog.tsx`

- **Remove** the `isShared` warning section (lines 91-109). Backend never returns `isShared` — this is dead UI from the old M2M era.
- **Remove** "Associations with threat models" from the delete summary (line 172) — DFDs have a direct FK now, not associations.
- **Add** a warning when deleting the primary DFD: "This is the primary DFD. Deleting it will remove all synced components and their threats. You can promote another DFD to primary after deletion."

### `api/threat-models.ts`

- Remove `isShared` from `DFDDeletePreviewResponse` (backend doesn't return it)
- Add `isPrimary` to the DFD shape in `ThreatModel` type

### `components/workspace/RelationshipCards.tsx`

- DFDs card: indicate which is primary (star icon or "Primary" label)

### `pages/SharedThreatModelView.tsx`

- Show primary/secondary labels on expandable DFD list
- Primary DFD could be expanded by default

### `components/workspace/useWorkspaceThreatAnalysis.ts`

- The effect that filters threats by diagram validity (line 68-101): only consider primary DFD's nodes/edges as valid. Threats from secondary DFDs shouldn't exist (sync never ran), but the guard makes intent explicit.

---

## URL Changes

### Remove (follow-up cleanup)

- `POST /api/diagrams/create_for_threat_model/` — deprecated, delegates to `create()`

### Unchanged

- `GET/POST /api/diagrams/` — DFD CRUD (create auto-assigns primary)
- `GET/PATCH/DELETE /api/diagrams/:id/` — DFD instance operations
- `GET /api/diagrams/:id/delete_preview/` — unchanged

---

## Impact on Reporting

- **Section 3.1 (Data Flow Diagrams)**: Report lists all DFDs but clearly marks which is primary. Only the primary's components drive analysis sections.
- **Component Inventory**: No duplicates — only primary DFD syncs components.
- **Threat Analysis**: Clean 1:1 mapping — each component has one set of threats.
- **Manual-mode threat models**: Still have no DFD. Additional visual context comes from reference images.
- **Secondary DFDs in report**: Appear in the architecture section as reference diagrams with node/edge counts.

---

## Incidental Findings (Clean Up Separately)

Issues discovered during codebase review that are pre-existing, not caused by this change:

| #   | Finding                                                                                                                                                                                                                                                                                       | Location                                                 | Severity            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------- |
| 1   | **`isShared` in frontend type but not in backend response.** `DFDDeletePreviewResponse` declares `isShared: boolean` and `DeleteDFDDialog` renders conditional UI for it, but backend `delete_preview` never returns this field. Dead UI code from the M2M era.                               | `api/threat-models.ts:149`, `DeleteDFDDialog.tsx:50-109` | Low — dead code     |
| 2   | **`Diagram` type missing `threatModelId`.** Backend `DFDSerializer` includes `threat_model` (read-only), but frontend `Diagram` interface doesn't have `threatModelId`. The field is silently dropped.                                                                                        | `diagram.ts:165-175`, `diagrams/serializers.py:14`       | Medium — type drift |
| 3   | **`threat_analysis_data` JSONField appears write-orphaned.** The field exists on `DFD` model and is serialized, but no backend code writes to it. May be frontend-only or vestigial.                                                                                                          | `diagrams/models.py:136`                                 | Low — investigate   |
| 4   | **Orphaned component detection scans ALL DFDs globally.** `delete_preview` and `destroy` in `DFDViewSet` use `DFD.objects.exclude(id=dfd.id)` — not scoped to the threat model. Since components are scoped to a threat model, this cross-TM scan is logically wrong and a performance issue. | `diagrams/views.py:135-143, 197-204`                     | Medium — logic bug  |
| 5   | **DFDCarousel scroll buttons permanently disabled.** `ChevronLeft` and `ChevronRight` buttons have `disabled` hardcoded. Comment says "for future implementation".                                                                                                                            | `DFDCarousel.tsx:33,107`                                 | Low — dead UI       |
| 6   | **`DeleteDFDDialog` says "Associations with threat models"** in the delete summary. Stale copy from M2M era — DFDs have a direct FK now.                                                                                                                                                      | `DeleteDFDDialog.tsx:172`                                | Low — stale copy    |
| 7   | **`diagram_type` field has no conditional business logic.** Stored, serialized, filtered, displayed — but never drives different behavior in sync, threats, or reporting. Purely metadata.                                                                                                    | Entire codebase                                          | Info                |
| 8   | **`get_threat_model_for_dfd()` is unnecessary indirection.** After migration 0003, it's just `return dfd.threat_model`. Consider inlining.                                                                                                                                                    | `diagrams/services.py:443-445`                           | Low — cleanup       |
