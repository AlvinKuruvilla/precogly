# Master Implementation Plan

## Executive Summary

This document outlines the recommended order for implementing five major features in the Precogly threat modeling platform. The order is determined by analyzing dependencies, data model impacts, and risk of unintended consequences.

**Recommended Order:**
0. **USER-MANAGEMENT-REDESIGN** - Foundation: team-based ownership model
1. **REDESIGN-OF-DFD-EDITOR** - Isolated UI changes, establishes clean type system
2. **HIERARCHICAL-DFD** - Foundational data model changes for DFD hierarchy
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
│   │  USER-MANAGEMENT     │  ← Foundation: who owns what                     │
│   │  (Teams, Business    │                                                  │
│   │   Units, Sharing)    │                                                  │
│   └──────────┬───────────┘                                                  │
│              │                                                               │
│              │ provides: Team ownership, WorkspaceContext, org structure     │
│              ▼                                                               │
│   ┌──────────────────────┐                                                  │
│   │  REDESIGN-OF-DFD     │  ← Isolated UI, can run parallel with Phase 0    │
│   │  (External System +  │                                                  │
│   │   System Scope)      │                                                  │
│   └──────────┬───────────┘                                                  │
│              │                                                               │
│              │ establishes clean node types                                  │
│              ▼                                                               │
│   ┌──────────────────────┐                                                  │
│   │  HIERARCHICAL-DFD    │  ← Builds on team ownership from Phase 0         │
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
| USER-MANAGEMENT-REDESIGN | **Major** | **Major** | **Major** | None | Minor |
| REDESIGN-OF-DFD-EDITOR | None | None | Moderate | Moderate | None |
| HIERARCHICAL-DFD | **Major** | **Major** | **Major** | Minor | Moderate |
| FEATURE-THREATS-IN-DFD | None | Minor | Minor | **Major** | Moderate |
| ENHANCE-LIBRARY-PACKS | Moderate | Moderate | Moderate | Moderate | **Major** |

---

## Phase 0: USER-MANAGEMENT-REDESIGN

### Why First (Phase 0)

1. **Establishes ownership foundation**: All subsequent features build on team-scoped resources from day one
2. **No retrofitting needed**: HIERARCHICAL-DFD components, system components, and manual components are team-aware from the start
3. **WorkspaceContext available early**: Every feature after can use `useWorkspace()` for team/org context
4. **Progressive disclosure**: Solo users see no complexity; Team Switcher stays hidden until needed
5. **Both Phase 0 and Phase 2 modify ThreatModel**: Doing them in sequence avoids migration conflicts

### What It Does

- Adds Team model (functional unit that owns threat models)
- Adds BusinessUnit model (flexible grouping layer between Org and Team)
- Changes ThreatModel ownership from User to Team (`owning_team` FK)
- Adds MagicLink for read-only sharing with external stakeholders
- Adds ShadowUser for PLG "test drive" functionality
- Auto-provisions Personal Organization + Team for new users
- Adds WorkspaceContext and TeamSwitcher to frontend

### Critical Data Model Changes

```python
# New: BusinessUnit (flexible grouping layer)
class BusinessUnit(TimestampedModel):
    organization = ForeignKey(Organization)
    name = CharField(max_length=255)
    code = CharField(max_length=50)
    parent = ForeignKey('self', null=True)  # Optional nesting

# New: Team (owns threat models)
class Team(TimestampedModel):
    organization = ForeignKey(Organization)
    business_unit = ForeignKey(BusinessUnit, null=True)
    name = CharField(max_length=255)
    is_default = BooleanField(default=False)

# New: TeamMembership (many-to-many)
class TeamMembership(TimestampedModel):
    team = ForeignKey(Team)
    user = ForeignKey(User)
    role = CharField(choices=['lead', 'member', 'viewer'])

# Updated: ThreatModel
owning_team = ForeignKey(Team, on_delete=PROTECT)  # NEW

# New: MagicLink (read-only sharing)
class MagicLink(TimestampedModel):
    threat_model = ForeignKey(ThreatModel)
    token = CharField(max_length=64, unique=True)
    expires_at = DateTimeField()
    is_revoked = BooleanField(default=False)

# New: ShadowUser (PLG test drive)
class ShadowUser(TimestampedModel):
    session_key = CharField(max_length=64)
    user = OneToOneField(User)
    organization = ForeignKey(Organization)
    team = ForeignKey(Team)
    status = CharField(choices=['active', 'converted', 'expired'])
```

