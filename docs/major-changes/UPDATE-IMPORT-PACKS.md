# Update: Pack Import — Platform-Owned Countermeasures

> **Pre-release code.** All data in the system is test data. Destructive migrations and schema resets are acceptable.
>
> **Environment.** The Python backend must be invoked using the project's available venv.

## Context

Countermeasures now have 5 distinct statuses: `platform`, `gap`, `planned`, `verified`, `waived`.

- **Platform** = infrastructure-provided, immutable (green + lock icon in UI)
- **Verified** = team-implemented and confirmed (green, editable)
- **Gap / Planned / Waived** = the standard workflow states

Platform status is not user-settable from the UI. It is assigned at creation time — specifically during pack import or automated threat analysis generation.

## What Needs to Change

When security teams author threat packs (component + threat + countermeasure + compliance mapping), they need the ability to mark specific countermeasures as **platform-owned** in the pack definition.

### 1. Add `default_status` to `CountermeasureLibrary` Model

The library model currently has no field to store this. Add:

```python
default_status = models.CharField(
    max_length=20,
    choices=[("gap", "Gap"), ("platform", "Platform")],
    default="gap",
)
```

Only `gap` and `platform` are valid values. Other statuses (`planned`, `verified`, `waived`) are workflow states set by users at the instance level, not by pack authors.

**Requires:** database migration, serializer update, frontend type update.

### 2. Pack YAML Schema

Add an optional `default_status` field to countermeasure entries in `countermeasures.yaml`:

```yaml
countermeasures:
  - slug: sql-injection-filtering
    name: "SQL Injection Filtering"
    control_type: preventive       # see Section 6 for control_type migration
    cost: low
    default_status: platform       # optional, defaults to "gap" if omitted
```

Existing packs without `default_status` will continue to work — omitting the field preserves current behavior (status = gap).

### 3. Backend Code Paths to Update

All code paths that create countermeasure instances currently hardcode `status="gap"`. Each must read `default_status` from the linked `CountermeasureLibrary` instead.

| Code Path | File | What It Does |
|---|---|---|
| `_load_countermeasures()` | `packs/services.py` | Parse `default_status` from YAML into `CountermeasureLibrary` |
| `_generate_countermeasures_for_threat()` | `diagrams/services.py` | Auto-generates `ComponentInstanceCountermeasure` on DFD canvas sync |
| `_generate_countermeasures_for_flow_threat()` | `diagrams/services.py` | Same for `FlowInstanceCountermeasure` |
| `generate_threats` action | `systems/views.py` | Delegates to the above — no direct hardcoding, but verify the call chain |
| `apply_countermeasure` action | `threats/views.py` | Manual add-from-library. Already accepts `status` in request body — change the fallback chain to: request `status` → library `default_status` → `"gap"` |

For paths that create instances, the pattern changes from:

```python
"status": "gap",
```

to:

```python
"status": countermeasure_library.default_status if countermeasure_library else "gap",
```

**Note on `AddCountermeasureDialog.tsx`:** This dialog has three hardcoded `'gap'` sites — two for library-sourced countermeasures (component and flow) and one for custom/freeform countermeasures. Only the library-sourced paths should read `defaultStatus` from the library; the custom path should keep defaulting to `'gap'`.

### 4. Threat Status Recalculation After Generation

There are no Django signals on countermeasure save. After creating platform countermeasures during threat generation, explicitly call threat status recalculation on the parent threat instance so its status updates from `exposed` to `mitigated`.

The recalculation logic currently lives as `_recalculate_threat_status()` methods on `ComponentInstanceThreatViewSet` and `DataFlowInstanceThreatViewSet` in `threats/views.py`. For use from `diagrams/services.py`, either extract a standalone helper or replicate the logic inline.

### 5. Serializer, Type, and Preview Updates

| Layer | File | Change |
|---|---|---|
| Backend serializer | `threats/serializers.py` | Add `default_status` to `CountermeasureLibrarySerializer` fields |
| Pack preview | `packs/services.py` (`_extract_pack_preview()`) | Include `default_status` in preview data |
| Frontend type | `types/libraries.ts` (`CountermeasureLibrary`) | Add `defaultStatus?: 'gap' \| 'platform'` |
| Pack preview UI | `PreviewPackDialog.tsx` | Show "Platform" badge on countermeasures with `default_status: platform` |
| Add countermeasure dialog | `AddCountermeasureDialog.tsx` | Use library's `defaultStatus` for library-sourced countermeasures (see Section 3 note) |

### 6. Fix `control_type` — Free-Text Field (DONE)

The `ControlType` TextChoices enum has been **removed entirely**. The `control_type` field on `CountermeasureLibrary` is now a plain `CharField(max_length=50, default="preventive")` — no `choices` constraint.

This allows pack authors to use any control type value they want. The frontend provides 7 defaults in dropdowns (preventive, detective, corrective, deterrent, recovery, compensating, procedural) and handles unknown values by capitalizing them as a fallback.

The instance models (`ComponentInstanceCountermeasure.control_type` and `FlowInstanceCountermeasure.control_type`) were already plain CharFields with `blank=True` — no changes needed there.

**Changes made:**

| Layer | File | Change |
|---|---|---|
| Model | `threats/models.py` | Removed `ControlType` TextChoices, changed field to `CharField(max_length=50, default="preventive")` |
| Frontend type | `types/libraries.ts` | Changed `controlType` from union to `string` |
| Frontend UI | `Countermeasures.tsx` | Added all 7 control type labels/colors, `formatControlTypeLabel()` fallback for unknown values |
| Pack YAML | `libraries/packs/base-stride/countermeasures.yaml` | Replaced `technical` with `preventive`, kept `procedural` as-is |
| Database migration | `threats/0005_...` | Altered `control_type` field (removed choices, widened max_length to 50) |

### 7. Delete Legacy Management Command

`packs/management/commands/import_pack.py` is a v1 single-file import path with its own separate countermeasure logic. Delete it entirely rather than maintaining two import paths. The v2 multi-file import via `packs/services.py` is the only supported path.

## Existing Behavior That Already Works

- **Threat status derivation:** Both backend (`_recalculate_threat_status` in `threats/views.py`) and frontend (`deriveThreatStatus` in `dfd-editor/types/threat-analysis.ts`) already treat `platform` identically to `verified` — no changes needed.
- **Risk scoring:** `threats/services.py` (`STATUS_EFFECTIVENESS_FALLBACK`) already assigns `effectiveness = 1.0` to `platform` countermeasures — no changes needed.
- **UI rendering:** Platform badge (green + lock) already renders for `status === 'platform'` — no changes needed.

## Scope

This is one of several planned updates to the pack import feature. Other updates will be tracked separately.
