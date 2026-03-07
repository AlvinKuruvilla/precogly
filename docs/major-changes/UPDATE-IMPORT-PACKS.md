# Update: Pack Import — Platform-Owned Countermeasures

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
    control_type: preventive
    cost: low
    default_status: platform    # optional, defaults to "gap" if omitted
```

Existing packs without `default_status` will continue to work — omitting the field preserves current behavior (status = gap).

### 3. Backend Code Paths to Update

All code paths that create countermeasure instances currently hardcode `status="gap"`. Each must read `default_status` from the linked `CountermeasureLibrary` instead.

| Code Path | File | What It Does |
|---|---|---|
| `_load_countermeasures()` | `packs/services.py` | Parse `default_status` from YAML into `CountermeasureLibrary` |
| `_generate_countermeasures_for_threat()` | `diagrams/services.py` | Auto-generates `ComponentInstanceCountermeasure` on DFD canvas sync |
| `_generate_countermeasures_for_flow_threat()` | `diagrams/services.py` | Same for `FlowInstanceCountermeasure` |
| `generate_threats` action | `systems/views.py` | Manual "Analyze Threats" button |
| `apply_countermeasure` action | `threats/views.py` | Manual add-from-library (already accepts `status` in request body — should fall back to library `default_status` instead of `"gap"`) |

For paths that create instances, the pattern changes from:

```python
"status": "gap",
```

to:

```python
"status": countermeasure_library.default_status if countermeasure_library else "gap",
```

### 4. Threat Status Recalculation After Generation

There are no Django signals on countermeasure save. After creating platform countermeasures during threat generation, explicitly call `_recalculate_threat_status()` on the parent threat instance so its status updates from `exposed` to `mitigated`.

### 5. Serializer, Type, and Preview Updates

| Layer | File | Change |
|---|---|---|
| Backend serializer | `threats/serializers.py` | Add `default_status` to `CountermeasureLibrarySerializer` fields |
| Pack preview | `packs/services.py` (`_extract_pack_preview()`) | Include `default_status` in preview data |
| Frontend type | `types/libraries.ts` (`CountermeasureLibrary`) | Add `defaultStatus?: 'gap' \| 'platform'` |
| Pack preview UI | `PreviewPackDialog.tsx` | Show "Platform" badge on countermeasures with `default_status: platform` |
| Add countermeasure dialog | `AddCountermeasureDialog.tsx` | Use library's `defaultStatus` instead of hardcoded `'gap'` |

### 6. Fix `control_type` Choices

The `CountermeasureLibrary.ControlType` enum is wrong. Current model:

```python
class ControlType(models.TextChoices):
    TECHNICAL  = "technical",  "Technical"
    PROCEDURAL = "procedural", "Procedural"
```

Correct values (already used by pack YAML files):

```python
class ControlType(models.TextChoices):
    PREVENTIVE = "preventive", "Preventive"
    DETECTIVE  = "detective",  "Detective"
    CORRECTIVE = "corrective", "Corrective"
```

Since `update_or_create` in the import path doesn't run `full_clean()`, the YAML values are silently saved despite not matching the model choices. This is a data integrity issue.

**Changes needed:**

| Layer | File | Change |
|---|---|---|
| Model | `threats/models.py` | Replace `ControlType` choices with `preventive`/`detective`/`corrective` |
| Instance models | `threats/models.py` | Update `ComponentInstanceCountermeasure.control_type` and `FlowInstanceCountermeasure.control_type` choices to match |
| Serializers | `threats/serializers.py` | Update any hardcoded references to old values |
| Frontend types | `types/threat-analysis.ts`, `types/libraries.ts` | Update `controlType` type to `'preventive' \| 'detective' \| 'corrective'` |
| Frontend UI | `AddCountermeasureDialog.tsx`, any control type selectors/badges | Update labels and dropdown options |
| Pack YAML example | Section 2 above | Update example to use `control_type: preventive` |
| Database migration | — | Migrate existing rows (all test data, so a simple replacement or reset is fine) |

**Requires:** database migration. Since this is pre-release and all data is test data, no backward-compatibility shim is needed — just replace the old values.

### 7. Delete Legacy Management Command

`packs/management/commands/import_pack.py` is a v1 single-file import path with its own separate countermeasure logic. Since this is pre-release code, delete it entirely rather than maintaining two import paths. The v2 multi-file import via `packs/services.py` is the only supported path.

## Existing Behavior That Already Works

- **Threat status derivation:** Both backend (`_recalculate_threat_status`) and frontend (`deriveThreatStatus`) already treat `platform` identically to `verified` — no changes needed.
- **Risk scoring:** `scoring/services.py` already assigns `effectiveness = 1.0` to `platform` countermeasures — no changes needed.
- **UI rendering:** Platform badge (green + lock) already renders for `status === 'platform'` — no changes needed.

## Scope

This is one of several planned updates to the pack import feature. Other updates will be tracked separately.
