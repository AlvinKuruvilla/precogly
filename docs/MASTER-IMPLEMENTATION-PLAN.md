# Master Implementation Plan

## Executive Summary

This document outlines the recommended order for implementing four major features in the Precogly threat modeling platform. The order is determined by analyzing dependencies, data model impacts, and risk of unintended consequences.

**Recommended Order:**
1. **REDESIGN-OF-DFD-EDITOR** - Isolated UI changes, establishes clean type system
2. **HIERARCHICAL-DFD** - Foundational data model changes
3. **FEATURE-THREATS-IN-DFD** - UI enhancement building on hierarchy
4. **ENHANCE-LIBRARY-PACKS** - Advanced feature building on all previous work

---

## Feature Dependency Analysis

### Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DEPENDENCY DIAGRAM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────────┐                                                  │
│   │  REDESIGN-OF-DFD     │  ← Isolated, no dependencies                     │
│   │  (External System +  │                                                  │
│   │   System Scope)      │                                                  │
│   └──────────┬───────────┘                                                  │
│              │                                                               │
│              │ establishes clean node types                                  │
│              ▼                                                               │
│   ┌──────────────────────┐                                                  │
│   │  HIERARCHICAL-DFD    │  ← Foundational: changes core data models        │
│   │  (DFD Hierarchy +    │                                                  │
│   │   Image Workflow)    │                                                  │
│   └──────────┬───────────┘                                                  │
│              │                                                               │
│              │ provides: System Component, hierarchy, component sources      │
│              ▼                                                               │
│   ┌──────────────────────┐                                                  │
│   │  THREATS-IN-DFD      │  ← UI enhancement: threat visibility in editor   │
│   │  (Threats Tab +      │                                                  │
│   │   Visual Badges)     │                                                  │
│   └──────────┬───────────┘                                                  │
│              │                                                               │
│              │ provides: tabbed interface, badge system, threat editing UI   │
│              ▼                                                               │
│   ┌──────────────────────┐                                                  │
│   │  ENHANCE-LIBRARY     │  ← Advanced: protection graph, security controls │
│   │  (Security Controls  │                                                  │
│   │   + Capabilities)    │                                                  │
│   └──────────────────────┘                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Impact Matrix

| Feature | Backend Models | Backend APIs | Frontend Types | DFD Editor | Threat Analysis |
|---------|---------------|--------------|----------------|------------|-----------------|
| REDESIGN-OF-DFD-EDITOR | None | None | Moderate | Moderate | None |
| HIERARCHICAL-DFD | **Major** | **Major** | **Major** | Minor | Moderate |
| FEATURE-THREATS-IN-DFD | None | Minor | Minor | **Major** | Moderate |
| ENHANCE-LIBRARY-PACKS | Moderate | Moderate | Moderate | Moderate | **Major** |

---

## Phase 1: REDESIGN-OF-DFD-EDITOR

### Why First

1. **Isolated changes**: Purely frontend, no backend model changes
2. **Low risk**: Adding a node type and renaming another doesn't break existing functionality
3. **Quick win**: Establishes clean type system before adding complexity
4. **No blockers**: Can be done immediately without waiting for any other work

### What It Does

- Adds "External System" node type (sharp-cornered rectangle for APIs, partner systems)
- Renames "System Boundary" to "System Scope" for clarity
- Updates type definitions, node components, toolbar, and templates

### Files Changed

| Action | File | Risk |
|--------|------|------|
| Modify | `frontend/src/types/domain.ts` | Low |
| Modify | `frontend/src/features/dfd-editor/types/diagram.ts` | Low |
| Create | `frontend/src/features/dfd-editor/components/nodes/ExternalSystemNode.tsx` | None |
| Rename | `SystemBoundaryNode.tsx` → `SystemScopeNode.tsx` | Low |
| Modify | Various index.ts exports | Low |
| Modify | `DiagramToolbar.tsx` | Low |
| Modify | `NodeEditPanel.tsx` | Low |
| Modify | Templates (generic.json, banking.json) | Low |

### Potential Issues

1. **Existing diagrams**: Nodes with `type: "systemBoundary"` need migration
   - **Mitigation**: Add migration in template loading or create data migration script

2. **Type changes cascade**: Other code may reference old types
   - **Mitigation**: Search codebase for `systemBoundary` string literals

