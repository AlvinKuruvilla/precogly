# Parent Component Hierarchy

**Date:** 2026-03-04
**Status:** Proposed

---

## Current State

`OrgsystemComponent.parent_component` is a self-referential FK that exists in the database but has no UI or DFD sync logic.

| Layer | Status |
|-------|--------|
| DB field | Done — `parent_component = ForeignKey("self", on_delete=SET_NULL, null=True, related_name="children")` |
| Serializer | Done — included in `OrgsystemComponentSerializer` fields |
| API | Done — readable/writable via `/components/` endpoint |
| DFD sync | Not implemented — `services.py` does not read or write `parent_component` |
| DFD canvas UI | Not implemented — no hierarchy controls in NodeEditPanel |
| Threat analysis UI | Not implemented — no hierarchy display in ComponentView |
| Import/export | Supported — TM-BOM schema includes `parent_component`, tmbom-viewer parses it |

---

## Why It Matters for Threat Analysis

The current FIELD-ADDITIONS-FRONTEND.md characterizes `parent_component` as "mainly for import/export round-trips." This undersells it. Component hierarchy directly affects how threats are identified, scoped, and reasoned about.

### Example 1: Mobile Banking App

```
Mobile Banking App
├── Auth Module
│   ├── Biometric Handler
│   ├── PIN Entry
│   └── Token Manager
├── Payment Engine
│   ├── Transaction Builder
│   └── Fraud Check Client
├── Local Encrypted Store
└── API Gateway Client
```

Without hierarchy, all 8 leaf components appear as flat siblings on the DFD. The analyst loses important context:

- **Cascading compromise.** A rooted/jailbroken device compromises the Mobile Banking App process. Every child component is exposed — that's a parent-level threat that propagates downward. A flat model forces you to duplicate this threat across every child manually.
- **Scoped analysis.** You can threat-model the Payment Engine as a unit first ("what goes wrong if the whole payment subsystem is compromised?"), then drill into Transaction Builder vs Fraud Check Client. Without hierarchy, there's no way to reason at different abstraction levels.
- **Inherited trust context.** Sub-components share the parent's runtime environment. Biometric Handler and PIN Entry both live inside Auth Module's process boundary — that's a security-relevant fact (shared memory, same sandbox) that a flat list doesn't capture.
- **Attack path depth.** Reaching the API Gateway Client is one hop from the app surface. Reaching the Token Manager is conceptually deeper (app → auth module → token manager). Hierarchy makes attack path depth explicit and measurable.

### Example 2: Auth Module (Zoomed In)

```
Auth Module
├── Token Service
│   ├── JWT Issuer
│   └── Refresh Token Store
└── Session Manager
    ├── Session Cache (Redis)
    └── Session Validator
```

Here the hierarchy captures **structural decomposition** that matters for threat analysis:

- **Blast radius.** If Token Service is compromised, both JWT Issuer and Refresh Token Store are affected — but Session Manager is not. Without hierarchy, an analyst has no structured way to express "these two components fail together."
- **Shared secrets.** JWT Issuer and Refresh Token Store likely share a signing key because they're siblings under Token Service. That's an implicit trust relationship the hierarchy makes visible.
- **Countermeasure scoping.** A countermeasure like "rotate signing keys" applies at the Token Service level and covers both children. Without hierarchy, you'd either apply it to each child redundantly or lose the scoping relationship.

---

## Impact on Library Packs

Library packs are currently **entirely flat** — this is the biggest structural gap. Hierarchy support requires changes across the pack schema, the ComponentLibrary model, threat generation, and pack import.

### Current Library Pack Structure (Flat)

`components.yaml` today:

```yaml
components:
  - id: s3
    name: Amazon S3
    category: datastore
    type: Object Storage
    provider: aws
  - id: lambda
    name: AWS Lambda
    category: process
    type: Serverless Function
    provider: aws
```

No component knows about any other component. The `ComponentLibrary` model has no `parent` field. Threats are linked 1:1 to individual components via `ComponentLibraryThreat`.

### What Needs to Change

#### 1. ComponentLibrary Model — Add `parent` Self-FK

`ComponentLibrary` needs a `parent` field (analogous to `OrgsystemComponent.parent_component`):

```python
parent = models.ForeignKey(
    "self", on_delete=models.SET_NULL,
    null=True, blank=True, related_name="children",
)
```

This lets a library pack define that "Token Service" is a child of "Auth Module" at the **template level**, not just at the instance level.

#### 2. components.yaml Schema — Add `parent` Reference

```yaml
components:
  - id: mobile-banking-app
    name: Mobile Banking App
    category: process
    type: Mobile Application

  - id: auth-module
    name: Auth Module
    category: process
    type: Authentication Module
    parent: mobile-banking-app          # <-- new field

  - id: biometric-handler
    name: Biometric Handler
    category: process
    type: Biometric Authentication
    parent: auth-module                 # <-- nested under auth-module

  - id: token-manager
    name: Token Manager
    category: process
    type: Token Management
    parent: auth-module
```

