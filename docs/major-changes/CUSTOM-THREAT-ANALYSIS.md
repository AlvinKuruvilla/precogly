# Implementation Plan: Custom Threats, Countermeasures & Persistence

## Overview

This plan covers 1 bug fix and 6 features for the threat modeling workspace:

**Phase 0 (Bug Fix):** 0. Auto-generate threats when component library is assigned to existing component

**Features:**

1. Add custom components
2. Add custom threats
3. Add custom countermeasures
4. Edit security requirement mappings (instance-level)
5. Dismiss/restore threats (with backend persistence)
6. Remove/restore countermeasures (with backend persistence)

**Key Finding:** Backend APIs already exist for most features. The work is primarily frontend wiring and UI, with one backend addition for instance-level compliance mappings and a bug fix for threat auto-generation.

**Future Vision:** These features lay groundwork for threat modeling without our DFD canvas. Users may want to upload architecture diagrams (images, draw.io files) and perform threat analysis on manually-defined components. Feature 1 (Add Custom Components) specifically supports this use case.

---

## Architecture Summary

### Current State

- Backend has full CRUD APIs via `ModelViewSet` for all entities
- Frontend has callback handlers defined but they only update local state
- TODO comments indicate backend integration was deferred

### Target State

- Frontend dialogs for adding custom items
- Mutations that persist to backend
- Cache invalidation for data consistency
- Instance-level compliance mapping overrides

---

## Feature 1: Add Custom Components

**Purpose:** Allow users to add components for threat analysis that are NOT drawn on the DFD canvas. This supports:
- Threat modeling with uploaded architecture diagrams (images, draw.io files)
- Adding components that exist but weren't included in the DFD
- Analysis-only components that don't need visual representation

**Note:** These components appear in the Threat Analysis panel but NOT on the DFD canvas.

### Backend (No changes needed)

- `POST /api/components/` - Creates component instance (no DFD link required)

### Frontend Changes

**New Files:**

- `frontend/src/features/dfd-editor/components/AddCustomComponentDialog.tsx`

**Modified Files:**

- `frontend/src/api/threats.ts` - Add `useCreateComponentInstance` mutation
- `frontend/src/features/dfd-editor/components/threat-analysis/ThreatAnalysisView.tsx` - Wire up dialog

**Implementation:**

1. Create dialog with fields: name, category (process/datastore/humanActor/systemActor), optional library reference
2. POST to `/api/components/` with `threat_model` link (for filtering) but no DFD/canvas link
3. Invalidate `['threat-model-threats', threatModelId]` cache
4. Close dialog and select new component

**API Request:**

```json
{
  "name": "Legacy Payment Gateway",
  "category": "process",
  "component_library": 15,
  "threat_model": 7
}
```

### Edge Cases

- Component with same name already exists (allow duplicates - different systems may have same-named components)
- Library reference not found (orphaned component is OK - user can still add custom threats)
- Component without library won't auto-generate threats (user adds manually via Feature 2)

### Potential Regressions

- Breaking existing component selection logic if IDs change format
- Threat counts must include both DFD-linked and analysis-only components

---

## Feature 2: Add Custom Threats

### Backend (No changes needed)

- `POST /api/component-threats/` - Creates threat instance
- `POST /api/flow-threats/` - Creates flow threat instance
- Required fields: `component` or `data_flow`, `inherent_severity`
- Optional fields: `threat_library` (null for truly custom threats), `threat_name`, `threat_description`, `stride_category`

### Frontend Changes

**New Files:**

- `frontend/src/features/dfd-editor/components/threat-analysis/AddThreatDialog.tsx`

**Modified Files:**

- `frontend/src/api/threats.ts` - Add `useCreateComponentThreat`, `useCreateFlowThreat` mutations
- `frontend/src/api/libraries.ts` - Add `useThreatLibrary()` query to fetch available threats
- `frontend/src/features/dfd-editor/components/threat-analysis/ThreatAnalysisView.tsx` - Wire up `onAddCustomThreat`
- `frontend/src/features/dfd-editor/components/threat-analysis/ComponentView.tsx` - Add "Add Threat" button

**Implementation:**

1. Create dialog with two modes:
   - **From Library**: Select from ThreatLibrary items (filtered by component type if applicable)
   - **Custom**: Enter name, description, STRIDE category, severity manually