### Estimated Effort

Small - 1-2 days

---

## Phase 2: HIERARCHICAL-DFD

### Why Second

1. **Foundational**: Changes core data models that other features depend on
2. **Must precede others**: If done after THREATS-IN-DFD or ENHANCE-LIBRARY-PACKS, those features would need major refactoring
3. **Establishes structure**: Creates System Component, parent/child relationships, DFD types that later features build upon
4. **Enables flexibility**: Image-based workflow provides alternative before adding more DFD complexity

### What It Does

- Adds hierarchy to DFDs (Primary → Decomposition → Reference)
- Auto-creates System Component as root of component hierarchy
- Adds support for image-based workflows (whiteboard photos)
- Enables manual component and system-level threat creation
- Major data model restructuring

### Critical Data Model Changes

```python
# ThreatModel - adds auto-created system component
system_component = OneToOneField(OrgsystemComponent)

# DFD - adds hierarchy support
parent_dfd = ForeignKey('self')
parent_component = ForeignKey(OrgsystemComponent)
dfd_type = CharField(choices=['primary', 'decomposition', 'reference'])
auto_generate_threats = BooleanField()

# OrgsystemComponent - adds flexible creation sources
source = CharField(choices=['dfd', 'manual', 'auto', 'imported'])
threat_model = ForeignKey(ThreatModel)  # for non-DFD components
parent_component = ForeignKey('self')

# ComponentInstanceThreat - allows system-level threats
component = ForeignKey(nullable=True)  # null for system-level
threat_model = ForeignKey(ThreatModel)  # direct link for system-level

# New: ThreatModelAttachment
file, file_name, file_type, description, uploaded_by
```

### Files Changed

| Action | File | Risk |
|--------|------|------|
| Modify | `backend/apps/diagrams/models.py` | **High** |
| Modify | `backend/apps/systems/models.py` | **High** |
| Modify | `backend/apps/threats/models.py` | **High** |
| Create | Migration file | **High** |
| Modify | `backend/apps/diagrams/serializers.py` | Medium |
| Modify | `backend/apps/diagrams/views.py` | Medium |
| Create | `backend/apps/systems/views.py` (manual components) | Medium |
| Modify | `frontend/src/types/index.ts` | Medium |
| Create | `frontend/src/api/diagrams.ts` (new endpoints) | Low |
| Create | `frontend/src/components/diagrams/CreateDFDDialog.tsx` | Low |
| Create | `frontend/src/components/workspace/ImageUpload.tsx` | Low |
| Create | `frontend/src/components/workspace/AddManualComponentDialog.tsx` | Low |

### Potential Issues

1. **Migration complexity**: Existing threat models need System Component created
   - **Mitigation**: Data migration in the migration file (documented in spec)

2. **Breaking API changes**: Serializer changes may break frontend
   - **Mitigation**: Version API or make changes backward-compatible

3. **Orphaned threats**: Existing threats may not have proper hierarchy
   - **Mitigation**: Migration should link existing components to system component

4. **Reference DFD confusion**: Users may not understand why reference DFDs don't affect threat analysis
   - **Mitigation**: Clear UI messaging and documentation

### Dependencies on Phase 1

- Uses updated `DiagramNodeType` union that includes `externalSystem` and `systemScope`
- Templates updated in Phase 1 will need hierarchy-aware loading

### Estimated Effort

Large - 2-3 weeks

---

## Phase 3: FEATURE-THREATS-IN-DFD

### Why Third

1. **Builds on hierarchy**: Can leverage System Component and hierarchical structure
2. **Prepares for Phase 4**: Establishes tabbed interface and badge system that ENHANCE-LIBRARY-PACKS extends
3. **UI-focused**: Less risk than data model changes
4. **Complements hierarchy**: Showing threats in DFD editor makes hierarchical decomposition more useful

### What It Does

- Adds tabbed interface to NodeEditPanel (Properties | Threats)
- Shows threat/countermeasure information directly in DFD editor
- Visual badges on nodes showing threat status (exposed/mitigated)
- Visual indicators on edges for data flow threats
- Edit countermeasure statuses directly from DFD editor

### Integration with Hierarchy

With hierarchical DFD in place:
- Threat badges can reflect hierarchical aggregation
- Decomposition DFDs can show threats for child components
- System-level threats can be displayed appropriately

