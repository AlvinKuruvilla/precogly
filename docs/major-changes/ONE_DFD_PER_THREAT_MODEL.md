# One DFD Per Threat Model

## Summary

Replace the many-to-many relationship between ThreatModel and DFD (via `ThreatModelDFD` join table) with a direct ForeignKey on `DFD` pointing to `ThreatModel`. Each threat model has at most one analytical DFD. Additional architecture diagrams (context diagrams, C4 models, sequence diagrams, whiteboard photos) are attached as reference images.

Alternatively, we should be able to mark one of the DFDs as primary and other DFDs if created should simply remain as supporting artifacts.

## Motivation

### Problem: Component Duplication

When a threat model has multiple DFDs, `sync_dfd_nodes_to_components` runs independently per DFD. Each DFD node gets its own `OrgsystemComponent` record — there is no cross-DFD deduplication. If the same component (e.g., "API Gateway (Kong)") appears in two DFDs, the system creates two separate components, each with their own threats and countermeasures. This produces:

- Duplicate entries in threat analysis
- Inflated component/threat counts
- Confusing report output
- No way to tell which component is the "real" one

### Problem: Unnecessary Complexity

The M2M join table enables DFD sharing across threat models and multi-DFD per threat model. In practice:

- DFD sharing across threat models is unused and creates orphan-detection complexity in delete logic
- Context diagrams drawn in the DFD editor trigger `sync_dfd_nodes_to_components`, creating component records and auto-generating threats for high-level boxes that nobody wants to threat-model
- The `DFDCarousel` UI adds multi-tab navigation overhead for a feature that doesn't match how teams work

### How Teams Actually Work

| Diagram                        | Purpose                                      | Should drive threat analysis?        |
| ------------------------------ | -------------------------------------------- | ------------------------------------ |
| Level 1 detailed architecture  | Identify components, flows, trust boundaries | Yes — this is the one analytical DFD |
| Context diagram                | High-level boundary view for stakeholders    | No — it's a communication artifact   |
| C4 container/component diagram | Architecture documentation                   | No — reference image                 |
| Sequence diagram               | Flow-level detail                            | No — reference image                 |
| Whiteboard photo               | Captured during workshops                    | No — reference image                 |

When a system is too large for one DFD, the right approach is splitting into separate threat models linked via `ThreatModelRelationship` (`depends_on`, `subsystem_of`) — which already exists.

## Data Model Changes

### Remove

- **`ThreatModelDFD`** join table (`diagrams/models.py:140`) — delete entirely
- **`DFDOrgsystem`** join table (`diagrams/models.py:161`) — delete entirely (system scope is already resolved via `_sync_nodes_to_orgsystems` in the sync service, which writes `orgsystem_id` directly to `OrgsystemComponent`)

### Modify

**`DFD` model** — add direct FK to ThreatModel:

```python
class DFD(TimestampedModel):
    # ... existing fields ...
    threat_model = models.ForeignKey(
        "threat_models.ThreatModel",
        on_delete=models.CASCADE,
        related_name="dfds",
        null=True,
        blank=True,
    )
```