2. User selects threat + severity (or enters custom details)
3. POST to appropriate endpoint based on component vs dataflow
4. Invalidate `['threat-model-threats', threatModelId]` cache
5. Auto-select new threat

**API Request (From Library):**

```json
{
  "component": 42,
  "threat_library": 15,
  "inherent_severity": "high",
  "status": "open"
}
```

**API Request (Custom - no library reference):**

```json
{
  "component": 42,
  "threat_library": null,
  "threat_name": "Custom API Rate Limiting Bypass",
  "threat_description": "Attacker bypasses rate limiting by rotating IP addresses",
  "stride_category": "denialOfService",
  "inherent_severity": "medium",
  "status": "open"
}
```

### Edge Cases

- Threat already exists for this component (unique constraint on component + threat_library, but custom threats have null library so multiple custom threats are allowed)
- No threat library items available (show "Custom" tab as primary option)
- Adding threat to data flow vs component (different endpoints: `/api/flow-threats/`)
- Custom threat without STRIDE category (allow, default to null)

### Potential Regressions

- ID prefix logic (`backend-{id}` vs `backend-flow-{id}`) must be consistent
- Threat counts in component list could become stale
- Custom threats won't auto-generate countermeasures (no library link to derive them from)

---

## Feature 3: Add Custom Countermeasures

### Backend (No changes needed)

- `POST /api/component-countermeasures/` - Creates countermeasure instance
- `POST /api/flow-countermeasures/` - Creates flow countermeasure instance
- Required fields: `instance_threat` or `flow_threat`
- Optional fields: `countermeasure_library` (null for truly custom), `countermeasure_name`, `countermeasure_description`, `control_type`

### Frontend Changes

**New Files:**

- `frontend/src/features/dfd-editor/components/threat-analysis/AddCountermeasureDialog.tsx`

**Modified Files:**

- `frontend/src/api/threats.ts` - Add `useCreateCountermeasure`, `useCreateFlowCountermeasure` mutations
- `frontend/src/api/libraries.ts` - Add `useCountermeasureLibrary(threatLibraryId?)` query to fetch available countermeasures
- `frontend/src/features/dfd-editor/components/threat-analysis/ThreatAnalysisView.tsx` - Wire up `onAddCustomCountermeasure`
- `frontend/src/features/dfd-editor/components/threat-analysis/ComponentView.tsx` - Add "Add Countermeasure" button

**Implementation:**

1. Create dialog with two modes:
   - **From Library**: Select from CountermeasureLibrary items (filtered by `applicable_threats` if threat has library reference)
   - **Custom**: Enter name, description, control type manually
2. User selects countermeasure or enters custom details, initial status defaults to "gap"
3. POST to appropriate endpoint based on component vs flow threat
4. Invalidate `['threat-model-threats', threatModelId]` cache
5. Refresh countermeasure list

**API Request (From Library):**

```json
{
  "instance_threat": 128,
  "countermeasure_library": 25,
  "status": "gap"
}
```

**API Request (Custom - no library reference):**

```json
{
  "instance_threat": 128,
  "countermeasure_library": null,
  "countermeasure_name": "Custom WAF Rule",
  "countermeasure_description": "Deploy WAF rule to block SQL injection patterns",
  "control_type": "preventive",
  "status": "gap"
}
```

### Edge Cases

- Countermeasure already applied to this threat (unique constraint on instance_threat + countermeasure_library, but custom countermeasures have null library so multiple custom countermeasures are allowed)
- No countermeasure library items for this threat (show "Custom" tab as primary option)
- Flow vs component countermeasure (different endpoints: `/api/flow-countermeasures/`)
- Custom countermeasure on custom threat (fully custom path - no library references at all)

### Potential Regressions

- ID prefix logic (`cm-{id}` vs `fcm-{id}`) must be maintained
- Compliance mappings only auto-load for library-linked countermeasures
- Custom countermeasures have no compliance mappings by default (user can add via Feature 4)

---

## Feature 4: Edit Security Requirement Mappings (Instance-Level)

**Decision:** Instance-level mappings allow per-countermeasure overrides without affecting library-level mappings.

### Backend Changes Required

**New Models:**

- `ComponentInstanceCountermeasureStandard` - Links countermeasure instance to compliance requirement
- `FlowInstanceCountermeasureStandard` - Same for flow countermeasures

**New Files:**