### Files Changed

| Action | File | Risk |
|--------|------|------|
| Modify | `NodeEditPanel.tsx` | Medium |
| Modify | `EdgeEditPanel.tsx` | Low |
| Create | `NodeThreatsPanel.tsx` | Low |
| Create | `EdgeThreatsPanel.tsx` | Low |
| Create | `ThreatCard.tsx` | Low |
| Create | `CountermeasureRow.tsx` | Low |
| Create | `ThreatStatusBadge.tsx` | Low |
| Modify | `ProcessNode.tsx` (add badge) | Low |
| Modify | `DataStoreNode.tsx` (add badge) | Low |
| Modify | `DataFlowEdge.tsx` (add indicator) | Low |
| Modify | `DFDEditor.tsx` (pass threat data) | Medium |

### Potential Issues

1. **Performance with many nodes**: Threat data passed to every node could cause re-render storms
   - **Mitigation**: Memoization, React.memo with custom comparators

2. **Panel width constraints**: Current ~280px may be too narrow for threat details
   - **Mitigation**: Consider expandable panel or minimum width increase

3. **Dual source of truth**: Threat data in workspace_data AND localStorage
   - **Mitigation**: Migrate fully to workspace_data (documented in spec)

4. **Stale data on navigation**: User edits threats, navigates away
   - **Mitigation**: Clear save/discard semantics, optimistic updates

### Dependencies on Phase 2