### Files Changed

| Action | File | Risk |
|--------|------|------|
| Modify | `backend/apps/organizations/models.py` | **High** |
| Modify | `backend/apps/diagrams/models.py` (ThreatModel.owning_team) | **High** |
| Create | Migration file | **High** |
| Modify | `backend/apps/organizations/serializers.py` | Medium |
| Create | `backend/apps/organizations/views.py` (Team, MagicLink viewsets) | Medium |
| Modify | `backend/apps/organizations/urls.py` | Low |
| Create | `backend/apps/organizations/signals.py` (auto-provisioning) | Medium |
| Create | `frontend/src/types/organization.ts` | Low |
| Create | `frontend/src/api/organizations.ts` | Low |
| Create | `frontend/src/contexts/WorkspaceContext.tsx` | Medium |
| Create | `frontend/src/components/layout/TeamSwitcher.tsx` | Low |
| Create | `frontend/src/components/sharing/MagicLinkDialog.tsx` | Low |
| Modify | `frontend/src/components/layout/Navbar.tsx` | Low |
| Create | Settings pages (profile, org, members, teams) | Low |

### Potential Issues

1. **Migration complexity**: Existing threat models need `owning_team` assigned
   - **Mitigation**: Data migration creates default team per org, assigns existing models

2. **Auth context changes**: Frontend AuthContext needs team/org awareness
   - **Mitigation**: WorkspaceContext wraps existing auth, provides progressive disclosure

3. **API scoping**: All queries must respect team boundaries
   - **Mitigation**: Update querysets to filter by user's team memberships

4. **Magic link security**: Tokens must be unpredictable, expirable
   - **Mitigation**: Use `secrets.token_urlsafe(32)`, enforce expiration checks

### Estimated Effort

Medium-Large - 2 weeks

---

## Phase 1: REDESIGN-OF-DFD-EDITOR

### Why Second (Can Run Parallel with Phase 0)

1. **Isolated changes**: Purely frontend DFD editor, no backend model changes
2. **No overlap with Phase 0**: Different files, different concerns
3. **Low risk**: Adding a node type and renaming another doesn't break existing functionality
4. **Quick win**: Establishes clean type system before adding complexity

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

### Dependencies on Phase 0

- None directly, but can leverage WorkspaceContext if available

### Estimated Effort

Small - 1-2 days

---

## Phase 2: HIERARCHICAL-DFD

### Why Third

1. **Builds on team ownership**: Manual components and system components are team-scoped from the start
2. **Must precede threat UI**: If done after THREATS-IN-DFD, those features would need major refactoring
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

### Dependencies on Phase 0 and Phase 1

- **Phase 0**: ThreatModel already has `owning_team`; manual components inherit team scope
- **Phase 1**: Uses updated `DiagramNodeType` union that includes `externalSystem` and `systemScope`

### Estimated Effort

Large - 2-3 weeks

---

## Phase 3: FEATURE-THREATS-IN-DFD

### Why Fourth

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

### Integration with Previous Phases

With team ownership and hierarchical DFD in place:
- Threat badges can reflect hierarchical aggregation
- Decomposition DFDs can show threats for child components
- System-level threats can be displayed appropriately
- Team context available via WorkspaceContext

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

### Dependencies on Phases 0-2

- **Phase 0**: Uses WorkspaceContext for team-scoped data fetching
- **Phase 2**: Uses hierarchical component structure for threat aggregation; respects `dfd_type`

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
| Phase 0 | Capabilities and security controls are team/org scoped |
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

### Dependencies on Phases 0-3