- `backend/apps/threats/models.py` - Add new models
- `backend/apps/threats/serializers.py` - Add serializers
- `backend/apps/threats/views.py` - Add viewsets
- `backend/apps/threats/urls.py` - Add routes
- Migration file (auto-generated)

**New Model Definition:**

```python
class ComponentInstanceCountermeasureStandard(TimestampedModel):
    """Instance-level compliance mapping (overrides library defaults)."""

    class Sufficiency(models.TextChoices):
        FULL = "full", "Full"
        PARTIAL = "partial", "Partial"

    component_countermeasure = models.ForeignKey(
        ComponentInstanceCountermeasure,
        on_delete=models.CASCADE,
        related_name="instance_standard_mappings",
    )
    requirement = models.ForeignKey(
        "compliance.StandardRequirement",
        on_delete=models.CASCADE,
        related_name="instance_countermeasure_mappings",
    )
    sufficiency = models.CharField(
        max_length=10,
        choices=Sufficiency.choices,
        default=Sufficiency.PARTIAL,
    )

    class Meta:
        unique_together = ["component_countermeasure", "requirement"]


class FlowInstanceCountermeasureStandard(TimestampedModel):
    """Instance-level compliance mapping for flow countermeasures."""

    class Sufficiency(models.TextChoices):
        FULL = "full", "Full"
        PARTIAL = "partial", "Partial"

    flow_countermeasure = models.ForeignKey(
        FlowInstanceCountermeasure,
        on_delete=models.CASCADE,
        related_name="instance_standard_mappings",
    )
    requirement = models.ForeignKey(
        "compliance.StandardRequirement",
        on_delete=models.CASCADE,
        related_name="flow_instance_countermeasure_mappings",
    )
    sufficiency = models.CharField(
        max_length=10,
        choices=Sufficiency.choices,
        default=Sufficiency.PARTIAL,
    )

    class Meta:
        unique_together = ["flow_countermeasure", "requirement"]
```

**New API Endpoints:**

- `GET/POST /api/instance-countermeasure-standards/`
- `GET/PATCH/DELETE /api/instance-countermeasure-standards/{id}/`
- `GET/POST /api/flow-instance-countermeasure-standards/`
- `GET/PATCH/DELETE /api/flow-instance-countermeasure-standards/{id}/`

### Frontend Changes

**New Files:**

- `frontend/src/features/dfd-editor/components/threat-analysis/EditComplianceMappingsDialog.tsx`

**Modified Files:**

- `frontend/src/api/compliance.ts` - Add CRUD mutations for instance mappings
- `frontend/src/features/dfd-editor/components/threat-analysis/ComponentView.tsx` - Add edit button
- `frontend/src/api/threats.ts` - Include instance mappings in threat response

**Implementation:**

1. Display merged view: library mappings + instance overrides
2. User can add instance-specific mappings
3. User can "override" library mapping with different sufficiency
4. Instance mappings take precedence over library mappings
5. Deleting instance mapping reverts to library default (if exists)

**Merge Logic (Frontend):**

```typescript
const mergedMappings = [
  ...libraryMappings.map((m) => ({ ...m, source: "library" })),
  ...instanceMappings.map((m) => ({ ...m, source: "instance" })),
].reduce((acc, mapping) => {
  // Instance mappings override library mappings for same requirement
  acc[mapping.requirementId] = mapping;
  return acc;
}, {});
```

**API Request (Create Instance Mapping):**

```json
{
  "component_countermeasure": 75,
  "requirement": 12,
  "sufficiency": "full"
}
```

### Edge Cases

- Framework not imported (disable in UI)
- Duplicate mapping at instance level (unique constraint)
- Deleting instance mapping should show library default again
- Flow countermeasures need separate model/endpoint

### Potential Regressions

- Must update threat response serializer to include instance mappings
- Compliance display logic must merge both sources
- Migration must be tested on existing data

---

## Phase 0 Fix: Auto-Generate Threats on Library Assignment

### Problem

When a component is created first (without a library) and a library is assigned later, threats are not auto-generated. This is because `sync_dfd_nodes_to_components()` only generates threats for _new_ components, not updated ones.

**Evidence**: S3 component created, then "Amazon S3" library assigned → 0 threats. Lambda created with library already set → 4 threats.

### Backend Changes Required

**File: `backend/apps/diagrams/services.py`**