- Uses hierarchical component structure for threat aggregation
- Uses System Component for system-level threat display
- Respects `dfd_type` (reference DFDs don't show threat analysis)

### Estimated Effort

Medium - 1-2 weeks

---

## Phase 4: ENHANCE-LIBRARY-PACKS

### Why Last

1. **Most complex**: Involves protection graph computation, capability mapping
2. **Builds on everything**: Requires stable DFD editor, hierarchy, and threat display
3. **Extends Phase 3 UI**: Adds "Platform (provided by X)" status to countermeasures shown in Threats tab
4. **Advanced feature**: Users need basic threat modeling working first

### What It Does

- Security Controls as first-class DFD components (WAF, API Gateway, etc.)
- Protection graph: determines which components are protected by security controls
- ComponentLibraryCapability model: maps controls to countermeasures they provide
- Auto-marks countermeasures as "Platform" when component is protected
- Library Pack schema extension for capabilities

### Integration with Previous Phases

| Phase | How Phase 4 Uses It |
|-------|---------------------|
| Phase 1 | External System nodes may interact with Security Controls |
| Phase 2 | Protection graph respects hierarchy; capabilities tracked per org |
| Phase 3 | Threats tab shows "Platform (provided by WAF)" status; badges reflect protection |

### Files Changed

| Action | File | Risk |
|--------|------|------|
| Modify | `backend/apps/systems/models.py` (add security_control category) | Medium |
| Create | `backend/apps/threats/models.py` (ComponentLibraryCapability) | Medium |
| Create | Migration file | Medium |
| Modify | Library Pack YAML schema | Low |
| Create | `frontend/src/features/dfd-editor/lib/protection-resolver.ts` | Medium |
| Modify | `frontend/src/features/dfd-editor/lib/threat-registry.ts` | Medium |
| Modify | `DiagramToolbar.tsx` (Security Controls section) | Low |
| Modify | `NodeEditPanel.tsx` (show capabilities) | Low |
| Modify | `ComponentView.tsx` (show "provided by") | Low |
| Modify | `backend/apps/diagrams/services.py` (validation) | Low |

### Potential Issues

1. **Circular protection**: What if A protects B and B protects A?
   - **Mitigation**: BFS traversal with visited set prevents infinite loops

2. **Stale protection graph**: User removes flow, countermeasure status doesn't update
   - **Mitigation**: Recompute on flow changes (documented in spec)

3. **Capability accuracy**: Security team may disagree with default confidence levels
   - **Mitigation**: Allow customization via Library Pack UI (documented in spec)

4. **Role-based access complexity**: Security team vs regular users
   - **Mitigation**: Clear permission model, UI that adapts to role

### Dependencies on Phases 1-3

- **Phase 1**: Security Controls are Process nodes (uses ProcessNodeData structure)
- **Phase 2**: Capabilities stored at organization level; works with manual components
- **Phase 3**: Protection status shown in Threats tab; badges reflect inherited protection

### Estimated Effort

Large - 2-3 weeks

---

## Risk Analysis: What Could Go Wrong

### If Implemented Out of Order

| Wrong Order | Consequence |
|-------------|-------------|
| HIERARCHICAL-DFD last | THREATS-IN-DFD badges would need major refactoring to support hierarchy; ENHANCE-LIBRARY-PACKS protection graph would break |
| ENHANCE-LIBRARY-PACKS before THREATS-IN-DFD | No UI to show "Platform provided by X" status; would need to add later |
| REDESIGN last | Type changes would cascade through all other features |
| THREATS-IN-DFD first | Would build on non-hierarchical structure, then break when hierarchy added |

### Data Migration Risks

| Phase | Migration Risk | Mitigation |
|-------|---------------|------------|
| 1 | Low - template nodes need `systemScope` type | Add to template loading |
| 2 | **High** - System Components for existing models | Documented data migration in spec |
| 3 | Low - no schema changes | None needed |
| 4 | Medium - new capability table | Standard additive migration |

### Breaking Changes

| Phase | Breaking Changes | Mitigation |
|-------|-----------------|------------|
| 1 | `systemBoundary` → `systemScope` type | Search/replace, migration |
| 2 | `ComponentInstanceThreat.component` now nullable | Update foreign key queries |
| 3 | None | - |
| 4 | Countermeasure status gets new `platform` value | Additive, backward compatible |

---

## Implementation Timeline

```
Week 1-2:    Phase 1 - REDESIGN-OF-DFD-EDITOR
             ├── Day 1-2: Add External System node
             └── Day 3-4: Rename System Boundary → System Scope

Week 3-5:    Phase 2 - HIERARCHICAL-DFD
             ├── Week 3: Backend models & migrations
             ├── Week 4: Backend APIs & serializers
             └── Week 5: Frontend hierarchy & image upload

Week 6-7:    Phase 3 - FEATURE-THREATS-IN-DFD
             ├── Week 6: Tabbed interface & threat cards
             └── Week 7: Visual badges & edge indicators

Week 8-10:   Phase 4 - ENHANCE-LIBRARY-PACKS
             ├── Week 8: Backend capability model & pack schema
             ├── Week 9: Protection resolver & threat integration
             └── Week 10: UI for security controls & capabilities

Week 11:     Integration testing & bug fixes
```

---

## Testing Strategy

### Phase 1 Testing

- [ ] External System node renders correctly
- [ ] External System can connect with data flows
- [ ] System Scope (renamed) functions identically to old System Boundary
- [ ] Existing templates load with updated types
- [ ] No TypeScript errors after type changes

### Phase 2 Testing

- [ ] New threat models auto-create System Component
- [ ] Existing threat models get System Component via migration
- [ ] Decomposition DFDs link to parent correctly
- [ ] Reference DFDs excluded from threat analysis
- [ ] Image upload works
- [ ] Manual components appear under System Component
- [ ] System-level threats can be added

### Phase 3 Testing

- [ ] Tabbed interface switches correctly
- [ ] Threats load in Threats tab
- [ ] Countermeasure status changes persist
- [ ] Badges show correct counts on nodes
- [ ] Performance acceptable with 50+ nodes
- [ ] Edge indicators display

### Phase 4 Testing

- [ ] Security control nodes render with capabilities
- [ ] Protection graph computes correctly
- [ ] Downstream components show "Platform" status
- [ ] Removing flow updates protection status
- [ ] Library Pack import with capabilities works
- [ ] Role-based UI shows/hides edit controls

---

## Summary

The recommended implementation order is:

1. **REDESIGN-OF-DFD-EDITOR** - Clean foundation, isolated risk
2. **HIERARCHICAL-DFD** - Core data model that others depend on
3. **FEATURE-THREATS-IN-DFD** - UI enhancement building on hierarchy
4. **ENHANCE-LIBRARY-PACKS** - Advanced feature building on all previous

This order minimizes refactoring, respects dependencies, and delivers incremental value at each phase.

---

## Revision History

| Date | Changes |
|------|---------|
| 2026-01-17 | Initial master implementation plan created |