The `parent` field references another component's `id` within the same pack. This is the same slug-reference pattern already used in `joins/components-threats.yaml`.

#### 3. Pack Import Service — Resolve Parent References

`_load_components()` in `backend/apps/packs/services.py` needs a two-pass approach:

1. **Pass 1:** Create all `ComponentLibrary` records with `parent=None`
2. **Pass 2:** Resolve `parent` slug references and set the FK

This avoids ordering issues (a child might appear before its parent in the YAML). The same pattern is already used for taxonomy references and cross-pack dependencies.

#### 4. Threat Generation — Hierarchy-Aware Logic

Currently `_generate_threats_for_component()` in `services.py` queries:

```python
ComponentLibraryThreat.objects.filter(component_library=component.component_library)
```

With hierarchy, this needs to consider **inherited threats**:

- A threat defined on "Auth Module" in the library should also generate threat instances for "Biometric Handler" and "Token Manager" when they're placed on a canvas.
- The generation logic should walk up the `component_library.parent` chain and include ancestor threats.
- Inherited threats should be distinguishable from direct threats (e.g., an `inherited_from` field on `ComponentInstanceThreat`) so analysts know which threats are direct vs propagated.

#### 5. DFD Templates — Express Hierarchy

`dfd-templates/*.yaml` already reference component slugs via `component_ref`. They would additionally need to express parent-child relationships:

```yaml
canvas_data:
  nodes:
    - id: "process-auth-module"
      type: "process"
      data:
        label: "Auth Module"
        component_ref: "auth-module"
    - id: "process-biometric"
      type: "process"
      data:
        label: "Biometric Handler"
        component_ref: "biometric-handler"
        parentComponentRef: "auth-module"   # <-- hierarchy in template
```

#### 6. Countermeasure Inheritance

`ComponentLibraryThreat` links threats to components, and countermeasures link to threats via `applicable_threats` M2M. With hierarchy:

- A countermeasure on a parent-level threat (e.g., "Enable app integrity checks" on "Mobile Banking App") should propagate to children.
- When generating countermeasure instances, walk up the ancestor chain and include countermeasures from inherited threats.
- An `inherited_from` marker on `ComponentInstanceCountermeasure` would let the UI show which countermeasures are direct vs inherited.

### Migration Path for Existing Packs

Existing packs (aws-mini, azure, gcp, etc.) are flat and stay flat — `parent: null` is the default. No migration needed. Hierarchy is opt-in per pack. New packs (e.g., a "mobile-banking" pack or an "auth-patterns" pack) would be the first to use `parent`.

---

## High-Level Implementation Plan

### Phase 1: Library Pack Schema

- Add `parent` self-FK to `ComponentLibrary` model
- Extend `components.yaml` schema to accept `parent` slug references
- Update pack import service with two-pass parent resolution
- Existing packs unaffected (parent defaults to null)

### Phase 2: Canvas Data Model

Add `parentComponentId` to the relevant node data types in `diagram.ts`. This is distinct from `parentId` (which references trust zones/system scopes for visual nesting on the canvas).

### Phase 3: DFD Sync

Update `services.py` to:
- Read `parent_component_id` from node data on sync (canvas → DB)
- Validate no circular references (A → B → A)
- Resolve parent by component ID (parent must already be synced in the same pass)
- When a library component has a `parent` in the library, pre-populate the instance's `parent_component` on creation

### Phase 4: NodeEditPanel UI

Add a "Parent Component" selector to NodeEditPanel. Options: other components in the same threat model (excluding self and descendants to prevent cycles). Could be a combobox filtered by the current threat model's components.

### Phase 5: Threat Analysis Display

In ComponentView, show hierarchy context:
- Breadcrumb or path above the component name (e.g., "Mobile Banking App > Auth Module > Token Manager")
- Collapsible tree view in the component list (left column) as an alternative to the current flat list
- "Child Components" section showing direct children when a parent is selected

### Phase 6: Threat & Countermeasure Propagation

- Update `_generate_threats_for_component()` to walk up `component_library.parent` chain and include ancestor threats
- Add `inherited_from` field to `ComponentInstanceThreat` and `ComponentInstanceCountermeasure` to distinguish direct vs propagated
- Rollup views: "show me all threats under Payment Engine, including children"
- Countermeasure inheritance: a countermeasure on a parent can cover children

Phase 6 is the highest-value payoff but depends on Phases 1-5 being solid.

---

## Relationship to Other Concepts

`parent_component`, trust zones, and system scopes are **independent axes**:

| Concept | Question it answers | Scope |
|---------|-------------------|-------|
| System Scope | "What system are we analyzing?" | Organizational boundary |
| Trust Zone | "What trust level does this run at?" | Security boundary |
| Parent Component | "What is this a submodule of?" | Structural composition |

A component can independently belong to a system scope, a trust zone, and a parent component. These don't conflict.