In `sync_dfd_nodes_to_components()`, detect when an existing component's library changes from None to a valid library, and trigger threat generation:

```python
# Around line 120-139, in the "Update existing component" block:
if existing_component_id:
    try:
        component = OrgsystemComponent.objects.get(id=existing_component_id)

        # Track if library is being assigned for the first time
        library_newly_assigned = (
            component.component_library is None and component_library is not None
        )

        component.name = label
        component.component_library = component_library
        component.category = category
        component.save()
        synced_count += 1

        # Generate threats if library was just assigned
        if library_newly_assigned:
            new_components.append(component)

    except OrgsystemComponent.DoesNotExist:
        # ... existing code for deleted component
```

**File: `backend/apps/systems/views.py`**

Fix incidental bug in `generate_threats()` endpoint - add missing `applies_to` filter:

```python
# Around line 164-166, change:
library_threats = ComponentLibraryThreat.objects.filter(
    component_library=component.component_library,
    applies_to__in=[
        ComponentLibraryThreat.AppliesTo.COMPONENT,
        ComponentLibraryThreat.AppliesTo.BOTH,
    ],
).select_related("threat_library")
```

Also add countermeasure auto-generation to match `services.py` behavior:

```python
# After creating threat instance, add:
if created:
    created_threats.append(instance_threat)
    # Auto-generate countermeasures (match services.py behavior)
    from apps.diagrams.services import _generate_countermeasures_for_threat
    _generate_countermeasures_for_threat(instance_threat)
```

### Frontend Changes

None required.

### Testing

1. Create a component without assigning a technology
2. Save the DFD
3. Edit the component and assign a technology (e.g., "Amazon S3")
4. Save the DFD again
5. Verify threats now appear for the component

### Edge Cases

- Component library changed from one library to another (should NOT regenerate - only None → Library)
- Component library removed (Library → None) - no action needed

### Potential Regressions

- None expected - this is additive logic that was missing

---

## Feature 5: Dismiss/Restore Threats (Backend Persistence)

**Decision:** Add dedicated `is_dismissed` boolean field to threat models.

Using a "DISMISSED:" prefix in justification is fragile (users could accidentally trigger it). A dedicated field is cleaner and queryable.

### Backend Changes Required

**File: `backend/apps/threats/models.py`**

Add `is_dismissed` field to both threat models:

```python
# In ComponentInstanceThreat and DataFlowInstanceThreat:
is_dismissed = models.BooleanField(
    default=False,
    help_text="Dismissed threats are hidden from active view but preserved for audit"
)
dismissal_reason = models.TextField(
    blank=True,
    default="",
    help_text="Reason for dismissing the threat"
)
```

**Migration required** - but simple field addition, no data transformation needed.

**Serializer update:** Include `is_dismissed` and `dismissal_reason` in response.

### API Endpoints

- `PATCH /api/component-threats/{id}/` - Update threat (including is_dismissed)
- `PATCH /api/flow-threats/{id}/` - Update flow threat (including is_dismissed)

### Frontend Changes

**Modified Files:**

- `frontend/src/api/threats.ts` - Add `useDismissThreat`, `useRestoreThreat` mutations
- `frontend/src/features/dfd-editor/components/threat-analysis/ThreatAnalysisView.tsx`:
  - Update `handleDismissThreat` to call mutation
  - Update `handleRestoreThreat` to call mutation
  - Remove local-only modification logic

**Implementation:**

1. Dismiss: PATCH threat with `is_dismissed: true`, `dismissal_reason: "..."`
2. Restore: PATCH threat with `is_dismissed: false`, `dismissal_reason: ""`
3. Invalidate `['threat-model-threats', threatModelId]` cache on success
4. Filter dismissed threats client-side by checking `is_dismissed === true`

**API Request (Dismiss):**

```json
{
  "is_dismissed": true,
  "dismissal_reason": "Not applicable - component is internal only"
}
```

**API Request (Restore):**

```json
{
  "is_dismissed": false,
  "dismissal_reason": ""
}
```

### Edge Cases

- Threat has mitigated countermeasures when dismissed (preserve countermeasure data)
- Restore should preserve original status (open/mitigated/accepted) - don't change it
- Flow threats vs component threats (different endpoints: `/api/flow-threats/{id}/`)
- Dismissed threats should still count in "total threats" but not "exposed threats"

### Potential Regressions