`null=True` allows DFDs to exist temporarily without a threat model (shouldn't happen in practice, but safer for edge cases). `CASCADE` ensures the DFD is deleted when its threat model is deleted.

### Keep As-Is

- `DFD.diagram_type` field — still useful metadata (context/level1/level2) even with one DFD per threat model
- `DFD.template_library` FK — users can still create from a DFD template
- `DFDTemplatesLibrary` — unchanged, templates are still useful starting points

## Migration Plan

Since all current data is test data, this is a clean migration:

1. **Add field**: `DFD.threat_model` FK (nullable)
2. **Data migration**: For each `ThreatModelDFD` row, set `dfd.threat_model_id = threat_model_dfd.threat_model_id`. If a DFD is somehow linked to multiple threat models (shouldn't happen), pick the first.
3. **Drop table**: `ThreatModelDFD`
4. **Drop table**: `DFDOrgsystem`

## Backend Changes

### `diagrams/models.py`

- Add `threat_model` FK on `DFD`
- Delete `ThreatModelDFD` class
- Delete `DFDOrgsystem` class

### `diagrams/views.py`

**`DFDViewSet.get_queryset()`** — simplify:

```python
# Before: join through ThreatModelDFD
dfd_ids = ThreatModelDFD.objects.filter(
    threat_model_id__in=threat_model_ids
).values_list("dfd_id", flat=True)
return DFD.objects.filter(id__in=dfd_ids)

# After: direct FK
return DFD.objects.filter(
    threat_model_id__in=threat_model_ids
)
```

**`DFDViewSet.create()`** — simplify:

```python
# Before: create DFD then create join row
dfd = serializer.save(updated_by=request.user)
ThreatModelDFD.objects.create(threat_model=threat_model, dfd=dfd)

# After: save with FK
dfd = serializer.save(updated_by=request.user, threat_model=threat_model)
```

**`DFDViewSet.delete_preview()`** — remove "is_shared" / "affected_threat_models" logic. A DFD belongs to exactly one threat model.

**`DFDViewSet.perform_destroy()`** — remove shared-DFD checks. Just delete.

### `diagrams/services.py`

**`get_threat_model_for_dfd()`** — simplify:

```python
# Before: join table lookup
def get_threat_model_for_dfd(dfd):
    association = ThreatModelDFD.objects.filter(dfd=dfd).select_related("threat_model").first()
    return association.threat_model if association else None

# After: direct FK
def get_threat_model_for_dfd(dfd):
    return dfd.threat_model
```

### `threat_models/views.py`

**Remove actions:**

- `add_dfd` — no longer needed; DFD is created with its threat_model FK set
- `remove_dfd` — no longer needed; delete the DFD directly

**Simplify `perform_destroy()`:**

- Remove "shared DFD" orphan detection logic
- DFDs cascade-delete with the threat model automatically

**Simplify `delete_preview()`:**

- Remove `is_shared` flag and `dfds_to_preserve` list
- All DFDs belong to this threat model and will be deleted

**Simplify `threats()` action:**

```python
# Before:
dfd_associations = threat_model.dfd_associations.select_related("dfd").all()
dfds = [assoc.dfd for assoc in dfd_associations]

# After:
dfds = threat_model.dfds.all()
```

### `threat_models/serializers.py`

**`get_dfds()`** — simplify:

```python
# Before:
dfd_associations = obj.dfd_associations.select_related("dfd").all()
return DFDSerializer([assoc.dfd for assoc in dfd_associations], many=True).data

# After:
return DFDSerializer(obj.dfds.all(), many=True).data
```

**`_build_progress_checklist()`** — update `dfd_associations` references to `dfds`.

### `threats/zone_protections.py`

Update `dfd_associations` references to `threat_model.dfds.all()`.

### `organizations/threat_registry.py`

Check and update any `dfd_associations` references.

### `threat_models/adapters/tm_library.py`

No changes needed — TM-Library imports create manual-mode threat models without DFDs.

## Frontend Changes

### `components/workspace/DFDCarousel.tsx`

Replace multi-DFD tab strip with single-DFD display:

- If threat model has a DFD → show "Open DFD Editor" button (or navigate directly)
- If no DFD → show "Create DFD" button
- Remove tab switching logic

### `pages/ThreatModelDetail.tsx`

- Remove add/remove DFD management
- Simplify DFD-related state (no need to track "selected DFD" from multiple options)

### `api/` hooks

- Remove `addDfd` / `removeDfd` mutations
- Remove associated query invalidation logic
- DFD creation already passes `threatModelId` — just ensure the API response reflects the new FK structure

### Workspace manage modals

- Remove DFD management modal (if it exists as a separate manage flow)
- The "Manage DFDs" option in workspace header can be removed

### Types

```typescript
// DFD type may gain a threatModelId field
interface Diagram {
  // ... existing fields ...
  threatModelId: string;
}
```

## URL Changes

### Remove

- `POST /api/threat-models/:id/add_dfd/`
- `POST /api/threat-models/:id/remove_dfd/`

### Unchanged

- `GET/POST /api/diagrams/` — DFD CRUD (create now saves FK directly)
- `GET/PATCH/DELETE /api/diagrams/:id/` — DFD instance operations
- `GET /api/diagrams/:id/delete_preview/` — simplified (no shared-DFD logic)

## Impact on Reporting

This change directly simplifies report generation:

- **Section 3.1 (Data Flow Diagrams)**: Always zero or one DFD. No ambiguity about which diagram is authoritative.
- **Component Inventory**: No duplicates from multiple DFDs. Each component exists once.
- **Threat Analysis**: Clean 1:1 mapping — each component has one set of threats.
- **Manual-mode threat models**: Still have no DFD. Additional visual context comes from reference images.