- **Phase 0**: Organization-level capability customization; role-based access uses team roles
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
| USER-MANAGEMENT last | All features would need retrofitting for team ownership; significant refactoring |
| HIERARCHICAL-DFD before USER-MANAGEMENT | Manual components and hierarchy wouldn't be team-scoped; migration conflicts |
| ENHANCE-LIBRARY-PACKS before THREATS-IN-DFD | No UI to show "Platform provided by X" status; would need to add later |
| REDESIGN last | Type changes would cascade through all other features |
| THREATS-IN-DFD before HIERARCHICAL | Would build on non-hierarchical structure, then break when hierarchy added |

### Data Migration Risks

| Phase | Migration Risk | Mitigation |
|-------|---------------|------------|
| 0 | **High** - Teams for existing orgs, owning_team for existing models | Data migration creates defaults |
| 1 | Low - template nodes need `systemScope` type | Add to template loading |
| 2 | **High** - System Components for existing models | Documented data migration in spec |
| 3 | Low - no schema changes | None needed |
| 4 | Medium - new capability table | Standard additive migration |

### Breaking Changes

| Phase | Breaking Changes | Mitigation |
|-------|-----------------|------------|
| 0 | ThreatModel now requires `owning_team` | Migration assigns default team |
| 1 | `systemBoundary` → `systemScope` type | Search/replace, migration |
| 2 | `ComponentInstanceThreat.component` now nullable | Update foreign key queries |
| 3 | None | - |
| 4 | Countermeasure status gets new `platform` value | Additive, backward compatible |

---

## Implementation Timeline

```
Week 1-2:    Phase 0 - USER-MANAGEMENT-REDESIGN
             ├── Week 1: Backend models, migrations, signals
             └── Week 2: Frontend context, TeamSwitcher, settings pages

Week 2-3:    Phase 1 - REDESIGN-OF-DFD-EDITOR (can overlap with Phase 0)
             ├── Day 1-2: Add External System node
             └── Day 3-4: Rename System Boundary → System Scope

Week 4-6:    Phase 2 - HIERARCHICAL-DFD
             ├── Week 4: Backend models & migrations
             ├── Week 5: Backend APIs & serializers
             └── Week 6: Frontend hierarchy & image upload

Week 7-8:    Phase 3 - FEATURE-THREATS-IN-DFD
             ├── Week 7: Tabbed interface & threat cards
             └── Week 8: Visual badges & edge indicators

Week 9-11:   Phase 4 - ENHANCE-LIBRARY-PACKS
             ├── Week 9: Backend capability model & pack schema
             ├── Week 10: Protection resolver & threat integration
             └── Week 11: UI for security controls & capabilities

Week 12:     Integration testing & bug fixes
```

---

## Testing Strategy

### Phase 0 Testing

- [ ] BusinessUnit CRUD operations
- [ ] Team CRUD operations
- [ ] TeamMembership many-to-many relationships
- [ ] User can belong to multiple teams
- [ ] Auto-provisioning on user registration
- [ ] MagicLink creation and validation
- [ ] MagicLink expiration enforcement
- [ ] Organization-scoped query filtering
- [ ] WorkspaceContext loads organizations and teams
- [ ] TeamSwitcher hidden when user has one team (progressive disclosure)
- [ ] TeamSwitcher visible and functional with multiple teams
- [ ] Settings pages render and save correctly

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
- [ ] All components/DFDs respect team ownership from Phase 0

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

0. **USER-MANAGEMENT-REDESIGN** - Foundation: team-based ownership for all resources
1. **REDESIGN-OF-DFD-EDITOR** - Clean foundation, isolated risk (can parallel with Phase 0)
2. **HIERARCHICAL-DFD** - Core data model that others depend on, builds on team ownership
3. **FEATURE-THREATS-IN-DFD** - UI enhancement building on hierarchy
4. **ENHANCE-LIBRARY-PACKS** - Advanced feature building on all previous

This order establishes ownership first, then structure, then visibility, then advanced features. It minimizes refactoring, respects dependencies, and delivers incremental value at each phase.

---

## Revision History

| Date | Changes |
|------|---------|
| 2026-01-17 | Initial master implementation plan created |
| 2026-01-18 | Added USER-MANAGEMENT-REDESIGN as Phase 0; renumbered all phases |