- Migration must be tested on existing data
- Existing threat responses must include new fields
- Reports may need to distinguish dismissed vs active threats

---

## Feature 6: Remove/Restore Countermeasures (Backend Persistence)

**Decision:** DELETE for remove, re-add via dialog for restore.

### Backend Changes (None)

- `DELETE /api/component-countermeasures/{id}/` - Already exists
- `DELETE /api/flow-countermeasures/{id}/` - Already exists (for flow countermeasures)
- `POST /api/component-countermeasures/` - Already exists for re-adding
- `POST /api/flow-countermeasures/` - Already exists for re-adding flow countermeasures

### Frontend Changes

**Modified Files:**

- `frontend/src/api/threats.ts`:
  - Add `useDeleteCountermeasure` mutation
  - Add `useDeleteFlowCountermeasure` mutation
  - Existing `useCreateCountermeasure` handles restore (re-add)
- `frontend/src/features/dfd-editor/components/threat-analysis/ThreatAnalysisView.tsx`:
  - Update `handleRemoveCountermeasure` to call DELETE mutation (component or flow based on type)
  - Update `handleRestoreCountermeasure` - open AddCountermeasureDialog
- `frontend/src/features/dfd-editor/components/threat-analysis/ComponentView.tsx`:
  - Remove local "dismissed" tracking for countermeasures

**Implementation:**

1. Remove: DELETE countermeasure instance (with confirmation dialog)
   - Component countermeasure: `DELETE /api/component-countermeasures/{id}/`
   - Flow countermeasure: `DELETE /api/flow-countermeasures/{id}/`
2. Restore: User re-adds via AddCountermeasureDialog
3. Invalidate `['threat-model-threats', threatModelId]` cache on success

### Edge Cases

- Countermeasure had owner assigned (lost on delete - show warning in confirmation dialog)
- Countermeasure was verified (lost on delete - show warning in confirmation dialog)
- Countermeasure had instance-level compliance mappings (lost on delete - show warning)
- Confirmation dialog must list what will be lost before proceeding

### Potential Regressions

- "Restore" behavior changes (was local toggle, now re-creation via dialog)
- Users may accidentally delete countermeasures with important data attached

---

## Implementation Order

**Phase 0: Bug Fixes (Prerequisite)**

0. Fix: Auto-generate threats when component library is assigned to existing component

**Phase 1: Persistence (Low Risk - but Feature 5 requires migration)**

1. Feature 5: Dismiss/restore threats (requires `is_dismissed` field migration)
2. Feature 6: Remove/restore countermeasures

**Phase 2: Custom Items (Medium Risk)**

3. Feature 2: Add custom threats
4. Feature 3: Add custom countermeasures

**Phase 3: Advanced (Higher Risk)**

5. Feature 1: Add custom components (analysis-only, no DFD canvas integration)
6. Feature 4: Edit compliance mappings (requires backend migration)

---

## Files to Modify

### Backend

| File                                  | Changes                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| `backend/apps/diagrams/services.py`   | Phase 0: Generate threats when library assigned to existing component               |
| `backend/apps/systems/views.py`       | Phase 0: Add `applies_to` filter and countermeasure auto-generation                 |
| `backend/apps/threats/models.py`      | Feature 5: Add `is_dismissed`, `dismissal_reason` to threat models; Feature 4: Add `ComponentInstanceCountermeasureStandard`, `FlowInstanceCountermeasureStandard` |
| `backend/apps/threats/serializers.py` | Feature 5: Include dismiss fields; Feature 4: Add serializers for new models        |
| `backend/apps/threats/views.py`       | Feature 4: Add viewsets for new models                                              |
| `backend/apps/threats/urls.py`        | Feature 4: Add routes for new endpoints                                             |

### Frontend - API Layer

| File                             | Changes                                     |
| -------------------------------- | ------------------------------------------- |
| `frontend/src/api/threats.ts`    | Add mutations: `useCreateComponentThreat`, `useCreateFlowThreat`, `useCreateCountermeasure`, `useCreateFlowCountermeasure`, `useDismissThreat`, `useRestoreThreat`, `useDeleteCountermeasure`, `useDeleteFlowCountermeasure` |
| `frontend/src/api/compliance.ts` | Add CRUD mutations for instance mappings    |
| `frontend/src/api/libraries.ts`  | Add queries: `useThreatLibrary()`, `useCountermeasureLibrary(threatLibraryId?)` for dialogs |

### Frontend - Components

| File                                     | Changes                           |
| ---------------------------------------- | --------------------------------- |
| `ThreatAnalysisView.tsx`                 | Wire up all handlers to mutations |
| `ComponentView.tsx`                      | Add buttons, wire up dialogs      |
| `AddThreatDialog.tsx` (new)              | Threat selection dialog           |
| `AddCountermeasureDialog.tsx` (new)      | Countermeasure selection dialog   |
| `AddCustomComponentDialog.tsx` (new)     | Component creation dialog         |
| `EditComplianceMappingsDialog.tsx` (new) | Compliance mapping editor         |

### Frontend - Types

| File                                                        | Changes                           |
| ----------------------------------------------------------- | --------------------------------- |
| `frontend/src/features/dfd-editor/types/threat-analysis.ts` | Add mutation input types          |
| `frontend/src/types/libraries.ts`                           | Ensure library types are complete |

---

## Cache Keys Reference

All features should invalidate these cache keys on mutation success:

| Action | Cache Keys to Invalidate |
|--------|--------------------------|
| Create/update/delete threat | `['threat-model-threats', threatModelId]` |
| Create/update/delete countermeasure | `['threat-model-threats', threatModelId]` |
| Create/update/delete component | `['threat-model-threats', threatModelId]` |
| Create/update/delete compliance mapping | `['threat-model-threats', threatModelId]` |

---

## Unintended Consequences

1. **Data Volume**: Custom items accumulate over time; no cleanup mechanism
2. **Library Drift**: Custom threats/countermeasures not in library won't get pack updates
3. **Compliance Gaps**: Custom countermeasures have no compliance mappings by default
4. **Performance**: More API calls for each action; consider batching
5. **Offline UX**: No local persistence means lost work if network fails mid-edit
6. **Two Migrations**: Features 4 and 5 both require migrations; can be combined into one if implemented together

---

## Testing Strategy

### Manual Testing

0. **Phase 0 verification**: Create component without technology, save, then assign technology, save again - verify threats auto-generate
1. Create threat model with components
2. **Feature 2a**: Add threat from library to component - verify appears in list with auto-generated countermeasures
3. **Feature 2b**: Add custom threat (not from library) - verify appears without auto-generated countermeasures
4. **Feature 3a**: Add countermeasure from library - verify compliance mappings load
5. **Feature 3b**: Add custom countermeasure (not from library) - verify appears without compliance mappings
6. **Feature 5**: Dismiss threat - verify moves to dismissed section, preserves countermeasures
7. **Feature 5**: Restore threat - verify returns to active with original status
8. **Feature 6**: Remove countermeasure with owner assigned - verify warning appears, data lost on confirm
9. **Feature 1**: Add analysis-only component (not on canvas) - verify appears in threat analysis
10. **Feature 4**: Edit compliance mapping - verify updates in display
11. Refresh page - verify all changes persisted

### Verification Commands

```bash
# Backend - activate venv
cd backend && source venv/bin/activate

# Phase 0 - verify fix by checking threat counts per component
python manage.py shell -c "
from apps.systems.models import OrgsystemComponent
from apps.threats.models import ComponentInstanceThreat
for c in OrgsystemComponent.objects.filter(component_library__isnull=False):
    count = ComponentInstanceThreat.objects.filter(component=c).count()
    print(f'{c.name} ({c.component_library.slug}): {count} threats')
"

# Backend - create and apply migrations (Features 4 and 5)
python manage.py makemigrations threats
python manage.py migrate

# Verify new fields exist (Feature 5)
python manage.py shell -c "
from apps.threats.models import ComponentInstanceThreat
print('is_dismissed field exists:', hasattr(ComponentInstanceThreat, 'is_dismissed'))
"

# Frontend - type check
cd frontend && npm run type-check

# Backend - run existing tests
cd backend && python manage.py test

# Frontend - run existing tests
cd frontend && npm test
```

---

## Rollback Plan

All changes are additive:

- Phase 0: Revert commit - no database changes, purely code logic
- Feature 5 migration: Revert with `python manage.py migrate threats <previous_migration>` (just removes nullable fields)
- Feature 4 migration: Revert with `python manage.py migrate threats <previous_migration>`
- New dialogs can be disabled via feature flag
- New mutations fail gracefully (existing behavior continues)
- Revert commits if issues discovered
