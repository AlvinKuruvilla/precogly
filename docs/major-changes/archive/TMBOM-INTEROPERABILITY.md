# TM-BOM Interoperability: Full Bidirectional Import/Export

## 1. Overview & Goals

### Objective

Achieve 100% bidirectional interoperability with the TM-BOM (Threat Modeling Bill of Materials) format, based on the OWASP Threat Model Library Schema v1.0.

**What "100% compatible" means:**

- **Import**: A TM-BOM JSON file can be imported into Precogly with zero data loss. Every field in the file maps to a Precogly model field.
- **Export**: A Precogly threat model can be exported to TM-BOM JSON that validates against the schema and contains all threat-model-relevant data.
- **Round-trip guarantee**: Import a TM-BOM file → export it back → the output is semantically identical to the input (field ordering and Precogly-internal IDs may differ, but all data is preserved).

### Coding Standards

All code written for this feature must follow `docs/CODING_STANDARDS.md` — in particular, snake_case for backend (Python/Django), camelCase for frontend (TypeScript/React), with djangorestframework-camel-case handling conversion at the API boundary.

### Why TM-BOM

TM-BOM is emerging as the standard interchange format for threat models. Supporting it enables:
- Users migrating from other tools can import existing work
- Users can export to share with auditors, vendors, or other teams
- Regulatory compliance workflows that require standardized threat model documentation
- Interoperability with the growing OWASP Threat Model Library ecosystem

### Test Fixtures

The 4 sample files in `docs/TM-FORMATS/Project-TM-Library/` are real-world examples built on the TM-BOM schema and will serve as our test fixtures:
- `ephemeral-browser-isolation-threat-model.json` (most comprehensive — 11 threats, 15 controls, 6 risks)
- `cryptocurrency-wallet-threat-model.json`
- `hashicorp-vault-threat-model.json`
- `husky-ai-threat-model.json`

---

## 2. TM-BOM Schema Reference

Source: `docs/TM-FORMATS/Project-TM-Library/threat-model.schema.json` (OWASP Threat Model Library Schema v1.0)

### Top-Level Structure

```
{
  "$schema": string (const),
  "version": string (semver pattern, REQUIRED),
  "scope": Scope (REQUIRED),
  "description": string,
  "frozen": boolean,
  "released_at": date-or-datetime,
  "product_release_date": date-or-datetime,
  "release_docs_link": URI,
  "reviewed_at": date-or-datetime,
  "repo_link": URI,
  "diagrams": Diagram[],
  "trust_zones": TrustZone[] (REQUIRED),
  "trust_boundaries": TrustBoundary[] (REQUIRED),
  "actors": Actor[] (REQUIRED),
  "components": Component[] (REQUIRED),
  "data_stores": DataStore[] (REQUIRED),
  "data_sets": DataSet[] (REQUIRED),
  "data_flows": DataFlow[] (REQUIRED),
  "assumptions": Assumption[],
  "threat_personas": ThreatPersona[],
  "threats": Threat[],
  "controls": Control[],
  "risks": Risk[],
  "extensions": object (pattern-keyed custom data)
}
```

### Entity Definitions (Complete Field Reference)

#### Scope (REQUIRED)
| Field | Type | Required | Enum Values |
|-------|------|----------|-------------|
| `title` | string | Yes | — |
| `description` | string | Yes | — |
| `business_criticality` | enum | Yes | minimal, low, moderate, high, maximal |
| `data_sensitivity` | enum[] | Yes | pii, phi, fin, ip, cred, biz, gov, pci, op |
| `exposure` | enum | Yes | internal, external |
| `tier` | enum | Yes | mission_critical, business_critical, important, non_critical |

#### Diagram
| Field | Type | Required | Enum Values |
|-------|------|----------|-------------|
| `title` | string | Yes | — |
| `description` | string | No | — |
| `link` | URI | No | — |
| `type` | enum | Yes | graphviz, mermaid, plantuml, svg |
| `source` | string | Yes | — |

#### TrustZone
| Field | Type | Required |
|-------|------|----------|
| `symbolic_name` | string (pattern: `^[0-9a-z-]+$`) | Yes |
| `title` | string | Yes |
| `description` | string | Yes |

> **Important: TM-BOM trust zones are flat.** There is no `parent` field. Precogly supports nested trust zones (via `parent` FK to self), but TM-BOM does not. On export, nested zones are flattened into peers. For each parent→child zone pair, a `trust_boundary` is auto-generated between them (the TM-BOM-idiomatic way to express nesting — per OWASP Threat Model Library maintainer guidance). The exact parent-child hierarchy and `trust_level` are additionally preserved in `extensions.precogly.org/trust-zone-hierarchy` for Precogly round-trip fidelity.

#### TrustBoundary
| Field | Type | Required | Enum Values |
|-------|------|----------|-------------|
| `trust_zone_a` | symbolic-name ref | Yes | — |
| `trust_zone_b` | symbolic-name ref | Yes | — |
| `access_control_methods` | enum[] | No | none, acl, rbac, mac, dac, abac |
| `authentication_methods` | enum[] | No | none, password, otp, challenge_response, public_key, token, biometrics, sso, social |
| `access_token_expires` | boolean | No | — |
| `access_token_ttl` | integer (seconds) | No | — |
| `has_refresh_token` | boolean | No | — |
| `refresh_token_expires` | boolean | No | — |
| `refresh_token_ttl` | integer (seconds) | No | — |
| `can_user_logout` | boolean | No | — |
| `can_system_logout` | boolean | No | — |

#### Actor
| Field | Type | Required | Enum Values |
|-------|------|----------|-------------|
| `symbolic_name` | symbolic-name | Yes | — |
| `title` | string | Yes | — |
| `description` | string | Yes | — |
| `type` | enum | Yes | system, user, power_user, administrator, engineer, third_party |
| `permissions` | string | No | — |

> **Schema note:** The formal schema does not include `trust_zone` on actors, but all 4 sample files include it. We treat `trust_zone` as a supported field on actors and data_stores for practical interoperability.

#### Component
| Field | Type | Required |
|-------|------|----------|
| `symbolic_name` | symbolic-name | Yes |
| `title` | string | Yes |
| `description` | string | Yes |
| `trust_zone` | symbolic-name ref | Yes |
| `parent_component` | symbolic-name ref | No |
| `repo_link` | URI | No |

#### DataStore
| Field | Type | Required | Enum Values |
|-------|------|----------|-------------|
| `symbolic_name` | symbolic-name | Yes | — |
| `title` | string | Yes | — |
| `description` | string | Yes | — |
| `type` | enum | Yes | sql, key_value, document, object, graph, time_series |
| `vendor` | string | No | — |
| `product` | string | No | — |

> **Schema note:** Same as actors — `trust_zone` is used in samples but not in formal schema.

#### DataSet
| Field | Type | Required | Enum Values |
|-------|------|----------|-------------|
| `symbolic_name` | symbolic-name | Yes | — |
| `title` | string | Yes | — |
| `description` | string | Yes | — |
| `placements` | Placement[] | Yes | — |
| `placements[].data_store` | symbolic-name ref | No | — |
| `placements[].encrypted` | boolean | No | — |
| `data_sensitivity` | enum[] | Yes | pii, phi, fin, ip, cred, biz, gov, pci, op |
| `access_control_methods` | enum[] | No | none, acl, rbac, mac, dac, abac |
| `record_count` | integer | No | — |

#### DataFlow
| Field | Type | Required |
|-------|------|----------|
| `symbolic_name` | symbolic-name | Yes |
| `title` | string | Yes |
| `description` | string | Yes |
| `source` | TypedSymbolicName `{type, name}` | Yes |
| `destination` | TypedSymbolicName `{type, name}` | Yes |
| `has_sensitive_data` | boolean | Yes |
| `encrypted` | boolean | Yes |

TypedSymbolicName: `{ "type": "actor" | "component" | "data_store", "name": "<symbolic_name>" }`

#### Assumption
| Field | Type | Required | Enum Values |
|-------|------|----------|-------------|
| `description` | string | Yes | — |
| `topics` | symbolic-name[] | No | — |
| `validity` | enum | Yes | unconfirmed, confirmed, rejected |

#### ThreatPersona
| Field | Type | Required | Enum Values |
|-------|------|----------|-------------|
| `symbolic_name` | symbolic-name | Yes | — |
| `title` | string | Yes | — |
| `description` | string | Yes | — |
| `is_person` | boolean | Yes | — |
| `skill_level` | enum | Yes | script_kid, insider, engineer, expert_engineer, oc_sponsored, state_sponsored |
| `access_level` | enum | Yes | anonymous, user, admin |
| `malicious_intent` | boolean | Yes | — |
| `applicability_to_org` | enum | Yes | minimal, low, moderate, high, maximal |

#### Threat
| Field | Type | Required |
|-------|------|----------|
| `symbolic_name` | symbolic-name | Yes |
| `title` | string | Yes |
| `description` | string | Yes |
| `components_affected` | symbolic-name[] | No |
| `threat_persona` | symbolic-name ref | Yes |
| `event` | string | Yes |
| `sources` | enum[] | Yes |
| `attack_mechanisms` | CAPECRef[] | No |
| `attack_mechanisms[].capec_id` | integer | Yes |
| `attack_mechanisms[].capec_title` | string | No |
| `weaknesses` | CWERef[] | No |
| `weaknesses[].cwe_id` | integer | Yes |
| `weaknesses[].cwe_title` | string | No |

Sources enum: `adversary`, `human_error`, `failure`, `events_beyond_org_control`

#### Control
| Field | Type | Required | Enum Values |
|-------|------|----------|-------------|
| `symbolic_name` | symbolic-name | Yes | — |
| `title` | string | Yes | — |
| `description` | string | Yes | — |
| `threats` | symbolic-name[] | Yes | — |
| `trust_boundary` | TrustBoundaryRef `{trust_zone_a, trust_zone_b}` | No | — |
| `status` | enum | Yes | assumed, active, suggested, under_review, approved, scheduled, retired, wont_do |
| `priority` | enum | Yes | none, low, medium, high, critical |

#### Risk
| Field | Type | Required | Enum Values |
|-------|------|----------|-------------|
| `symbolic_name` | symbolic-name | Yes | — |
| `title` | string | Yes | — |
| `description` | string | Yes | — |
| `threats` | symbolic-name[] | Yes | — |
| `likelihood` | enum | Yes | rare, unlikely, possible, likely, certain |
| `impact` | enum | Yes | negligible, minor, moderate, major, severe |
| `impact_description` | string | Yes | — |
| `score` | integer (0-25) | Yes | — |
| `level` | string | Yes | — |

#### Extensions
Custom data stored under domain-name-style keys (e.g., `precogly.org/canvas-data`). This is where Precogly-specific data lives in exported files.

---

## 3. Gap Analysis

### 3.1 TM-BOM Entities Precogly Completely Lacks

These entities have no Precogly model at all and require new models:

| TM-BOM Entity | Gap Description |
|----------------|----------------|
| **ThreatPersona** | Attacker profiles with skill level, access level, intent, org applicability. No Precogly equivalent. |
| **Assumption** | System assumptions with validity status (confirmed/unconfirmed/rejected) and topic references. No Precogly equivalent. |
| **Risk** | First-class risk assessment entity with likelihood, impact, score, level, and threat linkage. Precogly derives threat status from countermeasures but has no explicit risk model. **Note:** This aligns with the planned Risk Analysis tab. |

### 3.2 TM-BOM Entities Where Precogly Has a Partial Model

These exist in some form but need significant changes:

| TM-BOM Entity | Current Precogly Model | What's Missing |
|----------------|----------------------|----------------|
| **TrustZone + TrustBoundary** | `TrustBoundary` (misnamed — it's actually a zone) | Precogly conflates zones and boundaries into one model. TM-BOM separates them: zones are containers, boundaries are edges between zones with auth/access metadata. **Precogly's model must be split.** |
| **DataSet** | `DataAsset` (name, classification, CIA ratings) + `ComponentDataAsset` join table. **No rename** — `DataAsset` is kept as-is because it's a broader concept than TM-BOM's `data_sets` (Precogly also links data assets to data flows via `DataFlowAsset`, which TM-BOM has no equivalent for). | Missing: `data_sensitivity` array (pii/phi/fin/ip/cred/biz/gov/pci/op), `access_control_methods`, `record_count`, `description`, `threat_model` FK, `encrypted` on placements. Existing `ComponentDataAsset` already provides the placement relationship but needs field additions. TM-BOM `data_sets` ↔ `DataAsset` mapping handled at the import/export boundary. See Section 3.3 for the data_sets vs data_stores conceptual distinction. |
| **Threat classifications** | `ThreatLibrary.stride_category` (single), `source`/`source_id` (single) | Replace with a **unified taxonomy model**: `ExternalTaxonomy` + `TaxonomyEntry` + `ThreatLibraryTaxonomyEntry` (M2M join). STRIDE, CAPEC, CWE, MITRE ATT&CK, EMB3D, EVITA, and any future taxonomy are all handled by the same three tables. Old `stride_category`, `source`, `source_id` fields dropped. Taxonomy packs imported via the Libraries UI. **Note:** Current `stride_category` stored values use camelCase for multi-word entries (`informationDisclosure`, `denialOfService`, `elevationOfPrivilege`) to match frontend conventions. Pack YAML files inconsistently use both snake_case and camelCase. The unified taxonomy model normalizes this — all entries use kebab-case IDs (`information-disclosure`, `denial-of-service`, `elevation-of-privilege`). |
| **Scope metadata** | `ThreatModel.criticality` exists; others missing | Missing: `data_sensitivity[]`, `exposure` (internal/external), `tier` (mission_critical/business_critical/important/non_critical), `business_criticality` as 5-level enum. |
| **DataStore** | `OrgsystemComponent` with `category=datastore` | Missing: `data_store_type` (sql/key_value/document/object/graph/time_series), `vendor`, `product`. Currently the component model has generic `component_type` and `provider` which partially overlap. |
| **Actor** | `OrgsystemComponent` with `category=human_actor/system_actor` | Missing: `actor_type` (system/user/power_user/administrator/engineer/third_party), `permissions` text. |
| **DataFlow** | `DataFlow` model exists | Missing: `has_sensitive_data`, `description`. The `label` field partially covers `title`. |
| **Control status/priority** | `ComponentInstanceCountermeasure.status` (GAP/PLANNED/VERIFIED/WAIVED) | TM-BOM has 8-value status enum and a separate priority field (none/low/medium/high/critical). Precogly countermeasure instances have no priority. **Note:** `CountermeasureLibrary.ControlType` currently uses `technical`/`procedural`, while pack YAML files use `preventive`/`detective`/`corrective`. The import command maps between these, but the enum values should be aligned — either expand the backend enum to include TM-BOM-style values or standardize the YAML files. |
| **Threat fields** | `ComponentInstanceThreat` + `ThreatLibrary` | Missing on threats: `event` (trigger description), `sources[]` (adversary/human_error/failure/events_beyond_org_control), `threat_persona` linkage, `components_affected` as array. |
| **Top-level metadata** | `ThreatModel` | Missing: `frozen`, `released_at`, `product_release_date`, `release_docs_link`, `reviewed_at`, `repo_link`. |

### 3.3 DataSets vs DataStores: Conceptual Distinction

TM-BOM draws a clear line between **where** data lives and **what** data exists:

- **`data_stores`** = the **physical storage infrastructure**. Examples: "Azure Blob Storage", "PostgreSQL Database", "Redis Cache". Described by `type` (sql, key_value, document, object, graph, time_series), `vendor`, and `product`. Think of these as the containers.

- **`data_sets`** = the **logical data collections**. Examples: "Training Images", "API Keys", "User Credentials". Described by `data_sensitivity[]`, `access_control_methods[]`, `record_count`, and crucially `placements[]` — which data_stores hold this data set. Think of these as the contents.

The relationship is many-to-many via `placements`: a single data_set can be placed on multiple data_stores (e.g., "User Credentials" stored in both a primary database and a backup vault), and a single data_store can hold multiple data_sets.

**In Precogly today**, `DataAsset` is closest to `data_set`, and `OrgsystemComponent` with `category=datastore` is closest to `data_store`. The `ComponentDataAsset` join table already provides the placement relationship (linking data assets to components, including datastore-category ones), but tracks different fields (`data_state`: at_rest/processed, `volume`) rather than TM-BOM's `encrypted` boolean. `DataAsset` also lacks `data_sensitivity[]`, `access_control_methods[]`, and `record_count`. Additionally, `DataAsset` is linked to data flows via `DataFlowAsset` (tracking protection methods, encryption types for data in transit) — a relationship TM-BOM has no equivalent for. The approach is to **keep the existing model names** (`DataAsset`, `ComponentDataAsset`, `DataFlowAsset`) and add the missing TM-BOM fields. The `data_sets` ↔ `DataAsset` naming difference is handled at the import/export boundary (see Section 4.2).

### 3.4 Structural Mismatches

#### Trust Zone / Trust Boundary Separation

**Current Precogly model (wrong):**
```
TrustBoundary (actually a zone)
  - name
  - trust_level (0-100)
  - description
  - parent (self FK)
  Components reference this via trust_boundary FK
```

**TM-BOM model (correct):**
```
TrustZone (container)
  - symbolic_name, title, description
  Components, actors, data_stores sit inside a zone

TrustBoundary (directional edge between zones)
  - trust_zone_a (source zone), trust_zone_b (destination zone)
  - access_control_methods[]
  - authentication_methods[]
  - token config (expires, ttl, refresh)
  - logout capabilities
  Directional: A→B and B→A are distinct boundaries (different
  controls may apply in each direction, e.g., inbound auth vs
  outbound DLP).
```

**Resolution:** Rename `TrustBoundary` → `TrustZone`. Create new `TrustBoundary` model as a relationship between two zones. See Section 4.1.

#### Trust Zone Nesting: Precogly vs TM-BOM

**Precogly:** Trust zones support nesting via `parent` FK. E.g., "Production VPC" → "Private Subnet" → "Database Tier".

**TM-BOM:** Trust zones are **flat** — no `parent` field in the schema. All zones are peers.

**Resolution (per OWASP TM Library maintainer guidance):**
- **Keep nesting in Precogly** — it's a useful capability and more expressive than TM-BOM.
- **On export:** Flatten nested zones into a flat peer list. For each parent→child zone pair, **auto-generate a `trust_boundary`** between them — this is the TM-BOM-idiomatic way to express "you must cross from the outer zone to reach the inner zone." Additionally store the exact parent-child hierarchy in `extensions.precogly.org/trust-zone-hierarchy` for Precogly round-trip fidelity. Auto-generated boundaries are marked with `extensions.precogly.org/auto-generated: true` so they can be distinguished from user-defined boundaries on re-import.
- **On import:** All zones are created at the top level (no parent). If `precogly.org/trust-zone-hierarchy` extension exists, restore nesting. Trust boundaries between zones are imported as `TrustBoundary` DB records regardless of whether they represent nesting or a user-defined crossing.

#### Per-Instance vs. Global Controls

**Precogly model (more granular):**
```
ComponentInstanceCountermeasure
  - instance_threat FK → specific component + threat pair
  - status: GAP | PLANNED | VERIFIED | WAIVED
  - assigned_owner

Same countermeasure can have DIFFERENT statuses per component:
  API Gateway × DoS → Rate Limiting (status=VERIFIED)
  Orchestrator × DoS → Rate Limiting (status=PLANNED)
```

**TM-BOM model (global):**
```
Control
  - threats: [list of threat symbolic_names]
  - status: single global value
  - priority: single global value
```

**Resolution:** Precogly's per-instance model is more accurate and should remain the source of truth. For import/export:
- **Import:** Replicate the global status to each generated instance. Users can then differentiate per-component.
- **Export:** Merge instances sharing the same countermeasure into one TM-BOM control. Status merge strategy: use **worst-case** (if any instance is `suggested`, export as `suggested`; if all `active`, export as `active`). Priority derived from threat severity.

#### Threat-to-Component Cardinality

**Precogly:** `ComponentInstanceThreat` is 1:1 (one component, one threat). If a threat affects 3 components, there are 3 records.

**TM-BOM:** `threats[].components_affected` is an array. One threat references multiple components.

**Resolution:** This is a normalization difference, not a semantic one. On import, create N `ComponentInstanceThreat` records. On export, group by threat and merge `components_affected` arrays.

#### Threat Classification Systems

**Precogly (current):**
```
ThreatLibrary
  - stride_category: single enum (SPOOFING | TAMPERING | ...)
  - source: single enum (STRIDE | CAPEC | OWASP | CWE | CUSTOM)
  - source_id: single string ("CWE-89")
```

**TM-BOM:**
```
Threat
  - attack_mechanisms: [{capec_id: 233, capec_title: "Privilege Escalation"}, ...]
  - weaknesses: [{cwe_id: 269, cwe_title: "Improper Privilege Management"}, ...]
  - (no STRIDE category)
```

**Resolution:** These are complementary, not competing. There is **no disadvantage** to storing all three simultaneously:
- **STRIDE** = enumeration methodology (helps you *find* threats during modeling — "what category of thing can go wrong?")
- **CAPEC** = attack pattern taxonomy (describes *how* an attacker does it — specific attack techniques)
- **CWE** = weakness taxonomy (describes *what* vulnerability enables the attack)

Many organizations use STRIDE for initial threat discovery, then map to CAPEC/CWE for detailed analysis. Having all three is actually *richer* than TM-BOM alone.

**All three are taxonomies.** STRIDE, CAPEC, and CWE are all external classification systems — as are MITRE ATT&CK (enterprise/ICS), EMB3D (IoT/embedded), EVITA (automotive), LINDDUN (privacy), and others. Rather than hardwiring each one as a separate field or JSONField, Precogly uses a **unified taxonomy model**: `ExternalTaxonomy` → `TaxonomyEntry` → `ThreatLibraryTaxonomyEntry` (M2M join). Any taxonomy is just rows in these three tables. See Section 4.4.

A single threat can link to multiple entries across multiple taxonomies (e.g., SQL Injection → STRIDE:tampering + STRIDE:information-disclosure + CAPEC:66 + CWE:89).

**Import consideration:** TM-BOM threats won't have STRIDE entries. On import, no STRIDE `ThreatLibraryTaxonomyEntry` rows are created. TM-BOM `attack_mechanisms` map to CAPEC entries and `weaknesses` map to CWE entries. Optionally, a best-effort CAPEC → STRIDE inference can be applied post-import (published mappings exist), but this should be flagged as inferred, not authoritative.

### 3.5 Threats Cannot Target Data Flows

The schema's `threat.components_affected` field only references component/actor/data store symbolic names. There is no `data_flows_affected` field, so threats like man-in-the-middle or data leakage cannot be directly associated with a specific data flow. All 4 sample files confirm this — no threat references a data flow symbolic name. This is a schema-level gap that limits flow-centric threat modeling.

---

## 4. Schema Evolution Plan

### 4.1 Trust Zone / Trust Boundary Separation

**Rename existing model:**
- `TrustBoundary` → `TrustZone`
- All FK references updated: `OrgsystemComponent.trust_boundary` → `OrgsystemComponent.trust_zone`
- Database table rename via migration

**New model: `TrustBoundary`**
```python
class TrustBoundary(TimestampedModel):
    """Directional boundary between two trust zones with security properties.

    Directional: zone_a → zone_b. A→B and B→A are distinct boundaries
    because different controls may apply in each direction (e.g., inbound
    authentication vs outbound data loss prevention).
    """

    threat_model = models.ForeignKey(
        "diagrams.ThreatModel",
        on_delete=models.CASCADE,
        related_name="trust_boundaries",
    )
    zone_a = models.ForeignKey(
        TrustZone,
        on_delete=models.CASCADE,
        related_name="boundaries_as_zone_a",
        help_text="Source zone (crossing FROM this zone)",
    )
    zone_b = models.ForeignKey(
        TrustZone,
        on_delete=models.CASCADE,
        related_name="boundaries_as_zone_b",
        help_text="Destination zone (crossing TO this zone)",
    )
    access_control_methods = ArrayField(
        models.CharField(max_length=20),
        default=list, blank=True,
        help_text="Values: none, acl, rbac, mac, dac, abac",
    )
    authentication_methods = ArrayField(
        models.CharField(max_length=20),
        default=list, blank=True,
        help_text="Values: none, password, otp, challenge_response, public_key, token, biometrics, sso, social",
    )
    access_token_expires = models.BooleanField(null=True, blank=True)
    access_token_ttl = models.IntegerField(null=True, blank=True, help_text="Seconds")
    has_refresh_token = models.BooleanField(null=True, blank=True)
    refresh_token_expires = models.BooleanField(null=True, blank=True)
    refresh_token_ttl = models.IntegerField(null=True, blank=True, help_text="Seconds")
    can_user_logout = models.BooleanField(null=True, blank=True)
    can_system_logout = models.BooleanField(null=True, blank=True)

    class Meta:
        unique_together = ["threat_model", "zone_a", "zone_b"]
```

**Migration steps:**
1. Create new `TrustZone` model (copy of current `TrustBoundary`)
2. Migrate all data from `TrustBoundary` to `TrustZone`
3. Update all FKs (`OrgsystemComponent.trust_boundary` → `trust_zone`, etc.)
4. Drop old `TrustBoundary` table
5. Create new `TrustBoundary` relationship model

**Frontend impact — DFD editor:**

After the rename, the existing zone group nodes become `trustZone`. A new `trustBoundary` **edge type** is added to represent the security relationship between two zones. The primary creation path is **toolbar-first** — experienced threat modelers expect to find "Trust Boundary" in the toolbar.

#### Toolbar layout

```
┌─ Node creation ────────────────────────────────────────────┬─ Mode toggles ──────────────────────┐
│ 👤 Human Actor  🖥 System Actor  ⚙ Process  💾 Data Store │ → Draw Connection                   │
│ 🛡 Trust Zone   📦 System Scope                           │ ┄ Trust Boundary                    │
└────────────────────────────────────────────────────────────┴─────────────────────────────────────┘
```

- Current "Trust Boundary" button → renamed to **"Trust Zone"** (same behavior: click = adds a resizable zone group node to canvas)
- New **"Trust Boundary"** button added as a **mode toggle** (icon: `Fence` or `ArrowLeftRight`), grouped alongside "Draw Connection" — both are click-source-then-click-target modes
- Tooltip on "Trust Zone": *"A security zone that contains components (e.g., DMZ, Internal Network)"*
- Tooltip on "Trust Boundary": *"A security crossing between two trust zones — defines authentication and access control"*

#### Mode exclusivity

"Trust Boundary" mode and "Draw Connection" mode are **mutually exclusive** — activating one deactivates the other. This matches the existing pattern where "Draw Connection" prevents normal node selection.

| Active mode | Click trust zone | Click component | Click canvas background |
|---|---|---|---|
| **Normal** (default) | Select zone → edit panel opens | Select component → edit panel opens | Deselect all |
| **Draw Connection** | Ignored (toast: "Click a component") | Source/target for data flow edge | Cancel mode |
| **Trust Boundary** | Source/target for boundary edge | Ignored (toast: "Click a trust zone") | Cancel mode |

Escape key cancels any active mode.

#### New edge type: `trustBoundary`

Added to `edgeTypes` alongside existing `dataFlow`:
```typescript
export const edgeTypes = {
  dataFlow: DataFlowEdge,
  trustBoundary: TrustBoundaryEdge,  // NEW
} as const
```

#### Trust Boundary edge data

```typescript
export interface TrustBoundaryEdgeData {
  label?: string
  accessControlMethods?: string[]   // none, acl, rbac, mac, dac, abac
  authenticationMethods?: string[]  // none, password, otp, challenge_response, public_key, token, biometrics, sso, social
  accessTokenExpires?: boolean
  accessTokenTtl?: number           // seconds
  hasRefreshToken?: boolean
  refreshTokenExpires?: boolean
  refreshTokenTtl?: number          // seconds
  canUserLogout?: boolean
  canSystemLogout?: boolean
}
```

#### Creation interaction (toolbar-first)

1. User clicks "Trust Boundary" in toolbar → button highlights (active state), cursor changes to crosshair, toast: "Click the first trust zone"
2. User clicks first trust zone node → zone gets a selection ring highlight, toast updates: "Now click the second trust zone"
3. User clicks second trust zone node → `trustBoundary` edge created between the two zones, mode auto-deactivates, edit panel opens automatically
4. Press Escape or click canvas background → cancel boundary mode at any step

**Edge cases:**

| Situation | Behavior |
|---|---|
| No trust zones on canvas | Toast: "Add at least two trust zones first" — mode doesn't activate |
| Only one trust zone exists | Toast: "Add another trust zone — boundaries connect two zones" — mode doesn't activate |
| Click same zone twice | Toast: "Click a different trust zone" — stay in mode (first selection kept) |
| Click a component in boundary mode | Toast: "Click a trust zone, not a component" — stay in mode |
| Boundary A→B already exists (same direction) | Toast: "Boundary already exists in this direction — click it to edit" — mode deactivates, existing edge selected |
| Boundary B→A exists but A→B doesn't | Allowed — creates A→B as a separate directional boundary. Different controls may apply in each direction (e.g., inbound auth vs outbound DLP) |
| Delete a trust zone | Its boundary edges auto-delete (React Flow cascades removal of edges referencing deleted nodes) |

#### Visual representation (`TrustBoundaryEdge.tsx`)

Custom React Flow edge component with **border-to-border rendering** — instead of drawing a line from zone center to zone center (which looks wrong for large group nodes), the edge computes the closest borders of the two zone rectangles and draws between them:

```
  Standard React Flow edge          Custom border-to-border rendering
  (center-to-center — wrong):      (what we implement):

  ┌──── Zone A ────┐                ┌──── Zone A ────┐
  │                 │                │                 │
  │        ●────────│───┐            └─────────────────┘
  │                 │   │            ┄┄┄ [🔒 RBAC] ┄┄┄┄
  └─────────────────┘   │            ┌──── Zone B ────┐
  ┌──── Zone B ────┐    │            │                 │
  │        ●◀───────│───┘            └─────────────────┘
  │                 │
  └─────────────────┘
```

Visual elements on the boundary line:
- Bold dashed line (visually distinct from the lighter data flow edges)
- Label badge at midpoint (auto-generated: "Zone A → Zone B", editable). Direction reflects `zone_a` → `zone_b` (the order the user clicked)
- Small icon badges: lock (auth methods configured), shield (access control configured)
- If no auth/access methods configured yet: orange warning indicator prompting user to define security properties
- Color hint based on security posture: red-tinted if no auth, amber if partial, green if fully configured

#### Edit panel (`TrustBoundaryEdgeEditPanel.tsx`)

Opens when clicking a trust boundary edge on the canvas (same right-panel pattern as `EdgeEditPanel` for data flows). Fields:
- **Label** — text input, default auto-generated from zone names
- **Access Control Methods** — multi-select chips: `none`, `acl`, `rbac`, `mac`, `dac`, `abac`
- **Authentication Methods** — multi-select chips: `none`, `password`, `otp`, `challenge_response`, `public_key`, `token`, `biometrics`, `sso`, `social`
- **Token Configuration** (collapsible section):
  - Access token expires (toggle) + Access token TTL (number input, seconds)
  - Has refresh token (toggle) + Refresh token expires (toggle) + Refresh token TTL (number input, seconds)
- **Logout Capabilities** (collapsible section):
  - Can user logout (toggle)
  - Can system logout (toggle)
- **Delete Boundary** button at bottom

#### Secondary access from Trust Zone edit panel

The Trust Zone edit panel also shows a read-only **"Boundaries"** section listing existing boundaries for that zone, with "Edit" links that select the boundary edge and open its edit panel. This gives discoverability from both directions — toolbar for creation, zone panel for review. Same dual-access pattern as data flows: created via "Draw Connection" (toolbar) but also visible in component edit panel's connections section.

#### DFD sync

Trust boundary edges in `canvas_data` are synced to `TrustBoundary` DB records during DFD save, following the same pattern as data flow edges → `DataFlow` records. The edge `source` and `target` (trust zone node IDs) resolve to `zone_a` and `zone_b` FKs on the DB model via the existing node-ID-to-DB-record mapping.

#### Backend API for new TrustBoundary model

- New serializer: `TrustBoundarySerializer` (in `systems/serializers.py`)
- New viewset: `TrustBoundaryViewSet` (in `systems/views.py`)
- Nested endpoint: `GET/POST /api/threat-models/{id}/trust-boundaries/`, `PATCH/DELETE /api/trust-boundaries/{id}/`

#### New files created (not renamed)

| File | Purpose |
|---|---|
| `frontend/src/features/dfd-editor/components/edges/TrustBoundaryEdge.tsx` | React Flow custom edge: border-to-border dashed line with security badges |
| `frontend/src/features/dfd-editor/components/panels/TrustBoundaryEdgeEditPanel.tsx` | Edit panel with auth/access control form fields |
| `frontend/src/features/dfd-editor/types/diagram.ts` | Add `TrustBoundaryEdgeData` interface |
| `frontend/src/features/dfd-editor/components/index.ts` | Register `trustBoundary` in `edgeTypes` |
| `frontend/src/features/dfd-editor/DFDEditor.tsx` | Add boundary mode state, `handleBoundaryModeClick` handler |
| `frontend/src/features/dfd-editor/components/DiagramToolbar.tsx` | Add "Trust Boundary" mode toggle button |
| `frontend/src/features/dfd-editor/components/nodes/TrustZoneNode.tsx` | Add "Boundaries" section to zone edit panel (read-only list with Edit links) |
| `backend/apps/systems/serializers.py` | Add `TrustBoundarySerializer` |
| `backend/apps/systems/views.py` | Add `TrustBoundaryViewSet` |
| `backend/apps/systems/urls.py` | Add trust boundary routes |

### 4.2 DataAsset: Add TM-BOM Fields (No Rename)

Keep existing model names (`DataAsset`, `ComponentDataAsset`, `DataFlowAsset`) and add the missing TM-BOM fields. The `data_sets` ↔ `DataAsset` naming difference is handled at the import/export boundary — internal model names don't need to match the interchange format.

**Rationale for keeping `DataAsset`:**
- `DataAsset` is linked to **both** components (via `ComponentDataAsset` — data at rest) **and** data flows (via `DataFlowAsset` — data in transit). TM-BOM's `data_sets` only has `placements[]` on data_stores. Renaming to `DataSet` would imply strict TM-BOM alignment when Precogly's model is actually richer.
- Keeping the name avoids a large blast radius: 3 model renames + all FK columns + serializers + views + URLs + frontend types + API endpoints.
- The import/export layer maps `data_sets` ↔ `DataAsset` with a trivial field name mapping — no internal rename needed.

**Add new fields to `DataAsset`:**

```python
class DataAsset(TimestampedModel):
    """Data asset with sensitivity classification and placement tracking."""

    # NEW: scope data assets to a threat model
    threat_model = models.ForeignKey(
        "diagrams.ThreatModel",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="data_assets",
        help_text="Scopes this data asset to a threat model. Null for legacy/unscoped assets.",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)  # NEW

    # Existing CIA triad fields (KEEP — complementary to data_sensitivity)
    classification = models.CharField(max_length=100)
    confidentiality = models.CharField(max_length=10, choices=Sensitivity.choices, default=Sensitivity.MEDIUM)
    integrity = models.CharField(max_length=10, choices=Sensitivity.choices, default=Sensitivity.MEDIUM)
    availability = models.CharField(max_length=10, choices=Sensitivity.choices, default=Sensitivity.MEDIUM)
    compliance_tags = models.JSONField(default=list, blank=True)

    # NEW TM-BOM fields
    data_sensitivity = ArrayField(
        models.CharField(max_length=10),
        default=list, blank=True,
        help_text="Values: pii, phi, fin, ip, cred, biz, gov, pci, op",
    )
    access_control_methods = ArrayField(
        models.CharField(max_length=10),
        default=list, blank=True,
        help_text="Values: none, acl, rbac, mac, dac, abac",
    )
    record_count = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["name"]
```

**Add `encrypted` to `ComponentDataAsset`:**

```python
class ComponentDataAsset(TimestampedModel):
    """Association between a data asset and a component (data at rest)."""

    component = models.ForeignKey(...)   # existing, unchanged
    data_asset = models.ForeignKey(...)  # existing, unchanged

    # Existing fields (KEEP)
    data_state = models.CharField(max_length=20, choices=DataState.choices, default=DataState.PROCESSED)
    volume = models.CharField(max_length=100, blank=True)

    # NEW TM-BOM field
    encrypted = models.BooleanField(default=False)

    class Meta:
        unique_together = ["component", "data_asset"]
```

**`DataFlowAsset` — unchanged.** It already tracks data assets in transit (protection methods, encryption types), which is a Precogly-specific concept with no TM-BOM equivalent.

**Why no rename:**
- `DataAsset` is a broader, more accurate term — it covers both at-rest (component) and in-transit (data flow) associations, which is a superset of TM-BOM's placement-only `data_sets` concept.
- CIA triad ratings and TM-BOM `data_sensitivity[]` tags serve **different purposes** and are complementary: CIA rates HOW sensitive along three dimensions, while `data_sensitivity` classifies WHAT TYPE of sensitive data (pii, phi, cred, etc.). Keep both.
- Import/export maps `data_sets` ↔ `DataAsset` and `data_sets[].placements[]` ↔ `ComponentDataAsset` at the boundary layer. `DataFlowAsset` data is preserved in `extensions.precogly.org/data-flow-assets` on export.

**Migration steps:**
1. Add `threat_model` FK to `DataAsset` (nullable — existing assets remain unscoped)
2. Add `description` field to `DataAsset`
3. Add new ArrayFields: `data_sensitivity`, `access_control_methods`
4. Add `record_count` field to `DataAsset`
5. Add `encrypted` field to `ComponentDataAsset`
6. Migrations for all of the above (no table/column renames needed)

### 4.3 New Models: ThreatPersona, Assumption, Risk

#### ThreatPersona

```python
class ThreatPersona(TimestampedModel):
    """Attacker profile for threat analysis."""

    class SkillLevel(models.TextChoices):
        SCRIPT_KID = "script_kid", "Script Kiddie"
        INSIDER = "insider", "Insider"
        ENGINEER = "engineer", "Engineer"
        EXPERT_ENGINEER = "expert_engineer", "Expert Engineer"
        OC_SPONSORED = "oc_sponsored", "Organized Crime Sponsored"
        STATE_SPONSORED = "state_sponsored", "State Sponsored"

    class AccessLevel(models.TextChoices):
        ANONYMOUS = "anonymous", "Anonymous"
        USER = "user", "User"
        ADMIN = "admin", "Admin"

    class Applicability(models.TextChoices):
        MINIMAL = "minimal", "Minimal"
        LOW = "low", "Low"
        MODERATE = "moderate", "Moderate"
        HIGH = "high", "High"
        MAXIMAL = "maximal", "Maximal"

    threat_model = models.ForeignKey(
        "diagrams.ThreatModel",
        on_delete=models.CASCADE,
        related_name="threat_personas",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_person = models.BooleanField(default=True)
    skill_level = models.CharField(max_length=30, choices=SkillLevel.choices)
    access_level = models.CharField(max_length=20, choices=AccessLevel.choices)
    malicious_intent = models.BooleanField(default=True)
    applicability_to_org = models.CharField(
        max_length=20,
        choices=Applicability.choices,
        default=Applicability.MODERATE,
    )
```

#### Assumption

```python
class Assumption(TimestampedModel):
    """System assumption for threat analysis."""

    class Validity(models.TextChoices):
        UNCONFIRMED = "unconfirmed", "Unconfirmed"
        CONFIRMED = "confirmed", "Confirmed"
        REJECTED = "rejected", "Rejected"

    threat_model = models.ForeignKey(
        "diagrams.ThreatModel",
        on_delete=models.CASCADE,
        related_name="assumptions",
    )
    description = models.TextField()
    validity = models.CharField(
        max_length=20,
        choices=Validity.choices,
        default=Validity.UNCONFIRMED,
    )
    topics = ArrayField(
        models.CharField(max_length=100),
        default=list, blank=True,
        help_text="Symbolic name references to related entities",
    )
```

#### Risk (aligns with planned Risk Analysis tab)

```python
class RiskAssessment(TimestampedModel):
    """Risk assessment combining threats with likelihood and impact."""

    class Likelihood(models.TextChoices):
        RARE = "rare", "Rare"
        UNLIKELY = "unlikely", "Unlikely"
        POSSIBLE = "possible", "Possible"
        LIKELY = "likely", "Likely"
        CERTAIN = "certain", "Certain"

    class Impact(models.TextChoices):
        NEGLIGIBLE = "negligible", "Negligible"
        MINOR = "minor", "Minor"
        MODERATE = "moderate", "Moderate"
        MAJOR = "major", "Major"
        SEVERE = "severe", "Severe"

    threat_model = models.ForeignKey(
        "diagrams.ThreatModel",
        on_delete=models.CASCADE,
        related_name="risk_assessments",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    likelihood = models.CharField(max_length=20, choices=Likelihood.choices)
    impact = models.CharField(max_length=20, choices=Impact.choices)
    impact_description = models.TextField(blank=True)
    score = models.IntegerField(
        help_text="Risk score 0-25 based on likelihood x impact"
    )
    level = models.CharField(
        max_length=20,
        help_text="Risk level band: low, medium, high, critical",
    )

    # M2M to threats via instance threats
    # A risk can reference multiple threats
    component_threats = models.ManyToManyField(
        "threats.ComponentInstanceThreat",
        blank=True,
        related_name="risk_assessments",
    )
    flow_threats = models.ManyToManyField(
        "threats.DataFlowInstanceThreat",
        blank=True,
        related_name="risk_assessments",
    )
```

### 4.4 Threat Classification: Unified Taxonomy Model

Rather than hardwiring STRIDE, CAPEC, and CWE as separate fields, Precogly uses a generic taxonomy system that supports any external classification — STRIDE, CAPEC, CWE, MITRE ATT&CK, EMB3D (IoT), EVITA (automotive), LINDDUN (privacy), and any future taxonomy. This follows the same pattern as compliance frameworks (`StandardFramework` is generic, not one table per framework).

#### New Models

```python
class ExternalTaxonomy(TimestampedModel):
    """A threat classification system (STRIDE, CAPEC, CWE, MITRE ATT&CK, etc.)."""

    source_pack = models.ForeignKey(
        "packs.LibraryPack",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="taxonomies",
    )
    slug = models.SlugField(unique=True)                   # "stride", "capec", "emb3d"
    name = models.CharField(max_length=255)                 # "STRIDE Threat Model"
    description = models.TextField(blank=True)
    source_url = models.URLField(blank=True)                # "https://capec.mitre.org/"
    version = models.CharField(max_length=50, blank=True)   # "3.9"


class TaxonomyEntry(TimestampedModel):
    """A single entry within a taxonomy."""

    taxonomy = models.ForeignKey(
        ExternalTaxonomy,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    external_id = models.CharField(max_length=50)   # "66", "CWE-89", "T1059", "tampering"
    title = models.CharField(max_length=255)          # "SQL Injection"
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ["taxonomy", "external_id"]
        ordering = ["taxonomy", "external_id"]


class ThreatLibraryTaxonomyEntry(models.Model):
    """M2M join: links a library threat to taxonomy entries."""

    threat_library = models.ForeignKey(
        ThreatLibrary,
        on_delete=models.CASCADE,
        related_name="taxonomy_entries",
    )
    taxonomy_entry = models.ForeignKey(
        TaxonomyEntry,
        on_delete=models.CASCADE,
        related_name="threat_libraries",
    )

    class Meta:
        unique_together = ["threat_library", "taxonomy_entry"]
```

#### Fields removed from ThreatLibrary

```python
# REMOVE (replaced by unified taxonomy M2M):
# stride_category    → ThreatLibraryTaxonomyEntry rows where taxonomy.slug="stride"
# source             → no longer needed
# source_id          → no longer needed
```

Same removals on `ComponentInstanceThreat` and `DataFlowInstanceThreat`. Instance threats link to taxonomy entries via `ThreatLibraryTaxonomyEntry` through their `threat_library` FK (or via a parallel `InstanceThreatTaxonomyEntry` join if instances need independent taxonomy links).

#### Taxonomy Packs

Taxonomies are library packs (pack_type: `taxonomy`), imported through the Libraries UI like any other pack. This requires adding `TAXONOMY = "taxonomy", "Taxonomy Pack"` to `LibraryPack.PackType` choices (current choices are: technology, threat, countermeasure, compliance, template, full). Note: existing pack YAML files also use `industry` as a pack_type (e.g., the banking pack), which also needs adding to the enum.

```yaml
# libraries/packs/stride/pack.yaml
pack:
  slug: stride
  name: STRIDE Threat Model
  pack_type: taxonomy
  version: 1.0.0
  tier: free
  source: official

# libraries/packs/stride/taxonomy.yaml
taxonomy:
  slug: stride
  name: STRIDE Threat Model
  source_url: https://www.microsoft.com/en-us/security/blog/stride
  entries:
    - id: spoofing
      title: Spoofing
      description: Pretending to be something or someone other than yourself
    - id: tampering
      title: Tampering
      description: Modifying data or code without authorization
    - id: repudiation
      title: Repudiation
      description: Claiming to have not performed an action
    - id: information-disclosure
      title: Information Disclosure
      description: Exposing information to unauthorized parties
    - id: denial-of-service
      title: Denial of Service
      description: Denying or degrading service to users
    - id: elevation-of-privilege
      title: Elevation of Privilege
      description: Gaining capabilities without proper authorization
```

Larger taxonomies (CAPEC, CWE, MITRE ATT&CK) follow the same format with more entries.

#### Threat Pack YAML Format

Threat packs reference taxonomy entries by namespace + ID:

```yaml
# Before (old single-value format)
threats:
  - slug: sql-injection
    stride_category: tampering
    source: cwe
    source_id: "CWE-89"

# After (unified taxonomy references)
threats:
  - slug: sql-injection
    name: SQL Injection
    description: |
      Malicious input exploits application...
    taxonomy_references:
      stride: [tampering, information-disclosure]
      capec: [66, 108]
      cwe: [89]
```

Threat packs declare taxonomy dependencies:

```yaml
# pack.yaml
pack:
  slug: aws-mini
  depends_on:
    - stride: "^1.0.0"
    - capec: "^3.0.0"
```

The `import_pack` command resolves references: looks up `ExternalTaxonomy(slug="capec")` → `TaxonomyEntry(external_id="66")` → creates `ThreatLibraryTaxonomyEntry` join row. If a referenced taxonomy isn't imported yet, the reference is stored as a `PendingFrameworkOverlay`-style deferred linkage (same pattern as compliance overlays).

#### Migration

1. Create `ExternalTaxonomy`, `TaxonomyEntry`, `ThreatLibraryTaxonomyEntry` models
2. Seed STRIDE taxonomy (6 entries) as a built-in pack
3. Convert existing `stride_category` values: for each ThreatLibrary with `stride_category="tampering"`, create a `ThreatLibraryTaxonomyEntry` linking to `TaxonomyEntry(taxonomy__slug="stride", external_id="tampering")`
4. Convert existing `source`/`source_id`: if `source="capec"`, `source_id="CAPEC-66"`, create CAPEC taxonomy + entry + join row
5. Drop `stride_category`, `source`, `source_id` from ThreatLibrary and instance models
6. Update all pack YAML files to `taxonomy_references` format
7. Update `import_pack` command to read `taxonomy_references` and `taxonomy.yaml`

| Parallel with compliance frameworks | |
|---|---|
| `StandardFramework` | `ExternalTaxonomy` |
| `StandardRequirement` | `TaxonomyEntry` |
| `CountermeasureLibraryStandard` | `ThreatLibraryTaxonomyEntry` |
| `joins/countermeasures-owasp.yaml` | `taxonomy_references` in threats.yaml |
| Compliance packs | Taxonomy packs |

### 4.5 Threat Instance: New Fields

**Add to `ComponentInstanceThreat` and `DataFlowInstanceThreat`:**

```python
# Threat persona linkage
threat_persona = models.ForeignKey(
    ThreatPersona,
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name="%(class)s_instances",
)

# TM-BOM threat fields
event = models.CharField(
    max_length=255, blank=True,
    help_text="Event that triggers the threat",
)
threat_sources = ArrayField(
    models.CharField(max_length=30),
    default=list, blank=True,
    help_text="Values: adversary, human_error, failure, events_beyond_org_control",
)
```

### 4.6 Countermeasure: Status Expansion and Priority Field

**Status expansion:** Precogly currently has 4 countermeasure statuses (GAP, PLANNED, VERIFIED, WAIVED). TM-BOM has 8 control statuses (assumed, active, suggested, under_review, approved, scheduled, retired, wont_do) which are more granular and better reflect real-world lifecycle states.

**Recommendation:** Expand Precogly's status enum to include all 8 TM-BOM statuses. This avoids lossy status mapping during import/export and gives users finer-grained control over countermeasure lifecycle tracking.

**Update `ComponentInstanceCountermeasure.Status` and `FlowInstanceCountermeasure.Status`:**

```python
class Status(models.TextChoices):
    SUGGESTED = "suggested", "Suggested"
    UNDER_REVIEW = "under_review", "Under Review"
    APPROVED = "approved", "Approved"
    SCHEDULED = "scheduled", "Scheduled"
    ACTIVE = "active", "Active"
    ASSUMED = "assumed", "Assumed"
    RETIRED = "retired", "Retired"
    WONT_DO = "wont_do", "Won't Do"
```

**Migration note:** Map existing data in a single migration: GAP → `suggested`, PLANNED → `scheduled`, VERIFIED → `active`, WAIVED → `retired`. Since all data is test data, the old 4 choices are removed immediately (no backward-compatibility period needed).

**Add priority field to `ComponentInstanceCountermeasure` and `FlowInstanceCountermeasure`:**

```python
class Priority(models.TextChoices):
    NONE = "none", "None"
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"

priority = models.CharField(
    max_length=20,
    choices=Priority.choices,
    default=Priority.NONE,
)
```

### 4.7 Scope Metadata & workspace_data Cleanup

#### The Problem: Definitional Data Trapped in workspace_data

The `ThreatModel.workspace_data` JSONField currently stores a mix of **definitional data** (what the system is, what's in scope) and **UI state** (progress checklists, view preferences). Definitional data should live in proper database columns/models — it's queryable, validated, and explicit in the schema.

#### Current workspace_data inventory

```
workspace_data = {
  status:              ← REDUNDANT: duplicates ThreatModel.status
  criticality:         ← REDUNDANT: duplicates ThreatModel.criticality
  frameworks:          ← REDUNDANT: duplicates ThreatModelFramework
  currentVersion:      ← REDUNDANT: partially duplicates ThreatModel.version
  previousVersions:    ← should be in DB (version history)
  systemContext: {
    description:       ← REDUNDANT: duplicates ThreatModel.description
    assets: [          ← DEFINITIONAL: should be a proper model
      { id, name, description, classification }
    ],
    outOfScopeItems: [ ← DEFINITIONAL: should be a proper model
      { id, name, reason }
    ],
    scopeLocked:       ← DEFINITIONAL: scope lock state
    scopeLockedAt:     ← DEFINITIONAL: scope lock timestamp
    integrations: {},  ← placeholder, unused
    uploads: {},       ← placeholder, unused
  },
  progressChecklist: [ ← UI STATE: stays in workspace_data
    { id, label, checked, autoComputed }
  ],
}
```

#### Resolution: Move everything definitional to the database

**Step 1: Remove redundancies.** Stop writing `status`, `criticality`, `frameworks`, `description` to workspace_data. These already have proper DB columns. The frontend hook (`useWorkspaceThreatAnalysis`) currently writes these into workspace_data and reads them back — refactor to read directly from `ThreatModel` fields.

**Step 2: New scope fields on ThreatModel.**

```python
# Scope metadata (TM-BOM alignment + existing System Context data)
data_sensitivity = ArrayField(
    models.CharField(max_length=10),
    default=list, blank=True,
    help_text="Values: pii, phi, fin, ip, cred, biz, gov, pci, op",
)
exposure = models.CharField(
    max_length=20, blank=True,
    help_text="internal or external",
)
tier = models.CharField(
    max_length=30, blank=True,
    help_text="mission_critical, business_critical, important, non_critical",
)
scope_locked = models.BooleanField(default=False)
scope_locked_at = models.DateTimeField(null=True, blank=True)

# Publication metadata (TM-BOM alignment)
frozen = models.BooleanField(default=False)
released_at = models.DateTimeField(null=True, blank=True)
product_release_date = models.DateTimeField(null=True, blank=True)
release_docs_link = models.URLField(blank=True)
reviewed_at = models.DateTimeField(null=True, blank=True)
repo_link = models.URLField(blank=True)
```

**Note on `criticality` field:** Current Precogly `ThreatModel.criticality` uses LOW/MEDIUM/HIGH/CRITICAL. TM-BOM `scope.business_criticality` uses minimal/low/moderate/high/maximal (5 levels). Expand choices to include all 5 values.

**Step 3: New model for scope assets (SystemContextAsset → ScopeAsset).**

The System Context "Define Assets" modal currently stores assets in workspace_data as JSON objects with `{id, name, description, classification}`. These are definitional — they describe what the system protects. Move to a proper model:

```python
class ScopeAsset(TimestampedModel):
    """Asset that needs protection within the threat model scope."""

    class Classification(models.TextChoices):
        PII = "pii", "PII (Personal Identifiable Information)"
        PHI = "phi", "PHI (Protected Health Information)"
        FINANCIAL = "financial", "Financial Data"
        CREDENTIALS = "credentials", "Credentials / Secrets"
        INTELLECTUAL_PROPERTY = "intellectual_property", "Intellectual Property"
        BUSINESS_CRITICAL = "business_critical", "Business Critical"
        PUBLIC = "public", "Public"
        OTHER = "other", "Other"

    threat_model = models.ForeignKey(
        "diagrams.ThreatModel",
        on_delete=models.CASCADE,
        related_name="scope_assets",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    classification = models.CharField(
        max_length=30,
        choices=Classification.choices,
        default=Classification.OTHER,
    )

    class Meta:
        ordering = ["name"]
```

**Step 4: New model for out-of-scope items (SystemContextOutOfScopeItem → OutOfScopeItem).**

```python
class OutOfScopeItem(TimestampedModel):
    """Component or area explicitly excluded from the threat model scope."""

    threat_model = models.ForeignKey(
        "diagrams.ThreatModel",
        on_delete=models.CASCADE,
        related_name="out_of_scope_items",
    )
    name = models.CharField(max_length=255)
    reason = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]
```

**Step 5: What stays in workspace_data.**

After cleanup, `workspace_data` contains ONLY UI workflow state:

```
workspace_data = {
  progressChecklist: [
    { id, label, checked, autoComputed }
  ],
}
```

Everything else is in proper DB columns/models.

#### Frontend refactoring

The `useWorkspaceThreatAnalysis` hook currently reads/writes all workspace state to `workspace_data` via a debounced PATCH. After this change:

- **Scope fields** (`description`, `data_sensitivity`, `exposure`, `tier`, `scope_locked`) → read/write directly to ThreatModel fields via the existing `useUpdateThreatModel` mutation
- **ScopeAsset CRUD** → new API endpoints (`/threat-models/{id}/scope-assets/`)
- **OutOfScopeItem CRUD** → new API endpoints (`/threat-models/{id}/out-of-scope-items/`)
- **Status, criticality** → already on ThreatModel, stop duplicating in workspace_data
- **progressChecklist** → remains in workspace_data (it's UI state)
- **`assets_defined` checklist item** → currently `autoComputed: false` (manual checkbox) because assets lived in a JSON blob with no clean way to query existence. Once `ScopeAsset` is a proper model, change to `autoComputed: true` — computed as `ScopeAsset.objects.filter(threat_model=tm).exists()`. This makes all 8 checklist items auto-computed; no manual checkboxes remain.

The `SystemContextModal`, `AssetsModal`, and `OutOfScopeModal` components refactored to call API endpoints instead of updating local state that gets batched into workspace_data.

#### DFD Editor "System Scope" Node

The DFD editor has a `systemScope` node type that acts as a visual container on the canvas. It's frontend-only (stored in `DFD.canvas_data` JSON, no backend model). It maps conceptually to TM-BOM's `scope` object — both represent "the system being modeled." On export, `systemScope` node metadata (`owner`, `classification`) is preserved in `extensions.precogly.org/diagrams` alongside the rest of the canvas data. No schema changes needed for this element.

### 4.8 Component & DataFlow: Additional Fields

**Add to `OrgsystemComponent`:**

```python
# Actor-specific fields
actor_type = models.CharField(
    max_length=20, blank=True,
    help_text="TM-BOM actor type: system, user, power_user, administrator, engineer, third_party",
)
permissions = models.TextField(
    blank=True,
    help_text="Free-form description of permissions available to this actor",
)

# DataStore-specific fields
data_store_type = models.CharField(
    max_length=20, blank=True,
    help_text="sql, key_value, document, object, graph, time_series",
)

# Component-specific fields
parent_component = models.ForeignKey(
    "self",
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name="child_components",
    help_text="Parent component for hierarchical composition",
)
repo_link = models.URLField(blank=True)
description = models.TextField(blank=True)
```

**Add to `DataFlow`:**

```python
description = models.TextField(blank=True)
has_sensitive_data = models.BooleanField(default=False)
```

### 4.9 Diagram Type Extension

The TM-BOM schema defines diagram types as: `graphviz`, `mermaid`, `plantuml`, `svg`.

For Precogly round-trip, we use the `extensions` field to store ReactFlow canvas data:

```json
{
  "diagrams": [
    {
      "title": "System Architecture",
      "type": "mermaid",
      "source": "flowchart TB\n  ..."
    }
  ],
  "extensions": {
    "precogly.org/diagrams": [
      {
        "dfd_id": "uuid",
        "title": "Level 1 DFD",
        "diagram_type": "level1",
        "canvas_data": { "nodes": [...], "edges": [...], "viewport": {...} }
      }
    ]
  }
}
```

On import, if `precogly.org/diagrams` extension exists, restore full DFD canvas data. Otherwise, create analysis-only components from the TM-BOM structural data (no canvas positioning).

---

## 5. Bidirectional Field Mapping Tables

### 5.1 ThreatModel ↔ Top-Level

| TM-BOM Field | Precogly Field | Direction | Notes |
|---|---|---|---|
| `version` | `ThreatModel.version` | Bidirectional | Direct (existing field) |
| `scope.title` | `ThreatModel.name` | Bidirectional | Direct (existing field) |
| `scope.description` | `ThreatModel.description` | Bidirectional | Existing field — moved out of workspace_data.systemContext.description |
| `scope.business_criticality` | `ThreatModel.criticality` | Bidirectional | Value mapping (see 5.14) |
| `scope.data_sensitivity` | `ThreatModel.data_sensitivity` | Bidirectional | New field |
| `scope.exposure` | `ThreatModel.exposure` | Bidirectional | New field |
| `scope.tier` | `ThreatModel.tier` | Bidirectional | New field |
| `description` | `ThreatModel.description` | Bidirectional | Same field as scope.description (TM-BOM has both — use the longer one) |
| `frozen` | `ThreatModel.frozen` | Bidirectional | New field (replaces scope_locked conceptually) |
| `released_at` | `ThreatModel.released_at` | Bidirectional | New field |
| `product_release_date` | `ThreatModel.product_release_date` | Bidirectional | New field |
| `release_docs_link` | `ThreatModel.release_docs_link` | Bidirectional | New field |
| `reviewed_at` | `ThreatModel.reviewed_at` | Bidirectional | New field |
| `repo_link` | `ThreatModel.repo_link` | Bidirectional | New field |
| *(no equivalent)* | `ThreatModel.scope_locked` | Export only | Precogly-specific scope lock, preserved in extensions |
| *(no equivalent)* | `ThreatModel.scope_locked_at` | Export only | Precogly-specific, preserved in extensions |
| *(no equivalent)* | `ScopeAsset[]` | Export only | Precogly scope assets, preserved in extensions |
| *(no equivalent)* | `OutOfScopeItem[]` | Export only | Precogly exclusions, preserved in extensions |

### 5.2 TrustZone ↔ TrustZone

| TM-BOM Field | Precogly Field | Notes |
|---|---|---|
| `symbolic_name` | Generated/stored slug | Generated on export, stored on import |
| `title` | `TrustZone.name` | Direct |
| `description` | `TrustZone.description` | Direct |
| *(no equivalent)* | `TrustZone.parent` | Nesting not supported natively in TM-BOM. On export: auto-generate a `trust_boundary` between parent and child zones (TM-BOM-idiomatic representation of nesting). Also preserved in `extensions.precogly.org/trust-zone-hierarchy` for exact round-trip |
| *(no equivalent)* | `TrustZone.trust_level` | 0-100 scale not in TM-BOM. Preserved in extensions |

### 5.3 TrustBoundary ↔ TrustBoundary

Trust boundaries are **directional**: `zone_a` → `zone_b`. A→B and B→A are distinct records with potentially different security controls (e.g., inbound authentication vs outbound data loss prevention). The `unique_together` constraint allows both directions to coexist.

| TM-BOM Field | Precogly Field | Notes |
|---|---|---|
| `trust_zone_a` | `TrustBoundary.zone_a` FK | Source zone (crossing FROM). Resolved via symbolic_name |
| `trust_zone_b` | `TrustBoundary.zone_b` FK | Destination zone (crossing TO). Resolved via symbolic_name |
| `access_control_methods` | `TrustBoundary.access_control_methods` | Direct ArrayField |
| `authentication_methods` | `TrustBoundary.authentication_methods` | Direct ArrayField |
| `access_token_expires` | `TrustBoundary.access_token_expires` | Direct |
| `access_token_ttl` | `TrustBoundary.access_token_ttl` | Direct |
| `has_refresh_token` | `TrustBoundary.has_refresh_token` | Direct |
| `refresh_token_expires` | `TrustBoundary.refresh_token_expires` | Direct |
| `refresh_token_ttl` | `TrustBoundary.refresh_token_ttl` | Direct |
| `can_user_logout` | `TrustBoundary.can_user_logout` | Direct |
| `can_system_logout` | `TrustBoundary.can_system_logout` | Direct |

### 5.4 Actor ↔ OrgsystemComponent

| TM-BOM Field | Precogly Field | Notes |
|---|---|---|
| `symbolic_name` | Generated/stored slug | — |
| `title` | `OrgsystemComponent.name` | Direct |
| `description` | `OrgsystemComponent.description` | New field |
| `type` | `OrgsystemComponent.actor_type` | New field |
| `permissions` | `OrgsystemComponent.permissions` | New field |
| `trust_zone` | `OrgsystemComponent.trust_zone` FK | Resolved via symbolic_name |
| — | `OrgsystemComponent.category` | Set to `human_actor` (user/power_user/administrator/engineer) or `system_actor` (system/third_party) |

### 5.5 Component ↔ OrgsystemComponent

| TM-BOM Field | Precogly Field | Notes |
|---|---|---|
| `symbolic_name` | Generated/stored slug | — |
| `title` | `OrgsystemComponent.name` | Direct |
| `description` | `OrgsystemComponent.description` | New field |
| `trust_zone` | `OrgsystemComponent.trust_zone` FK | Resolved via symbolic_name |
| `parent_component` | `OrgsystemComponent.parent_component` FK | New field, resolved via symbolic_name |
| `repo_link` | `OrgsystemComponent.repo_link` | New field |
| — | `OrgsystemComponent.category` | Set to `process` |

### 5.6 DataStore ↔ OrgsystemComponent

| TM-BOM Field | Precogly Field | Notes |
|---|---|---|
| `symbolic_name` | Generated/stored slug | — |
| `title` | `OrgsystemComponent.name` | Direct |
| `description` | `OrgsystemComponent.description` | New field |
| `type` | `OrgsystemComponent.data_store_type` | New field |
| `vendor` | `OrgsystemComponent.provider` | Existing field (reused) |
| `product` | `OrgsystemComponent.component_type` | Existing field (reused) |
| `trust_zone` | `OrgsystemComponent.trust_zone` FK | Resolved via symbolic_name |
| — | `OrgsystemComponent.category` | Set to `datastore` |

### 5.7 TM-BOM DataSet ↔ Precogly DataAsset (no rename)

TM-BOM `data_sets` maps to Precogly `DataAsset` at the import/export boundary. Model names differ but the field mapping is straightforward:

| TM-BOM Field | Precogly Field | Notes |
|---|---|---|
| `symbolic_name` | Generated/stored slug | — |
| `title` | `DataAsset.name` | Direct (existing field) |
| `description` | `DataAsset.description` | New field |
| `data_sensitivity` | `DataAsset.data_sensitivity` | New ArrayField |
| `access_control_methods` | `DataAsset.access_control_methods` | New ArrayField |
| `record_count` | `DataAsset.record_count` | New field |
| `placements[].data_store` | `ComponentDataAsset.component` FK | Resolved via symbolic_name to datastore component. On export, only `ComponentDataAsset` rows where `component.category == 'datastore'` are included as placements |
| `placements[].encrypted` | `ComponentDataAsset.encrypted` | New field on existing join table |
| *(no equivalent)* | `DataAsset.classification` | Existing Precogly field, preserved in `extensions.precogly.org/data-asset-details` |
| *(no equivalent)* | `DataAsset.confidentiality/integrity/availability` | Existing CIA triad ratings, preserved in extensions (complementary to data_sensitivity) |
| *(no equivalent)* | `ComponentDataAsset.data_state` | Existing Precogly field (at_rest/processed), preserved in extensions |
| *(no equivalent)* | `DataFlowAsset` (entire join table) | Precogly-specific: data assets in transit through data flows. Preserved in `extensions.precogly.org/data-flow-assets` on export. No TM-BOM equivalent |

### 5.8 DataFlow ↔ DataFlow

| TM-BOM Field | Precogly Field | Notes |
|---|---|---|
| `symbolic_name` | Generated/stored slug | — |
| `title` | `DataFlow.label` | Direct |
| `description` | `DataFlow.description` | New field |
| `source.type` | Inferred from `source_component.category` | On export: human_actor/system_actor → "actor", datastore → "data_store", process → "component" |
| `source.name` | `DataFlow.source_component` FK | Resolved via symbolic_name |
| `destination.type` | Inferred from `dest_component.category` | Same mapping as source |
| `destination.name` | `DataFlow.dest_component` FK | Resolved via symbolic_name |
| `has_sensitive_data` | `DataFlow.has_sensitive_data` | New field |
| `encrypted` | `DataFlow.encrypted` | Existing field |

### 5.9 Threat ↔ ComponentInstanceThreat / DataFlowInstanceThreat

| TM-BOM Field | Precogly Field | Notes |
|---|---|---|
| `symbolic_name` | Generated/stored slug | — |
| `title` | `threat_name` (or `ThreatLibrary.name`) | Direct |
| `description` | `threat_description` (or `ThreatLibrary.description`) | Direct |
| `components_affected` | Multiple `ComponentInstanceThreat` records | One record per affected component |
| `threat_persona` | `ComponentInstanceThreat.threat_persona` FK | New field |
| `event` | `ComponentInstanceThreat.event` | New field |
| `sources` | `ComponentInstanceThreat.threat_sources` | New ArrayField |
| `attack_mechanisms` | `ThreatLibraryTaxonomyEntry` rows where `taxonomy.slug="capec"` | Resolved via unified taxonomy M2M |
| `weaknesses` | `ThreatLibraryTaxonomyEntry` rows where `taxonomy.slug="cwe"` | Resolved via unified taxonomy M2M |
| *(no equivalent)* | `ThreatLibraryTaxonomyEntry` rows where `taxonomy.slug="stride"` | Precogly-specific, preserved in extensions on export. No rows created on TM-BOM import. |

### 5.10 Control ↔ ComponentInstanceCountermeasure / FlowInstanceCountermeasure

| TM-BOM Field | Precogly Field | Notes |
|---|---|---|
| `symbolic_name` | Generated/stored slug | — |
| `title` | `countermeasure_name` (or `CountermeasureLibrary.name`) | Direct |
| `description` | `countermeasure_description` (or `CountermeasureLibrary.description`) | Direct |
| `threats` | Derived from `instance_threat` → threat linkage | Export: group by countermeasure, collect threats |
| `trust_boundary` | Derived from component trust zone crossings | Export: identify which boundary the control protects |
| `status` | Merged from instance statuses | See status mapping table below |
| `priority` | `ComponentInstanceCountermeasure.priority` | New field |

**Control Status Mapping:**

With the expanded status enum (Section 4.6), import/export is now a **direct 1:1 mapping** — no lossy conversion needed:

| TM-BOM Status | Precogly Status | Direction |
|---|---|---|
| `assumed` | `assumed` | Bidirectional |
| `active` | `active` | Bidirectional |
| `suggested` | `suggested` | Bidirectional |
| `under_review` | `under_review` | Bidirectional |
| `approved` | `approved` | Bidirectional |
| `scheduled` | `scheduled` | Bidirectional |
| `retired` | `retired` | Bidirectional |
| `wont_do` | `wont_do` | Bidirectional |

**Export merge strategy (multiple instances → one control):**

When multiple per-component instances of the same countermeasure have different statuses, merge using worst-case priority (using post-migration status values from Section 4.6):
1. If ANY instance is `suggested` → export as `suggested`
2. Else if ANY instance is `under_review` or `scheduled` → export as `under_review`
3. Else if ALL instances are `wont_do` or `retired` → export as `retired`
4. Else if ALL instances are `active` or `approved` or `assumed` → export as `active`

### 5.11 Risk ↔ RiskAssessment

| TM-BOM Field | Precogly Field | Notes |
|---|---|---|
| `symbolic_name` | Generated/stored slug | — |
| `title` | `RiskAssessment.name` | Direct |
| `description` | `RiskAssessment.description` | Direct |
| `threats` | `RiskAssessment.component_threats` / `flow_threats` M2M | Resolved via symbolic_name |
| `likelihood` | `RiskAssessment.likelihood` | Direct |
| `impact` | `RiskAssessment.impact` | Direct |
| `impact_description` | `RiskAssessment.impact_description` | Direct |
| `score` | `RiskAssessment.score` | Direct |
| `level` | `RiskAssessment.level` | Direct |

### 5.12 Assumption ↔ Assumption

| TM-BOM Field | Precogly Field |
|---|---|
| `description` | `Assumption.description` |
| `validity` | `Assumption.validity` |
| `topics` | `Assumption.topics` |

### 5.13 ThreatPersona ↔ ThreatPersona

| TM-BOM Field | Precogly Field |
|---|---|
| `symbolic_name` | Generated/stored slug |
| `title` | `ThreatPersona.name` |
| `description` | `ThreatPersona.description` |
| `is_person` | `ThreatPersona.is_person` |
| `skill_level` | `ThreatPersona.skill_level` |
| `access_level` | `ThreatPersona.access_level` |
| `malicious_intent` | `ThreatPersona.malicious_intent` |
| `applicability_to_org` | `ThreatPersona.applicability_to_org` |

### 5.14 Criticality Value Mapping

| TM-BOM `business_criticality` | Precogly `criticality` |
|---|---|
| `minimal` | `minimal` (new) |
| `low` | `low` |
| `moderate` | `medium` |
| `high` | `high` |
| `maximal` | `critical` |

---

## 6. Import Logic

### 6.1 Validation

Before importing, validate the uploaded file against the TM-BOM JSON schema. Return structured validation errors if the file is invalid (missing required fields, wrong types, invalid enum values).

### 6.2 Import Modes

- **Create New**: Import creates a new ThreatModel and all child entities. Default mode.
- **Replace Existing**: Delete all existing child data for a ThreatModel and re-import. For when users re-upload an updated file. (Since all data is replaceable, this is safe.)

### 6.3 Object Creation Order

Dependencies must be resolved in order:

```
1. ThreatModel (from scope + top-level metadata)
2. TrustZones (from trust_zones[])
3. TrustBoundaries (from trust_boundaries[] — references zones)
4. OrgsystemComponents — actors (from actors[] — references zones)
5. OrgsystemComponents — components (from components[] — references zones, parent_component)
6. OrgsystemComponents — data_stores (from data_stores[] — references zones)
7. DataAssets + ComponentDataAssets (from data_sets[] — mapped to DataAsset/ComponentDataAsset, references data_stores)
8. DataFlows (from data_flows[] — references actors/components/data_stores)
9. ThreatPersonas (from threat_personas[])
10. Threats → ComponentInstanceThreat / DataFlowInstanceThreat
    (from threats[] — references components, threat_personas)
11. Controls → ComponentInstanceCountermeasure / FlowInstanceCountermeasure
    (from controls[] — references threats, trust_boundaries)
12. RiskAssessments (from risks[] — references threats)
13. Diagrams → stored in DFD or extensions
14. Assumptions (from assumptions[])
```

### 6.4 Symbolic Name Resolution

Every TM-BOM entity uses `symbolic_name` for cross-references. During import, build a resolution map:

```python
symbolic_name_map = {
    "trust_zone": {"control-plane": <TrustZone pk=1>, ...},
    "actor": {"end-user": <OrgsystemComponent pk=5>, ...},
    "component": {"api-gateway": <OrgsystemComponent pk=6>, ...},
    "data_store": {"audit-log-store": <OrgsystemComponent pk=9>, ...},
    "threat_persona": {"malware-operator": <ThreatPersona pk=2>, ...},
    "threat": {"container-escape": <ComponentInstanceThreat pk=14>, ...},
    "control": {"rate-limiting": <CountermeasureLibrary pk=3>, ...},
    "risk": {"availability-dos-risk": <RiskAssessment pk=1>, ...},
}
```

Store the `symbolic_name` on each imported object (new field or in JSONField) for export round-trip fidelity.

### 6.5 Threat Import: Expanding components_affected

A single TM-BOM threat with `components_affected: ["api-gateway", "auth-service", "session-orchestrator"]` creates 3 `ComponentInstanceThreat` records — one for each component. All share the same threat metadata, persona, event, and sources.

If a `components_affected` entry refers to a data_store or actor, the ComponentInstanceThreat is still created since they're all OrgsystemComponents in Precogly.

If `components_affected` is empty or not provided, create the threat without component associations (stored at threat-model level for reference).

**STRIDE on import:** TM-BOM threats do not include STRIDE classification. On import, no `ThreatLibraryTaxonomyEntry` rows are created for the STRIDE taxonomy. TM-BOM `attack_mechanisms` create CAPEC taxonomy entries and `weaknesses` create CWE taxonomy entries via the unified taxonomy M2M. Optionally, a best-effort CAPEC → STRIDE inference can be applied post-import (published mappings exist), but this should be flagged as inferred, not authoritative.

### 6.6 Control Import: Expanding to Per-Instance

A single TM-BOM control with `threats: ["resource-exhaustion-dos", "control-plane-unauthorized-session"]` must be mapped to countermeasure instances.

**Algorithm:**
1. Create/find `CountermeasureLibrary` entry from the control's title/description
2. For each threat in the control's `threats[]`:
   - Find all `ComponentInstanceThreat` records for that threat
   - For each, create a `ComponentInstanceCountermeasure` with the imported status and priority
3. Similarly for `DataFlowInstanceThreat` records

### 6.7 Error Handling

- **Missing references**: If a `components_affected` entry references a symbolic_name that wasn't found in components/actors/data_stores, log a warning and skip that association (don't fail the whole import).
- **Duplicate symbolic_names**: Reject the file with a validation error.
- **Partial failure**: Wrap the entire import in a database transaction. If any step fails fatally, roll back everything.

---

## 7. Export Logic

### 7.1 Symbolic Name Generation

For entities created in Precogly (not imported from TM-BOM), generate symbolic_names:

```python
def generate_symbolic_name(name: str) -> str:
    """Convert 'API Gateway' → 'api-gateway'"""
    return re.sub(r'[^0-9a-z]+', '-', name.lower()).strip('-')
```

If an entity was originally imported and has a stored symbolic_name, use that for round-trip fidelity.

Ensure uniqueness within each entity type. Append `-2`, `-3` etc. for collisions.

### 7.2 Multi-DFD Flattening

A Precogly ThreatModel may have multiple DFDs. On export, all components, data flows, and threats across all DFDs are flattened into a single TM-BOM file. If the same component appears in multiple DFDs (same `component_library`), it exports as one component.

### 7.3 Control Merging

Multiple `ComponentInstanceCountermeasure` / `FlowInstanceCountermeasure` records that share the same `CountermeasureLibrary` (or same `countermeasure_name` if orphaned) merge into a single TM-BOM control:

```python
def merge_control_status(instances: list[Countermeasure]) -> str:
    """Merge per-instance statuses into a single TM-BOM control status.
    Uses post-migration status values (Section 4.6).
    """
    statuses = {i.status for i in instances}
    if "suggested" in statuses:
        return "suggested"
    if statuses & {"under_review", "scheduled"}:
        return "under_review"
    if statuses <= {"retired", "wont_do"}:
        return "retired"
    if statuses <= {"active", "approved", "assumed"}:
        return "active"
    return "under_review"  # mixed states default


def merge_control_priority(instances: list[Countermeasure]) -> str:
    priorities = [i.priority for i in instances if i.priority != "none"]
    if not priorities:
        return "none"
    # Return highest priority
    order = ["critical", "high", "medium", "low", "none"]
    return min(priorities, key=lambda p: order.index(p))
```

### 7.4 Data Flow Endpoint Type Resolution

```python
CATEGORY_TO_TMBOM_TYPE = {
    "human_actor": "actor",
    "system_actor": "actor",
    "process": "component",
    "datastore": "data_store",
}
```

### 7.5 Trust Zone Nesting Export

Precogly supports nested trust zones but TM-BOM does not. On export, flatten all zones into peers, auto-generate trust boundaries for parent→child pairs (the TM-BOM-idiomatic representation of nesting per OWASP TM Library maintainer guidance), and preserve exact hierarchy in extensions:

```python
# Export all zones as flat peer list
export_data["trust_zones"] = [
    {
        "symbolic_name": generate_symbolic_name(zone.name),
        "title": zone.name,
        "description": zone.description,
    }
    for zone in all_zones  # includes nested zones at all depths
]

# Auto-generate trust boundaries for parent→child zone pairs
# This is the TM-BOM-idiomatic way to express "you must cross from
# the outer zone to reach the inner zone"
# Direction: parent (zone_a) → child (zone_b), representing inbound crossing
nesting_boundaries = []
for zone in all_zones:
    if zone.parent:
        parent_sym = generate_symbolic_name(zone.parent.name)
        child_sym = generate_symbolic_name(zone.name)
        # Check if a user-defined boundary already exists in EITHER direction
        # (boundaries are directional, so check both A→B and B→A)
        existing = TrustBoundary.objects.filter(
            zone_a__name=zone.parent.name, zone_b__name=zone.name
        ).first() or TrustBoundary.objects.filter(
            zone_a__name=zone.name, zone_b__name=zone.parent.name
        ).first()
        if not existing:
            nesting_boundaries.append({
                "trust_zone_a": parent_sym,
                "trust_zone_b": child_sym,
                "access_control_methods": [],
                "authentication_methods": [],
                "extensions": {
                    "precogly.org/auto-generated": True,
                    "precogly.org/nesting-boundary": True,
                },
            })
# Append to any user-defined trust boundaries already in export_data
export_data.setdefault("trust_boundaries", []).extend(nesting_boundaries)

# Additionally preserve exact hierarchy in extensions for Precogly round-trip
zone_hierarchy = {}
for zone in all_zones:
    if zone.parent:
        parent_sym = generate_symbolic_name(zone.parent.name)
        child_sym = generate_symbolic_name(zone.name)
        zone_hierarchy[child_sym] = {
            "parent": parent_sym,
            "trust_level": zone.trust_level,
        }

if zone_hierarchy:
    export_data.setdefault("extensions", {})
    export_data["extensions"]["precogly.org/trust-zone-hierarchy"] = zone_hierarchy
```

### 7.6 Diagram Export

Export DFD canvas data in the `extensions` field (see also Section 4.9):

```python
# DFDs are linked via ThreatModelDFD bridge table
dfds = DFD.objects.filter(threat_model_associations__threat_model=threat_model)

export_data["extensions"] = {
    "precogly.org/diagrams": [
        {
            "dfd_id": str(dfd.id),
            "title": dfd.name,
            "diagram_type": dfd.diagram_type,
            "canvas_data": dfd.canvas_data,
        }
        for dfd in dfds
    ]
}
```

Optionally, also generate a mermaid diagram from the topology for non-Precogly consumers:

```python
if generate_mermaid:
    export_data["diagrams"] = [{
        "title": f"{threat_model.name} - Architecture",
        "type": "mermaid",
        "source": generate_mermaid_from_topology(components, data_flows, trust_zones)
    }]
```

### 7.7 Entities With No TM-BOM Home

The following Precogly data is **excluded from the main export** but preserved in `extensions`:

| Precogly Entity | Export Handling |
|---|---|
| `ThreatModel.status` (workflow) | `extensions.precogly.org/workflow.status` |
| `ThreatModel.trigger` | `extensions.precogly.org/workflow.trigger` |
| `ThreatModel.modeling_mode` | `extensions.precogly.org/workflow.modeling_mode` |
| `ThreatModel.scope_locked` | `extensions.precogly.org/scope.scope_locked` |
| `ThreatModel.scope_locked_at` | `extensions.precogly.org/scope.scope_locked_at` |
| `ScopeAsset[]` | `extensions.precogly.org/scope.assets` |
| `OutOfScopeItem[]` | `extensions.precogly.org/scope.out_of_scope_items` |
| `ThreatModel.workspace_data` (progressChecklist only) | `extensions.precogly.org/workspace` |
| DFD `canvas_data` | `extensions.precogly.org/diagrams` |
| Trust zone nesting hierarchy | `extensions.precogly.org/trust-zone-hierarchy` |
| Trust zone `trust_level` (0-100) | `extensions.precogly.org/trust-zone-hierarchy[].trust_level` |
| Per-instance control details | `extensions.precogly.org/control-details` |
| `ThreatModelReferenceImage[]` | `extensions.precogly.org/reference-images` (see Section 7.8) |
| `ComponentLibrary` linkage | Not exported (instances are self-sufficient) |
| `VerificationTest` / evidence | Not exported |
| `PentestFinding` | Not exported |
| Compliance mappings | Not exported (potential future TM-BOM extension) |

### 7.8 Reference Images Export

`ThreatModelReferenceImage` stores uploaded raster images (JPEG, PNG, WebP) — whiteboard photos, architecture screenshots, supplementary diagrams. TM-BOM's `diagrams` array only supports text-based formats (`graphviz`, `mermaid`, `plantuml`, `svg`) with a `source` string field, so raster images have no TM-BOM home.

**Export:** Store in extensions with base64-encoded image data:

```python
import mimetypes

export_data.setdefault("extensions", {})
export_data["extensions"]["precogly.org/reference-images"] = [
    {
        "filename": img.filename,
        "description": img.description,
        "content_type": mimetypes.guess_type(img.filename)[0] or "image/png",
        "data": base64_encode(img.image.read()),
    }
    for img in threat_model.reference_images.all()
]
```

> **Note:** The `ThreatModelReferenceImage` model has `description` (not `caption`) and no `content_type` field. Content type is inferred from the filename at export time.

**Import:** If `precogly.org/reference-images` extension exists, decode and create `ThreatModelReferenceImage` records. Otherwise, no reference images are created.

**Note:** Base64-encoding images inflates the exported JSON file size (~33% overhead). For large threat models with many reference images, consider an alternative: export as a ZIP containing the JSON plus image files, with the extension holding relative paths instead of inline data. This is a future optimization — start with base64 for simplicity.

---

## 8. API Design

### 8.1 Endpoints

```
POST   /api/threat-models/import-tmbom/
  - Request: multipart/form-data with JSON file
  - Response: { threat_model_id, summary: { components: N, threats: N, ... }, warnings: [] }

POST   /api/threat-models/{id}/import-tmbom/
  - Replace-import into existing threat model
  - Request: multipart/form-data with JSON file
  - Response: { threat_model_id, summary, warnings }

GET    /api/threat-models/{id}/export-tmbom/
  - Response: TM-BOM JSON file download
  - Query params: ?include_mermaid=true (optional generated diagram)

POST   /api/threat-models/validate-tmbom/
  - Dry-run validation without importing
  - Request: multipart/form-data with JSON file
  - Response: { valid: bool, errors: [], warnings: [], preview: { components: N, ... } }
```

### 8.2 Permissions

Import and export follow existing threat model permissions. Users must have edit access to import, and view access to export.

---

## 9. Frontend Design

### 9.1 Import Flow

**Entry points (two):**

1. **Threat model list page** — "Import from TM-BOM" button in the page header (next to "New Threat Model"). This is for importing a TM-BOM file as a new threat model.
2. **Workspace header** — "Import" button in the toolbar (grouped with Export). This could import into the current threat model as a new version or merge — but for v1, only the list page entry point is needed.

```
Threat Models                                    [Import from TM-BOM] [+ New Threat Model]
```

**Flow:**
1. **Upload** — File picker dialog, accepts `.json` files only
2. **Validate** — Call `validate-tmbom` endpoint. Show a preview summary:
   - Entity counts (components, threats, controls, trust zones, data flows, etc.)
   - Validation warnings (missing references, unknown extensions, etc.)
   - Schema version detected
3. **Confirm** — User reviews preview and confirms import
4. **Result** — Navigate to the newly created threat model's workspace

### 9.2 Export Flow

**Entry point:** "Export" button in the workspace header toolbar.

```
< Threat Models / CRM System / Workspace    [v1 ▾] [Draft ▾]  [Import] [Export] [Share] [System Context] [Delete] [Submit for Review]
```

**Flow:**
1. Click "Export"
2. Dropdown or dialog with options:
   - Format: TM-BOM JSON (only option for now, but dropdown allows future formats)
   - Optional: "Include generated Mermaid diagram" checkbox
   - Optional: "Include Precogly extensions" checkbox (default on — preserves round-trip data)
3. Download JSON file named `{threat-model-name}-tmbom-v{version}.json`

### 9.3 UI for New Entities

The following new entities need UI in the workspace:

- **Threat Personas** — New section in workspace, possibly under System Context or a new tab
- **Assumptions** — New section, likely alongside System Context
- **Risk Assessments** — The planned Risk Analysis tab
- **Trust Boundary edge type in DFD editor** — New `trustBoundary` edge type between trust zone nodes with edit panel for auth/access control metadata (see Section 4.1 for full spec)
- **Data Assets** — Enhanced section showing data sensitivity, placements, access controls, and record counts (new TM-BOM fields on existing DataAsset model)

### 9.4 Threat Analysis Screen Changes

The three-column layout (components | threats | countermeasures) stays the same. New data slots into existing UI patterns.

#### Left Sidebar: Component Tree with Nesting

**Current (flat lists):**
```
Components & Boundaries
  👤 User
  🔧 Amazon API Gateway
  λ  AWS Lambda
  🪣 S3 Bucket
  ⚙  AWS WAF
Trust Boundaries
  ○ Internal
  ○ External
Data Flows
  → API Gateway → User
```

**Proposed (nested under trust zones, under connected systems):**
```
CRM System                              ← connected Orgsystem (outermost)
  🌐 External                           ← trust zone
    👤 User                              ← actor, inside this zone
  🔒 Internal Network                   ← trust zone
    🔧 Amazon API Gateway               ← component
    λ  AWS Lambda                        ← component
    🪣 S3 Bucket                         ← datastore
    ⚙  AWS WAF                          ← component
Data Flows
  → API Gateway → User
```

Components and actors nest under their parent trust zone. Trust zones nest under their parent system. This gives users a clear visual hierarchy that mirrors the actual architecture.

**Multi-system threat models (process threat modeling):**

When a threat model spans multiple connected systems (e.g., modeling a payment flow across services), the sidebar groups by system:

```
Payment Service                         ← Orgsystem 1
  🌐 DMZ
    🔧 Payment Gateway
  🔒 Internal
    🔧 Transaction Processor
Fraud Detection Service                 ← Orgsystem 2
  🔒 Internal
    🤖 ML Engine
    🔧 Rules Engine
Data Flows
  → Payment Gateway → Transaction Processor
  → Transaction Processor → ML Engine   ← cross-system flow
```

**Edge case — no connected system:** If the threat model has no `ThreatModelOrgsystem` associations, components still nest under trust zones. The system grouping level is simply absent:

```
🌐 External
  👤 User
🔒 Internal Network
  🔧 API Gateway
  λ  Lambda
Data Flows
  → ...
```

**Edge case — component not in any trust zone:** Shown under an "Unassigned" section at the top, prompting the user to place it.

#### Threats Column: Taxonomy Badges + References

**Current:**
```
● API Gateway Input Injection          addressable  ✕
  Tampering
```

**After:**
```
● API Gateway Input Injection          addressable  ✕
  Tampering · Information Disclosure   ← STRIDE taxonomy entries (multiple)
  ▸ Attack References  3              ← expandable (collapsed by default)
    CAPEC
    [CAPEC-66]  SQL Injection
    [CAPEC-108] Command Line Execution through SQL Injection
    CWE
    [CWE-89]   Improper Neutralization of SQL
  🎭 Malware Operator                 ← threat persona (if linked)
```

The taxonomy entries are grouped by taxonomy slug (STRIDE shown as inline badges, CAPEC/CWE shown in expandable section). This mirrors how compliance mappings work under countermeasures — a collapsible row with a count badge, expanding to show grouped references. Default view stays clean.

Since all taxonomies use the same model, a threat linked to EMB3D or MITRE ATT&CK entries would show those taxonomies in the expandable section too — no UI changes needed per taxonomy.

**Event** (trigger description) and **threat sources** (adversary/human_error/etc.) go in a threat detail drawer or tooltip, not on the main list view.

#### Countermeasures Column: Expanded Statuses

**Current buttons:** `Gap` | `Planned` | `Waived`

**After (8 statuses):** Too many for inline buttons. Use a dropdown selector or grouped button set:

```
Status: [Suggested ▾]
  ─────────────
  Suggested       ← needs attention
  Scheduled
  Under Review
  Approved
  Active          ← implemented
  Assumed
  Retired
  Won't Do
```

The status legend at the top of the column also updates to reflect the expanded set, likely grouped by severity color (red for gaps/suggested, yellow for in-progress, green for active/approved, blue for retired/won't do).

---

## 10. Edge Cases

### 10.1 Import Edge Cases

| Edge Case | Handling |
|---|---|
| **Duplicate symbolic_names within an entity type** | Reject file with validation error |
| **Circular parent_component references** | Detect cycles during import, reject with error |
| **Threat referencing non-existent component** | Log warning, create threat without that component association |
| **Control referencing non-existent threat** | Log warning, skip that threat association |
| **Empty required arrays** (e.g., `trust_zones: []`) | Accept — schema allows empty arrays for required array fields |
| **Very large files** (1000+ components) | Stream parsing. Set reasonable limits (configurable). Timeout protection |
| **Non-ASCII symbolic_names** | Reject — schema pattern is `^[0-9a-z-]+$` |
| **Multiple data_flows between same endpoints** | Allowed — create multiple DataFlow records |
| **Control with no matching component-threat instances** | Create CountermeasureLibrary entry but no instances. Log warning |
| **Re-import of previously imported file** | In "Create New" mode: creates duplicate. In "Replace" mode: deletes and recreates |
| **Threats with no STRIDE taxonomy entries** | Normal for TM-BOM imports. No STRIDE `ThreatLibraryTaxonomyEntry` rows created. Optional CAPEC→STRIDE inference can be offered post-import |
| **Import of flat zones into system with nested zones** | All imported zones created at top level (no parent). If `precogly.org/trust-zone-hierarchy` extension exists, restore nesting. Trust boundaries between zones are imported as `TrustBoundary` DB records regardless of whether they represent nesting or user-defined crossings. Boundaries marked `precogly.org/auto-generated: true` are skipped if nesting is restored (to avoid redundant boundary records for parent→child pairs that are now expressed via the `parent` FK). Existing nested zones in other threat models unaffected |

### 10.2 Export Edge Cases

| Edge Case | Handling |
|---|---|
| **Component name collision on symbolic_name generation** | Append suffix: `api-gateway`, `api-gateway-2` |
| **Orphaned threats (no threat_library)** | Export using copied metadata (threat_name, threat_description) |
| **Orphaned countermeasures** | Export using copied metadata |
| **Threats with no CAPEC/CWE taxonomy entries** | Export with empty `attack_mechanisms` and `weaknesses` arrays |
| **Dismissed threats** | Exclude from export (they represent user decisions to ignore) |
| **Components not in any trust zone** | Assign to a generated "unassigned" trust zone on export |
| **Multi-DFD with duplicate components** | Deduplicate by component_library or name |
| **Empty threat model (no components)** | Valid export — produces minimal TM-BOM with empty arrays |
| **Nested trust zones** | Flattened to flat peer list. For each parent→child pair, a `trust_boundary` is auto-generated between them (TM-BOM-idiomatic nesting representation). Auto-generated boundaries are marked `precogly.org/auto-generated: true` and `precogly.org/nesting-boundary: true`. If a user-defined boundary already exists between the pair, no duplicate is created. Exact hierarchy additionally preserved in `extensions.precogly.org/trust-zone-hierarchy` for Precogly round-trip |
| **Trust zone `trust_level` (0-100)** | No TM-BOM equivalent. Preserved in extensions |
| **Countermeasure instances with no common library** | Each becomes its own control (no merging) |

### 10.3 Round-Trip Edge Cases

| Edge Case | Handling |
|---|---|
| **Precogly → TM-BOM → Precogly** | Extensions preserve Precogly-specific data. Core data round-trips via field mapping |
| **TM-BOM → Precogly → TM-BOM** | Symbolic names preserved. Field ordering may differ. Semantically identical |
| **Import file with `extensions` from another tool** | Preserve unknown extensions on export (pass-through) |
| **Concurrent import and edit** | Database transaction isolation. Import is atomic |

---

## 11. Potential Regression Issues

### 11.1 Trust Zone/Boundary Rename

**Risk:** Every piece of code that references `TrustBoundary` or `trust_boundary` must be updated. ~40+ files across the codebase.

**Affected areas by layer:**

| Layer | Files | What changes |
|---|---|---|
| **Backend model** | `systems/models.py` | `class TrustBoundary` → `TrustZone`, `OrgsystemComponent.trust_boundary` FK → `.trust_zone`, `DataFlow.crosses_trust_boundary` → `.crosses_trust_zone` |
| **Backend serializer** | `systems/serializers.py` | `TrustBoundarySerializer` → `TrustZoneSerializer`, field names on component/flow serializers |
| **Backend views** | `systems/views.py` | `TrustBoundaryViewSet` → `TrustZoneViewSet`, `.select_related()`, filtersets |
| **Backend URLs** | `systems/urls.py` | `/trust-boundaries/` → `/trust-zones/` |
| **Backend admin** | `systems/admin.py` | `TrustBoundaryAdmin` → `TrustZoneAdmin`, list display/filters |
| **Backend threat registry** | `organizations/threat_registry.py` | `TRUST_BOUNDARY_THREATS`, `compute_threats_for_trust_boundary()`, `trustBoundary` node processing |
| **Database migration** | `systems/migrations/0001_initial.py` | New migration to rename table and columns |
| **Frontend types** | `types/domain.ts`, `dfd-editor/types/diagram.ts` | `TrustBoundaryType`, `TrustBoundaryConfig`, `TRUST_BOUNDARY_TYPE_CONFIG`, `TRUST_BOUNDARY_ZONE_TYPES`, `TrustBoundaryNodeData`, `isTrustBoundaryNode()` |
| **Frontend DFD components** | `TrustBoundaryNode.tsx`, `index.ts`, `NodeEditPanel.tsx`, `EdgeEditPanel.tsx`, `DataFlowEdge.tsx`, `DiagramToolbar.tsx` | Node type `'trustBoundary'` → `'trustZone'`, component names, imports, conditional rendering |
| **Frontend hooks/lib** | `useParentRelationships.ts`, `useKeyboardShortcuts.ts`, `technology-registry.ts`, `technology-combobox.tsx` | Node type checks, technology mappings |
| **Frontend API/state** | `api/components.ts`, `useWorkspaceThreatAnalysis.ts` | `trustBoundary` field → `trustZone`, boundary calculations |
| **Frontend threat analysis** | `ThreatAnalysisView.tsx`, `ComponentView.tsx` | Node type filters, constants |
| **Library pack templates** | 13 template YAML files across aws-mini, aws, azure, gcp, banking packs | `trustBoundary` node type in canvas_data → `trustZone` |
| **Canvas data in DB** | All saved DFD JSON blobs | `trustBoundary` node type strings → `trustZone` (data migration) |
| **Docs** | `DATABASE.md`, `DBWalkthrough.md`, `REDESIGN-OF-DFD-EDITOR.md`, `FEATURE-THREATS-IN-DFD.md` | Terminology updates |

**Mitigation:**
- Mechanical rename with five search-and-replace passes: `TrustBoundary` → `TrustZone`, `trustBoundary` → `trustZone`, `trust_boundary` → `trust_zone`, `trust-boundaries` → `trust-zones`, `TRUST_BOUNDARY` → `TRUST_ZONE`. Manual review after each pass.
- Database migration renames the table and columns.
- Canvas data migration: update `trustBoundary` node type strings in all DFD JSON blobs.
- Pack template YAML: update all 13 template files.
- Since all data is test data, aggressive migration is safe.
- **Important:** After the rename, the name `TrustBoundary` is immediately reused for the new edge-between-zones model (Section 4.1). The rename pass must complete fully before introducing the new model to avoid name collisions. Run in sequence: (1) rename all existing `TrustBoundary` → `TrustZone`, (2) create new `TrustBoundary` relationship model, (3) add new `trustBoundary` edge type to DFD editor.

### 11.2 DataAsset Field Additions (No Rename)

**Risk:** Adding new fields (`threat_model` FK, `description`, `data_sensitivity`, `access_control_methods`, `record_count`) to `DataAsset` and `encrypted` to `ComponentDataAsset` changes API response shapes.

**Mitigation:** All new fields are optional/nullable — existing API consumers won't break. Frontend types updated to include new optional fields. No table or column renames needed. Since all data is test data, migration is safe. The TM-BOM `data_sets` ↔ `DataAsset` naming difference is handled entirely at the import/export boundary layer.

### 11.3 ThreatLibrary Field Changes: Unified Taxonomy Model

**Risk:** Replacing `stride_category` (single CharField), `source` (single), and `source_id` (single) with the unified taxonomy model (`ExternalTaxonomy` + `TaxonomyEntry` + `ThreatLibraryTaxonomyEntry` M2M) is a significant structural change across backend, frontend, and library packs.

**Affected areas:**
- `ThreatLibrary`, `ComponentInstanceThreat`, `DataFlowInstanceThreat` — drop `stride_category`, `source`, `source_id` fields; taxonomy data now accessed via M2M join
- All serializers that expose stride_category, source, source_id — must serialize taxonomy entries grouped by taxonomy slug instead
- Frontend components that display STRIDE badges (currently expect a single string, must handle array of taxonomy entries)
- Frontend filtering/grouping by STRIDE (currently exact match on a field, must query via M2M)
- All library pack YAML files — `stride_category`/`source`/`source_id` keys replaced with `taxonomy_references` dict
- New pack type: `taxonomy` — taxonomy packs (STRIDE, CAPEC, CWE, etc.) must be created and importable via Libraries UI
- `import_pack` command — must handle `taxonomy.yaml` files and `taxonomy_references` in threats.yaml
- `ComponentLibraryThreat` association logic — threat generation must copy taxonomy M2M entries to instances
- `LibraryPack` model — new `pack_type` choice: `TAXONOMY`

**Mitigation:**
- Create 3 new models (`ExternalTaxonomy`, `TaxonomyEntry`, `ThreatLibraryTaxonomyEntry`)
- Seed STRIDE as a built-in taxonomy pack (6 entries)
- Migration converts existing `stride_category` and `source`/`source_id` values to taxonomy M2M rows
- Drop old columns after migration (all data is test data, clean cut)
- Update all threat pack YAML files to `taxonomy_references` format
- Create taxonomy pack YAML files for STRIDE, CAPEC, CWE
- Update `import_pack` command to handle both taxonomy packs and `taxonomy_references` on threats
- Frontend STRIDE display updated from single badge to multiple taxonomy entry badges
- Add `taxonomy` to `LibraryPack.PackType` choices
- Since all data is test data, no backward compatibility shims needed

### 11.4 Component Model Bloat

**Risk:** Adding `actor_type`, `permissions`, `data_store_type`, `parent_component`, `repo_link`, `description` to `OrgsystemComponent` makes it a large model with many nullable fields that only apply to certain categories.

**Mitigation:** This is acceptable for now — these fields are simple and nullable. The alternative (separate Actor/DataStore models) would require splitting a unified component model and breaking the DataFlow FK design. Revisit if the field count becomes unmanageable.

### 11.5 workspace_data Cleanup: Frontend Refactoring

**Risk:** Moving definitional data out of `workspace_data` into proper DB columns/models requires refactoring the `useWorkspaceThreatAnalysis` hook and all components that read/write system context data.

**Affected areas:**
- `useWorkspaceThreatAnalysis.ts` — currently reads/writes `status`, `criticality`, `frameworks`, `systemContext.description`, `systemContext.assets`, `systemContext.outOfScopeItems`, `systemContext.scopeLocked` into `workspace_data`. All of these must be redirected to proper API calls.
- `SystemContextModal.tsx` — currently saves scope data to workspace_data.systemContext. Must be refactored to call ThreatModel PATCH for description/scope_locked and new CRUD endpoints for ScopeAsset/OutOfScopeItem.
- `AssetsModal.tsx` — currently manages `workspace_data.systemContext.assets[]` as a JSON array. Must be refactored to use `/threat-models/{id}/scope-assets/` CRUD endpoints.
- `OutOfScopeModal.tsx` — currently manages `workspace_data.systemContext.outOfScopeItems[]`. Must be refactored to use `/threat-models/{id}/out-of-scope-items/` CRUD endpoints.
- `SystemContextCard.tsx` — reads system context from workspace state. Must read from ThreatModel fields + related models.
- Frontend types (`threat-analysis.ts`) — `SystemContext`, `SystemContextAsset`, `SystemContextOutOfScopeItem`, `WorkspaceThreatAnalysis` interfaces all need updating.
- Backend serializer initialization — the default `workspace_data` structure in `ThreatModelSerializer.create()` must be simplified to only `{ "progress_checklist": [] }`.

**Mitigation:** Since all data is test data, no migration of existing workspace_data content is needed. The change is a clean cut: remove the old fields from workspace_data, add new endpoints, refactor frontend to use them. The `useWorkspaceThreatAnalysis` hook becomes much simpler — it only manages `progressChecklist` via workspace_data, while all other state comes from the ThreatModel instance and related querysets.

### 11.6 Serializer / API Changes

**Risk:** New fields on existing models change API response shapes. Frontend must be updated to handle new fields.

**Mitigation:**
- All new fields are optional/nullable — existing API consumers won't break
- Frontend types updated to include new optional fields
- djangorestframework-camel-case handles snake_case → camelCase conversion automatically

---

## 12. Unintended Consequences

### 12.1 Trust Zone/Boundary Separation Affects DFD Editor

The DFD editor currently draws "trust boundary" boxes on the canvas. After the rename, these are "trust zones." Two distinct changes are required:

**Change 1 — Rename (mechanical):**
- Node type rename in ReactFlow: `trustBoundary` → `trustZone` in canvas_data and node registry
- Toolbar label: "Trust Boundary" → "Trust Zone"
- Edit panel: all references to "boundary" in the zone edit panel → "zone"
- Canvas data migration: update all saved DFD JSON blobs

**Change 2 — New Trust Boundary edge type (new feature):**
- New `trustBoundary` edge type added to React Flow's `edgeTypes` registry
- New "Trust Boundary" **mode toggle** button in the toolbar (grouped with "Draw Connection")
- Toolbar-first creation: click button → click zone A → click zone B → boundary edge appears as a bold dashed line between zone borders
- Modes are mutually exclusive: "Trust Boundary" mode and "Draw Connection" mode cannot be active simultaneously (same pattern as existing mode toggle behavior)
- New `TrustBoundaryEdge.tsx` with custom border-to-border rendering (not center-to-center)
- New `TrustBoundaryEdgeEditPanel.tsx` with auth/access control metadata form
- Secondary access: Trust Zone edit panel shows read-only "Boundaries" section with Edit links
- DFD sync creates `TrustBoundary` DB records from canvas edge data
- Full specification in Section 4.1

**Risk of confusion:** Users familiar with "trust boundary" (meaning a zone/area) will see the term repurposed to mean the crossing between zones. Mitigations:
- Toolbar tooltip on "Trust Zone": *"A security zone that contains components (e.g., DMZ, Internal Network)"*
- Toolbar tooltip on "Trust Boundary": *"A security crossing between two trust zones — defines authentication and access control"*
- First-time usage hint: brief explainer toast when the user first adds a trust zone or boundary
- The two toolbar items are visually separated: Trust Zone is in the node creation group, Trust Boundary is in the mode toggle group (next to Draw Connection)

### 12.2 Per-Instance Controls Create Export Ambiguity

When multiple instances of the same countermeasure have different statuses, the worst-case merge strategy produces a conservative export. This means:

- A threat model with 99 `active` instances and 1 `suggested` instance exports the control as `suggested` (effectively saying it's not implemented)
- Users may be surprised that their "mostly done" control appears as a suggestion in the export

**Mitigation:** Include a per-component breakdown in `extensions`:
```json
"extensions": {
  "precogly.org/control-details": {
    "rate-limiting": {
      "global_status": "suggested",
      "instance_statuses": {
        "api-gateway × resource-exhaustion-dos": "active",
        "orchestrator × resource-exhaustion-dos": "suggested"
      }
    }
  }
}
```

### 12.3 Import Bypasses Threat Generation Engine

When importing from TM-BOM, threats and controls are explicitly defined in the file. Precogly's auto-generation engine (`_generate_threats_for_component` from ComponentLibraryThreat associations) is NOT invoked during import — the imported threats ARE the threats.

**Risk:** If a user imports a TM-BOM file, then later drags the imported components onto a DFD, the sync engine might try to auto-generate additional threats from library associations, duplicating or conflicting with imported threats.

**Mitigation:**
- Imported components are created as analysis-only (`threat_model` FK set, not linked to DFD nodes)
- If later placed on a DFD, the sync engine should check for existing threats before generating new ones (idempotency check using threat_name or CAPEC/CWE match)
- Consider a flag: `component.imported_from_tmbom = True` to suppress auto-generation

### 12.4 Risk Assessment Model and Risk Analysis Tab Scope

The `RiskAssessment` model is designed for TM-BOM interop but will also power the planned Risk Analysis tab. The Risk Analysis tab may have additional requirements beyond what TM-BOM provides (e.g., risk matrices, risk treatment plans, residual risk tracking).

**Risk:** Designing the RiskAssessment model solely for TM-BOM compliance may under-serve the Risk Analysis tab.

**Mitigation:** The TM-BOM risk fields (likelihood, impact, score, level, impact_description) are foundational and align with standard risk assessment practices. The Risk Analysis tab can extend this model with additional fields later without breaking TM-BOM interop. Design the model as a starting point, not the final state.

### 12.5 Symbolic Name Storage Overhead

Storing `symbolic_name` on every entity (for round-trip fidelity) adds a CharField to many models. For entities created natively in Precogly (not imported), this field is empty until first export.

**Mitigation:** Make it nullable, blank, and only populate on import or first export. Add a db_index for efficient lookup during export. Alternatively, store the mapping in a single JSONField on the ThreatModel (avoids adding columns to every model).

**Recommended approach:** Store a `tmbom_metadata` JSONField on `ThreatModel` containing the full symbolic_name mapping:
```python
tmbom_metadata = models.JSONField(
    default=dict, blank=True,
    help_text="TM-BOM import/export metadata including symbolic_name mappings",
)
```

This avoids adding columns to every model and keeps the TM-BOM concern isolated.

### 12.6 workspace_data Cleanup Changes Save Semantics

The current `useWorkspaceThreatAnalysis` hook uses a **debounced batch save** — all workspace state is collected and PATCHed to `workspace_data` in one request. After the cleanup, scope-related operations become **individual API calls** (PATCH for scope fields, POST/PUT/DELETE for ScopeAsset and OutOfScopeItem). This changes the save semantics from "eventual batch" to "immediate per-action."

**Risk:** Users accustomed to the batched save may notice different timing. Also, network errors on individual save calls need handling (the current batch approach is all-or-nothing).

**Mitigation:** Use TanStack Query's `useMutation` with optimistic updates for ScopeAsset/OutOfScopeItem CRUD — the UI responds immediately while the API call happens in the background. Errors trigger a rollback with a toast notification. This is actually more reliable than the current debounced batch approach, which can lose data if the user navigates away during the debounce window.

### 12.7 Schema Evolution Coordination

TM-BOM is based on OWASP Threat Model Library Schema v1.0, which may evolve. The schema already has a noted discrepancy (actors and data_stores in samples include `trust_zone` but the formal schema doesn't define it).

**Risk:** Future schema versions may add/remove/change fields, breaking our import/export.

**Mitigation:**
- Validate against a pinned schema version (v1.0)
- Check the `$schema` field on import to determine which version to use
- Design the importer/exporter as a versioned module so v1.1+ support can be added without rewriting v1.0

---

## 13. Workspace UI Impact

This section catalogs every UI change needed in the threat model workspace to support TM-BOM entities. The workspace currently has four tabs: **Overview**, **Threat Analysis**, **Risk Analysis**, and **Reports**. Changes are organized by where they appear.

### 13.1 Workspace Header

**Current:**
```
< Threat Models / CRM System / Workspace    [v1 ▾] [Draft ▾]  [Share] [System Context] [Delete] [Submit for Review]
```

**After:**
```
< Threat Models / CRM System / Workspace    [v1 ▾] [Draft ▾]  [Import] [Export] [Share] [System Context] [Delete] [Submit for Review]
```

| Change | Details |
|---|---|
| **Import button** | Opens file picker → validate → preview → confirm flow (see Section 9.1). Available only when threat model is in Draft or In Progress status. |
| **Export button** | Downloads TM-BOM JSON with format/options dropdown (see Section 9.2). Available in any status. |

### 13.2 Overview Tab

The Overview tab shows threat model metadata and scope. The following fields need to be added or changed:

| Field | Current State | Required Change |
|---|---|---|
| **Criticality** | 4-value dropdown (low/medium/high/critical) | Expand to 5 values — add `minimal` to match TM-BOM `business_criticality` |
| **Data Sensitivity** | Not present | New multi-select field: pii, phi, fin, ip, cred, biz, gov, pci, op (maps to `scope.data_sensitivity`) |
| **Exposure** | Not present | New dropdown: internal / external |
| **Tier** | Not present | New dropdown: mission\_critical / business\_critical / important / non\_critical |
| **Repo Link** | Not present | New URL input field |
| **Frozen** | Not present | Read-only indicator shown when `frozen: true` (set during export or by admin action) |
| **Released At / Reviewed At** | Not present | Date fields, possibly in a "Publication" section |

**Scope Assets and Out-of-Scope Items** currently live in modals writing to `workspace_data` JSON. After the backend migration to proper `ScopeAsset` and `OutOfScopeItem` models, the modals should use CRUD API calls instead of JSON blob writes. The UI interaction (modal with add/edit/delete) remains the same.

### 13.3 Threat Analysis Tab — Left Sidebar

**Current:** Flat lists of components, trust boundaries (actually zones), and data flows.

**After:** Nested hierarchy (see Section 9.4 for full spec). Additional changes:

| Change | Details |
|---|---|
| **"Trust Boundaries" label → "Trust Zones"** | Rename in sidebar heading |
| **Trust Boundaries section (new)** | New section below Trust Zones listing directional boundary edges (e.g., "External → Internal"). Clicking one selects the boundary edge on the DFD and opens its edit panel. |
| **Actor sub-type indicator** | Show actor type (user/admin/engineer/etc.) as a subtitle or badge, once the `actor_type` field is added to `OrgsystemComponent` |
| **Datastore type indicator** | Show datastore type (sql/document/etc.) as a subtitle, once `data_store_type` is added |
| **Component description** | Tooltip or expandable row showing the `description` field when populated |
| **Threat Personas section (new)** | New collapsible section in the sidebar listing personas linked to this threat model. Each shows name + skill level + access level. Clicking opens a detail/edit panel. |
| **Assumptions section (new)** | New collapsible section listing assumptions with validity badges (confirmed/unconfirmed/rejected). Clicking opens detail/edit panel. |

### 13.4 Threat Analysis Tab — Threats Column (Middle)

**Current:** Threat name + single STRIDE badge + exposed/dismissed status.

**After:**

| Change | Details |
|---|---|
| **Multiple STRIDE badges** | A threat can now have multiple STRIDE taxonomy entries (via the unified taxonomy model). Show as inline badges. |
| **Attack References (expandable)** | Collapsible section (default collapsed) showing CAPEC and CWE entries grouped by taxonomy. Format: `[CAPEC-66] SQL Injection`. Count badge on the collapsed header. Same pattern as compliance coverage on countermeasures. |
| **Other taxonomy entries** | Any non-STRIDE taxonomy (MITRE ATT&CK, LINDDUN, EMB3D, etc.) shows in the expandable section grouped by taxonomy slug. No per-taxonomy UI code — the unified model handles all. |
| **Threat Persona link** | Small persona indicator (icon + name) when a threat is linked to a persona. Clicking navigates to the persona in the sidebar. |
| **Event field** | Not shown on the list row (too verbose). Visible in the threat detail drawer/panel when a threat is expanded or edited. |
| **Threat Sources** | Shown as small badges (adversary/human\_error/failure/external) in the threat detail drawer. |

### 13.5 Threat Analysis Tab — Countermeasures Column (Right)

**Current:** 3 inline status buttons (Gap/Planned/Waived) + compliance coverage + owner assignment.

**After:**

| Change | Details |
|---|---|
| **Status dropdown (8 values)** | Replace inline buttons with a dropdown selector: suggested, under\_review, approved, scheduled, active, assumed, retired, wont\_do. Too many for inline buttons. |
| **Status legend** | Update the column header legend from `Platform · Gap · Planned · Waived` to a grouped color scheme: red (suggested), yellow (under\_review/approved/scheduled), green (active/assumed), gray (retired/wont\_do). |
| **Priority field** | New dropdown on each countermeasure: none / low / medium / high / critical. Shown inline next to the status dropdown. |
| **Trust Boundary reference** | When a countermeasure is associated with a trust boundary crossing, show which boundary it protects (e.g., "Protects: External → Internal"). |

### 13.6 Risk Analysis Tab

**Current:** Tab exists in navigation but not fully built.

**After:** The `RiskAssessment` model provides the data layer. The tab needs:

| Element | Details |
|---|---|
| **Risk list** | Table/list of risks with columns: name, likelihood, impact, score, level, linked threats count |
| **Risk detail panel** | Edit form with: name, description, likelihood (5-value enum), impact (5-value enum), impact\_description (text), auto-calculated score (likelihood × impact, 0–25), auto-derived level (low/medium/high/critical based on score bands) |
| **Threat linkage** | Multi-select to link risks to threats. A risk can cover multiple threats. |
| **Risk matrix visualization** | Optional: 5×5 likelihood/impact matrix heatmap showing where risks cluster. Standard risk management visual. |

Note: The Risk Analysis tab will likely have additional requirements beyond TM-BOM (risk treatment plans, residual risk tracking, risk acceptance workflows). This section covers only the TM-BOM-aligned baseline. See Section 12.4 for the scoping consideration.

### 13.7 DFD Editor Changes

Covered in detail in Section 4.1 (Trust Boundary edge type spec) and Section 12.1 (Trust Zone/Boundary separation). Summary of UI impact:

| Change | Details |
|---|---|
| **Toolbar rename** | "Trust Boundary" node button → "Trust Zone" |
| **New toolbar mode toggle** | "Trust Boundary" mode button in the mode toggle group (next to "Draw Connection") |
| **New edge type** | `TrustBoundaryEdge.tsx` — bold dashed line between zone borders |
| **New edit panel** | `TrustBoundaryEdgeEditPanel.tsx` — auth/access control metadata form |
| **Trust Zone edit panel update** | Add read-only "Boundaries" section showing connected boundaries with Edit links |

### 13.8 Data Asset Management

**Current:** Data assets managed via System Context modal, stored as JSON in `workspace_data`.

**After:**

| Change | Details |
|---|---|
| **Proper CRUD UI** | Replace JSON-backed modal with API-driven CRUD (uses new `ScopeAsset` model endpoints) |
| **New fields** | data\_sensitivity (multi-select: pii/phi/fin/ip/cred/biz/gov/pci/op), access\_control\_methods (multi-select: none/acl/rbac/mac/dac/abac), record\_count (number input), description (text area) |
| **Placement view** | Show which components hold this data asset (from `ComponentDataAsset`) with encryption status |
| **Flow view** | Show which data flows transport this data asset (from `DataFlowAsset`) with protection method |

### 13.9 Import/Export UI Components

**New files needed:**

| Component | Purpose |
|---|---|
| `ImportTMBOMDialog.tsx` | Upload → validate → preview → confirm flow. Shows entity counts, warnings, schema version. |
| `ExportTMBOMDialog.tsx` | Format selection, options (include Mermaid diagram, include extensions), download trigger. |
| `ImportPreviewTable.tsx` | Renders the validation preview: table of entity types with counts and any warnings per entity. |

**API hooks needed:**

| Hook | Endpoint | Purpose |
|---|---|---|
| `useValidateTMBOM` | `POST /threat-models/validate-tmbom/` | Upload file, get validation result + preview |
| `useImportTMBOM` | `POST /threat-models/import-tmbom/` | Confirmed import, returns new threat model ID |
| `useExportTMBOM` | `GET /threat-models/{id}/export-tmbom/` | Download TM-BOM JSON |

### 13.10 Summary: New Frontend Files

| File | Section | Description |
|---|---|---|
| `ImportTMBOMDialog.tsx` | 13.9 | Import flow dialog |
| `ExportTMBOMDialog.tsx` | 13.9 | Export options dialog |
| `ImportPreviewTable.tsx` | 13.9 | Validation preview table |
| `ThreatPersonaPanel.tsx` | 13.3 | Sidebar section + detail/edit panel for personas |
| `AssumptionPanel.tsx` | 13.3 | Sidebar section + detail/edit panel for assumptions |
| `TrustBoundaryEdge.tsx` | 13.7 / 4.1 | DFD editor edge renderer |
| `TrustBoundaryEdgeEditPanel.tsx` | 13.7 / 4.1 | DFD editor edge edit panel |
| `RiskAnalysisTab.tsx` | 13.6 | Risk Analysis tab content |
| `RiskDetailPanel.tsx` | 13.6 | Risk edit form |

Existing files that need modification:

| File | Changes |
|---|---|
| `WorkspaceHeader.tsx` | Add Import/Export buttons |
| `DiagramToolbar.tsx` | Rename Trust Boundary → Trust Zone, add Trust Boundary mode toggle |
| `NodeEditPanel.tsx` | Rename zone fields, add "Boundaries" read-only section |
| `ThreatAnalysis.tsx` (or equivalent) | Update sidebar sections, add Threat Persona and Assumption sections, add Trust Boundaries list |
| `ComponentThreatCard.tsx` (or equivalent) | Multiple STRIDE badges, expandable attack references, persona link |
| `CountermeasureCard.tsx` (or equivalent) | Status dropdown (8 values), priority dropdown, boundary reference |
| `SystemContextModal.tsx` | Switch from workspace\_data writes to API calls |
| `AssetsModal.tsx` | Add new TM-BOM fields (data\_sensitivity, access\_control\_methods, etc.) |
| Frontend types (`threat-analysis.ts`, `domain.ts`, `index.ts`) | New types for personas, assumptions, risks, trust boundaries, expanded enums |

---

## Implementation Sequence

### Phase 1: Schema Evolution (Backend)
1. Trust Zone/Boundary separation (rename + new model)
2. DataAsset field additions (add `threat_model` FK, `description`, `data_sensitivity`, `access_control_methods`, `record_count` to DataAsset; add `encrypted` to ComponentDataAsset — no renames)
3. New models: ThreatPersona, Assumption, RiskAssessment
4. Unified taxonomy model: create `ExternalTaxonomy`, `TaxonomyEntry`, `ThreatLibraryTaxonomyEntry` models. Add `TAXONOMY` to `LibraryPack.PackType` choices. Drop `stride_category`, `source`, `source_id` from ThreatLibrary and instance models.
5. Taxonomy packs: create STRIDE taxonomy pack (6 entries), seed CAPEC and CWE taxonomy packs. Update `import_pack` command to handle `taxonomy.yaml` and `taxonomy_references` in threats.yaml. Update all threat pack YAML files to use `taxonomy_references` format.
6. Component/DataFlow: add new fields
7. ThreatModel: add scope metadata fields (`data_sensitivity`, `exposure`, `tier`, `scope_locked`, `scope_locked_at`) and publication fields (`frozen`, `released_at`, `product_release_date`, `release_docs_link`, `reviewed_at`, `repo_link`). Expand `criticality` choices to 5-level enum.
8. New models: ScopeAsset, OutOfScopeItem (replacing workspace_data JSON arrays)
9. Countermeasure: replace status enum (4 old values → 8 TM-BOM-aligned values via data migration), add priority field
10. workspace_data cleanup: simplify backend serializer initialization to `{ "progress_checklist": [] }` only. Remove redundant fields (status, criticality, frameworks, systemContext) from workspace_data default structure.
11. New API endpoints: `/threat-models/{id}/scope-assets/` and `/threat-models/{id}/out-of-scope-items/` (CRUD)
12. Migrations for all of the above

### Phase 2: Import/Export Engine (Backend)
1. TM-BOM JSON schema validation
2. Import logic with symbolic_name resolution
3. Export logic with symbolic_name generation and control merging
4. API endpoints (import, export, validate)
5. Round-trip tests with all 4 sample files

### Phase 3: Frontend Updates

See Section 13 for full workspace UI impact details. Implementation order:

1. Update all trust boundary → trust zone references (Section 13.7)
2. Refactor `useWorkspaceThreatAnalysis` — reduce to only managing `progressChecklist` via workspace_data. All other state reads from ThreatModel fields and related models.
3. Refactor `SystemContextModal`, `AssetsModal`, `OutOfScopeModal` — replace workspace_data JSON writes with proper API calls (ThreatModel PATCH for scope fields, CRUD endpoints for ScopeAsset/OutOfScopeItem).
4. Update frontend types in `threat-analysis.ts` — remove `SystemContext`/`SystemContextAsset`/`SystemContextOutOfScopeItem` from workspace state, replace with API-driven types. Add types for personas, assumptions, risks, trust boundaries, expanded enums.
5. Overview tab: add new scope fields — data sensitivity, exposure, tier, repo link (Section 13.2)
6. Import/export UI: `ImportTMBOMDialog.tsx`, `ExportTMBOMDialog.tsx`, `ImportPreviewTable.tsx`, Import/Export buttons in workspace header and threat model list page (Sections 13.1, 13.9)
7. Trust Boundary edge type in DFD editor: `TrustBoundaryEdge.tsx` (custom border-to-border renderer), `TrustBoundaryEdgeEditPanel.tsx`, toolbar mode toggle, boundary creation mode in `DFDEditor.tsx`, DFD sync for `TrustBoundary` DB records, "Boundaries" section in Trust Zone edit panel (Sections 13.7, 4.1)
8. Threat analysis — threats column: multiple taxonomy badges, expandable attack references, persona link (Section 13.4)
9. Threat analysis — countermeasures column: status dropdown (8 values), priority dropdown, trust boundary reference (Section 13.5)
10. Threat analysis — sidebar: nested hierarchy, Trust Boundaries list section, actor/datastore type indicators (Section 13.3)
11. Data asset management UI — enhanced with new TM-BOM fields: data sensitivity, access control, record count, placement/flow views (Section 13.8)
12. Threat persona management UI — `ThreatPersonaPanel.tsx` in sidebar (Section 13.3)
13. Assumption management UI — `AssumptionPanel.tsx` in sidebar (Section 13.3)
14. (Risk Analysis tab — separate major feature, see Section 13.6 for TM-BOM baseline)

### Phase 4: Testing & Validation
1. Round-trip tests: import all 4 sample files → export → diff
2. Precogly-native round-trip: create in UI → export → import → verify
3. Edge case coverage from Section 10
4. Regression testing for renamed/removed models
5. Verify workspace_data cleanup: confirm only progressChecklist remains in workspace_data, all other fields served by proper DB columns/endpoints

---

## Appendix A: Full Lifecycle Walkthrough

This walkthrough traces a practical example — a **"Payment Processing API"** system using AWS Mini components — through the full lifecycle: importing packs, creating a threat model (with and without DFD), exporting to TM-BOM, and re-importing it. At each step, we show what happens at the **pack YAML**, **database**, **backend API**, and **frontend UI** layers.

The example uses:
- **Taxonomies:** STRIDE, CAPEC, CWE
- **Compliance framework:** PCI-DSS
- **Technology pack:** AWS Mini (API Gateway, Lambda, DynamoDB)

---

### A.1 Step 1: Import Taxonomy Packs (STRIDE, CAPEC, CWE)

An admin user imports the three taxonomy packs via the Libraries UI. Each taxonomy is a library pack with `pack_type: taxonomy`.

#### Pack YAML (what exists on disk)

**STRIDE** — `libraries/packs/stride/pack.yaml`:
```yaml
pack:
  slug: stride
  name: STRIDE Threat Model
  pack_type: taxonomy
  version: 1.0.0
  tier: free
  source: official
```

**STRIDE** — `libraries/packs/stride/taxonomy.yaml`:
```yaml
taxonomy:
  slug: stride
  name: STRIDE Threat Model
  source_url: https://www.microsoft.com/en-us/security/blog/stride
  entries:
    - id: spoofing
      title: Spoofing
    - id: tampering
      title: Tampering
    - id: repudiation
      title: Repudiation
    - id: information-disclosure
      title: Information Disclosure
    - id: denial-of-service
      title: Denial of Service
    - id: elevation-of-privilege
      title: Elevation of Privilege
```

**CAPEC** — `libraries/packs/capec/taxonomy.yaml` (abridged):
```yaml
taxonomy:
  slug: capec
  name: CAPEC - Common Attack Pattern Enumeration
  source_url: https://capec.mitre.org/
  version: "3.9"
  entries:
    - id: "66"
      title: SQL Injection
      description: Exploiting SQL syntax in user input...
    - id: "108"
      title: Command Line Execution through SQL Injection
    # ... hundreds more entries
```

**CWE** — `libraries/packs/cwe/taxonomy.yaml` (abridged):
```yaml
taxonomy:
  slug: cwe
  name: CWE - Common Weakness Enumeration
  source_url: https://cwe.mitre.org/
  version: "4.14"
  entries:
    - id: "89"
      title: "SQL Injection"
    - id: "79"
      title: "Cross-site Scripting (XSS)"
    # ... hundreds more entries
```

#### Database (after import)

```
LibraryPack:
  id=1, slug="stride", pack_type="taxonomy", version="1.0.0"
  id=2, slug="capec",  pack_type="taxonomy", version="3.9"
  id=3, slug="cwe",    pack_type="taxonomy", version="4.14"

ExternalTaxonomy:
  id=1, slug="stride", name="STRIDE Threat Model",    source_pack_id=1
  id=2, slug="capec",  name="CAPEC - Common Attack…", source_pack_id=2
  id=3, slug="cwe",    name="CWE - Common Weakness…", source_pack_id=3

TaxonomyEntry (STRIDE has 6 rows, CAPEC and CWE have hundreds):
  id=1,   taxonomy_id=1, external_id="spoofing",              title="Spoofing"
  id=2,   taxonomy_id=1, external_id="tampering",             title="Tampering"
  id=3,   taxonomy_id=1, external_id="repudiation",           title="Repudiation"
  id=4,   taxonomy_id=1, external_id="information-disclosure", title="Information Disclosure"
  id=5,   taxonomy_id=1, external_id="denial-of-service",     title="Denial of Service"
  id=6,   taxonomy_id=1, external_id="elevation-of-privilege", title="Elevation of Privilege"
  id=100, taxonomy_id=2, external_id="66",                    title="SQL Injection"
  id=101, taxonomy_id=2, external_id="108",                   title="Command Line Execution through SQL Injection"
  id=200, taxonomy_id=3, external_id="89",                    title="SQL Injection"
  id=201, taxonomy_id=3, external_id="79",                    title="Cross-site Scripting (XSS)"
  ... (hundreds more)
```

#### Backend (what happens in the import_pack command)

```python
# Pseudo-code for taxonomy pack import
def import_taxonomy_pack(pack_dir):
    pack_meta = load_yaml(pack_dir / "pack.yaml")
    taxonomy_data = load_yaml(pack_dir / "taxonomy.yaml")

    library_pack = LibraryPack.objects.create(
        slug=pack_meta["slug"],
        pack_type="taxonomy",
        version=pack_meta["version"],
        ...
    )

    taxonomy = ExternalTaxonomy.objects.create(
        source_pack=library_pack,
        slug=taxonomy_data["taxonomy"]["slug"],
        name=taxonomy_data["taxonomy"]["name"],
        source_url=taxonomy_data["taxonomy"].get("source_url", ""),
        version=taxonomy_data["taxonomy"].get("version", ""),
    )

    entries = [
        TaxonomyEntry(
            taxonomy=taxonomy,
            external_id=entry["id"],
            title=entry["title"],
            description=entry.get("description", ""),
        )
        for entry in taxonomy_data["taxonomy"]["entries"]
    ]
    TaxonomyEntry.objects.bulk_create(entries)
```

#### Frontend (what the admin sees)

1. Admin navigates to **Libraries → Import Pack**
2. Selects the STRIDE taxonomy pack → clicks **Import**
3. Success toast: "Imported STRIDE Threat Model (6 entries)"
4. Repeats for CAPEC and CWE packs
5. The Libraries page shows 3 taxonomy packs in a "Taxonomies" section (or filtered by `pack_type`)

---

### A.2 Step 2: Import Compliance Pack (PCI-DSS)

The compliance framework follows the existing pattern — it is its own library pack.

#### Pack YAML (what exists on disk)

```yaml
# libraries/packs/pci-dss/pack.yaml
pack:
  slug: pci-dss-4
  name: PCI DSS v4.0
  pack_type: compliance
  version: 4.0.0
  tier: free
  source: official
```

```yaml
# libraries/packs/pci-dss/framework.yaml
framework:
  slug: pci-dss-4
  name: PCI DSS v4.0
  version: "4.0"
  source_url: https://www.pcisecuritystandards.org/
  sections:
    - code: "1.2.1"
      description: "Restrict inbound and outbound traffic..."
    - code: "3.4.1"
      description: "PAN is secured with strong cryptography..."
    - code: "6.2.4"
      description: "Software engineering techniques prevent common attacks..."
    # ... more sections
```

#### Database (after import)

```
LibraryPack:
  id=4, slug="pci-dss-4", pack_type="compliance", version="4.0.0"

StandardFramework:
  id=1, slug="pci-dss-4", name="PCI DSS v4.0", source_pack_id=4

StandardRequirement:
  id=1, framework_id=1, section_code="1.2.1", description="Restrict inbound and outbound traffic..."
  id=2, framework_id=1, section_code="3.4.1", description="PAN is secured with strong cryptography..."
  id=3, framework_id=1, section_code="6.2.4", description="Software engineering techniques prevent..."
  ...
```

#### Frontend

Same flow as taxonomy packs — admin imports via Libraries UI. The PCI-DSS framework appears under "Compliance Frameworks" on the Libraries page.

---

### A.3 Step 3: Import Technology Pack (AWS Mini)

The technology pack contains components, threats, countermeasures, and joins between them. After the unified taxonomy model is implemented, the threats YAML uses the new `taxonomy_references` format.

#### Pack YAML (updated format)

**pack.yaml** (with taxonomy dependencies):
```yaml
pack:
  slug: aws-mini
  name: AWS Mini
  pack_type: full
  version: 2.0.0
  tier: free
  source: official
  depends_on:
    - stride: "^1.0.0"
    - capec: "^3.0.0"
    - cwe: "^4.0.0"
```

**components.yaml** (unchanged):
```yaml
components:
  - id: api-gateway
    name: Amazon API Gateway
    category: process
    type: API Management
    provider: aws
  - id: lambda
    name: AWS Lambda
    category: process
    type: Serverless Function
    provider: aws
  - id: dynamodb
    name: Amazon DynamoDB
    category: datastore
    type: NoSQL Database
    provider: aws
  # ... s3, sqs
```

**threats.yaml** (new format with taxonomy_references):
```yaml
threats:
  - id: apigw-unauthorized-access
    name: API Gateway Unauthorized Access
    description: |
      Unauthenticated or unauthorized requests reach backend services.
    taxonomy_references:
      stride: [spoofing, elevation-of-privilege]
      capec: [115]
      cwe: [285, 862]

  - id: lambda-injection
    name: Lambda Code Injection
    description: |
      Malicious input exploits Lambda function leading to code execution.
    taxonomy_references:
      stride: [tampering, information-disclosure]
      capec: [66, 108]
      cwe: [89, 78]

  - id: dynamodb-unauthorized-access
    name: DynamoDB Unauthorized Access
    description: |
      Unauthorized access to DynamoDB tables or items.
    taxonomy_references:
      stride: [spoofing, information-disclosure]
      capec: [122]
      cwe: [285]
  # ... more threats
```

**countermeasures.yaml** (unchanged):
```yaml
countermeasures:
  - id: apigw-cognito-auth
    name: API Gateway Cognito Authorizer
    description: Enforce Cognito-based authentication...
    control_type: preventive
  - id: lambda-input-validation
    name: Lambda Input Validation
    description: Validate and sanitize all input...
    control_type: preventive
  # ...
```

**joins/threats-countermeasures.yaml** (unchanged):
```yaml
mappings:
  - threat: apigw-unauthorized-access
    countermeasures:
      - apigw-cognito-auth
      - apigw-api-key
      - apigw-waf
  - threat: lambda-injection
    countermeasures:
      - lambda-input-validation
      - lambda-vpc
      - lambda-code-signing
  # ...
```

**joins/countermeasures-pci-dss.yaml** (new compliance overlay):
```yaml
framework: pci-dss-4

mappings:
  - countermeasure: apigw-cognito-auth
    requirements:
      - "6.2.4"
      - "1.2.1"
    sufficiency: full
  - countermeasure: lambda-input-validation
    requirements:
      - "6.2.4"
    sufficiency: full
  - countermeasure: dynamodb-encryption
    requirements:
      - "3.4.1"
    sufficiency: partial
  # ...
```

#### Database (after import)

```
LibraryPack:
  id=5, slug="aws-mini", pack_type="full", version="2.0.0"

LibraryPackDependency:
  id=1, pack_id=5, dependency_slug="stride", version_spec="^1.0.0"
  id=2, pack_id=5, dependency_slug="capec",  version_spec="^3.0.0"
  id=3, pack_id=5, dependency_slug="cwe",    version_spec="^4.0.0"

ComponentLibrary (component definitions):
  id=1, source_pack_id=5, slug="api-gateway", name="Amazon API Gateway", category="process"
  id=2, source_pack_id=5, slug="lambda",      name="AWS Lambda",         category="process"
  id=3, source_pack_id=5, slug="dynamodb",    name="Amazon DynamoDB",    category="datastore"

ThreatLibrary (threat definitions):
  id=1, source_pack_id=5, slug="apigw-unauthorized-access", name="API Gateway Unauthorized Access"
  id=2, source_pack_id=5, slug="lambda-injection",          name="Lambda Code Injection"
  id=3, source_pack_id=5, slug="dynamodb-unauthorized-access", name="DynamoDB Unauthorized Access"

ThreatLibraryTaxonomyEntry (M2M joins — this is the new part):
  threat_library_id=1, taxonomy_entry_id=1   # apigw-unauthorized-access → stride:spoofing
  threat_library_id=1, taxonomy_entry_id=6   # apigw-unauthorized-access → stride:elevation-of-privilege
  threat_library_id=1, taxonomy_entry_id=150 # apigw-unauthorized-access → capec:115
  threat_library_id=1, taxonomy_entry_id=250 # apigw-unauthorized-access → cwe:285
  threat_library_id=1, taxonomy_entry_id=260 # apigw-unauthorized-access → cwe:862
  threat_library_id=2, taxonomy_entry_id=2   # lambda-injection → stride:tampering
  threat_library_id=2, taxonomy_entry_id=4   # lambda-injection → stride:information-disclosure
  threat_library_id=2, taxonomy_entry_id=100 # lambda-injection → capec:66
  threat_library_id=2, taxonomy_entry_id=101 # lambda-injection → capec:108
  threat_library_id=2, taxonomy_entry_id=200 # lambda-injection → cwe:89
  threat_library_id=2, taxonomy_entry_id=210 # lambda-injection → cwe:78
  ... (more rows for each threat × taxonomy entry)

CountermeasureLibrary:
  id=1, source_pack_id=5, slug="apigw-cognito-auth",      name="API Gateway Cognito Authorizer"
  id=2, source_pack_id=5, slug="lambda-input-validation",  name="Lambda Input Validation"
  id=3, source_pack_id=5, slug="dynamodb-encryption",      name="DynamoDB Encryption"

CountermeasureLibrary.applicable_threats M2M (threat ↔ countermeasure via auto-generated join table):
  threatlibrary_id=1, countermeasurelibrary_id=1  # apigw-unauthorized-access → apigw-cognito-auth
  threatlibrary_id=2, countermeasurelibrary_id=2  # lambda-injection → lambda-input-validation
  ...

CountermeasureLibraryStandard (countermeasure → compliance requirement join):
  countermeasure_library_id=1, requirement_id=3, sufficiency="full"   # cognito → 6.2.4
  countermeasure_library_id=1, requirement_id=1, sufficiency="full"   # cognito → 1.2.1
  countermeasure_library_id=2, requirement_id=3, sufficiency="full"   # input-validation → 6.2.4
  countermeasure_library_id=3, requirement_id=2, sufficiency="partial" # dynamodb-encryption → 3.4.1
```

#### Backend (what happens during import)

```python
# Pseudo-code for full pack import (taxonomy reference resolution)
def import_full_pack(pack_dir):
    pack_meta = load_yaml(pack_dir / "pack.yaml")

    # 1. Verify taxonomy dependencies are already imported
    for dep_slug, version_spec in pack_meta.get("depends_on", []):
        taxonomy = ExternalTaxonomy.objects.get(slug=dep_slug)
        assert semver_matches(taxonomy.source_pack.version, version_spec)

    # 2. Import components (unchanged)
    components_data = load_yaml(pack_dir / "components.yaml")
    for comp in components_data["components"]:
        ComponentLibrary.objects.create(slug=comp["id"], name=comp["name"], ...)

    # 3. Import threats with taxonomy references
    threats_data = load_yaml(pack_dir / "threats.yaml")
    for threat in threats_data["threats"]:
        threat_lib = ThreatLibrary.objects.create(
            slug=threat["id"], name=threat["name"], description=threat["description"],
            source_pack=library_pack,
        )

        # Resolve taxonomy references → create M2M join rows
        for taxonomy_slug, entry_ids in threat.get("taxonomy_references", {}).items():
            taxonomy = ExternalTaxonomy.objects.get(slug=taxonomy_slug)
            for entry_id in entry_ids:
                taxonomy_entry = TaxonomyEntry.objects.get(
                    taxonomy=taxonomy, external_id=str(entry_id)
                )
                ThreatLibraryTaxonomyEntry.objects.create(
                    threat_library=threat_lib,
                    taxonomy_entry=taxonomy_entry,
                )

    # 4. Import countermeasures (unchanged)
    # 5. Import joins: threats↔countermeasures (unchanged)
    # 6. Import compliance overlays: countermeasures↔framework sections (unchanged)
```

#### Frontend (what the admin sees)

1. Admin navigates to **Libraries → Import Pack**
2. System checks dependency packs exist (STRIDE, CAPEC, CWE) — shows green checkmarks
3. Admin clicks **Import** → success: "Imported AWS Mini (5 components, 20 threats, 25 countermeasures)"
4. On the Libraries page, AWS Mini appears under "Technology Packs"
5. Clicking into a threat (e.g., "Lambda Code Injection") shows taxonomy badges: `STRIDE: Tampering, Information Disclosure` | `CAPEC: 66, 108` | `CWE: 89, 78`

---

### A.4 Step 4: Create Threat Model WITH DFD

A user (not admin) creates a threat model for a Payment Processing API.

#### Frontend: Create the Threat Model

1. User clicks **New Threat Model**
2. Fills in:
   - **Name:** "Payment Processing API"
   - **Description:** "Threat model for our PCI-compliant payment processing pipeline"
   - **Criticality:** "High" (maps to TM-BOM `business_criticality: high`)
   - **Data Sensitivity:** [PCI, Financial] (multi-select)
   - **Exposure:** "External"
   - **Connected Systems:** selects their "Payment Service" Orgsystem
   - **Compliance Frameworks:** selects "PCI DSS v4.0"
3. Clicks **Create**

#### Backend: API call

```
POST /api/threat-models/
{
  "name": "Payment Processing API",
  "description": "Threat model for our PCI-compliant payment processing pipeline",
  "criticality": "high",
  "dataSensitivity": ["pci", "fin"],
  "exposure": "external",
  "tier": "business_critical",
  "organizationId": 1,
  "orgsystemIds": [42]
}
```

#### Database

```
ThreatModel:
  id=10, name="Payment Processing API", criticality="high",
  data_sensitivity=["pci","fin"], exposure="external", tier="business_critical",
  status="draft", workspace_data={"progress_checklist": []}

ThreatModelOrgsystem:
  threat_model_id=10, orgsystem_id=42

ThreatModelFramework:
  threat_model_id=10, framework_id=1  # PCI-DSS v4.0
```

#### Frontend: Build the DFD

1. User clicks **Add DFD** in the workspace
2. A new DFD canvas opens (React Flow editor)
3. User drags components from the AWS Mini pack's component library:
   - **Amazon API Gateway** (process) → placed in "DMZ" trust zone
   - **AWS Lambda** (process) → placed in "Private" trust zone
   - **Amazon DynamoDB** (datastore) → placed in "Private" trust zone
4. User creates trust zones on the canvas:
   - **DMZ** trust zone (trust_level: 30)
   - **Private** trust zone (trust_level: 90)
5. User draws data flows:
   - API Gateway → Lambda ("Payment Request")
   - Lambda → DynamoDB ("Store Transaction")
6. User clicks **Save DFD**

#### Database (after DFD creation)

```
DFD:
  id=20, name="Payment Processing DFD"

ThreatModelDFD:
  threat_model_id=10, dfd_id=20

TrustZone (renamed from TrustBoundary — note: current model has no orgsystem FK; scoping TBD):
  id=1, name="DMZ",     trust_level=30
  id=2, name="Private",  trust_level=90

OrgsystemComponent (instances of library components):
  id=100, orgsystem_id=42, name="API Gateway",   category="process",   component_library_id=1, trust_zone_id=1
  id=101, orgsystem_id=42, name="Lambda",         category="process",   component_library_id=2, trust_zone_id=2
  id=102, orgsystem_id=42, name="DynamoDB",        category="datastore", component_library_id=3, trust_zone_id=2

DataFlow:
  id=50, source_component_id=100, dest_component_id=101, label="Payment Request"
  id=51, source_component_id=101, dest_component_id=102, label="Store Transaction"
```

#### Frontend: Run Threat Analysis

1. User clicks **Analyze Threats** (or this happens automatically on DFD save)
2. The backend threat generation engine runs:
   - Looks at each component's `component_library_id`
   - Uses `ComponentLibraryThreat` associations (from `joins/components-threats.yaml`) to find applicable threats
   - Creates `ComponentInstanceThreat` for component-level threats
   - Creates `DataFlowInstanceThreat` for flow-level threats
   - For each threat instance, creates countermeasure instances from `CountermeasureLibrary.applicable_threats` M2M

#### Database (after threat analysis)

```
ComponentInstanceThreat (component-level threats):
  id=200, component_id=100, threat_library_id=1, status="open"   # API Gateway → Unauthorized Access
  id=201, component_id=100, threat_library_id=4, status="open"   # API Gateway → Injection
  id=202, component_id=100, threat_library_id=5, status="open"   # API Gateway → Rate Limit Bypass
  id=203, component_id=101, threat_library_id=2, status="open"   # Lambda → Code Injection
  id=204, component_id=101, threat_library_id=6, status="open"   # Lambda → Privilege Escalation
  id=205, component_id=102, threat_library_id=3, status="open"   # DynamoDB → Unauthorized Access

DataFlowInstanceThreat (flow-level threats):
  id=300, data_flow_id=50, threat_library_id=10, status="open"  # Payment Request flow → MITM
  id=301, data_flow_id=50, threat_library_id=11, status="open"  # Payment Request flow → Replay Attack
  id=302, data_flow_id=51, threat_library_id=12, status="open"  # Store Transaction flow → Eavesdropping

ComponentInstanceCountermeasure (one per threat-countermeasure pair):
  id=400, component_threat_id=200, countermeasure_library_id=1,  status="suggested"  # Unauthorized Access → Cognito Auth
  id=401, component_threat_id=200, countermeasure_library_id=10, status="suggested"  # Unauthorized Access → API Key
  id=402, component_threat_id=200, countermeasure_library_id=11, status="suggested"  # Unauthorized Access → WAF
  id=403, component_threat_id=203, countermeasure_library_id=2,  status="suggested"  # Lambda Injection → Input Validation
  ... (many more)
```

Taxonomy entries are NOT copied to instances — they are accessed via `threat_library.taxonomy_entries` (the M2M through `ThreatLibraryTaxonomyEntry`).

#### Frontend: Threat Analysis Screen

The user now sees the Threat Analysis view:

**Left sidebar** (component tree):
```
▼ Payment Service (system)
  ▼ DMZ (trust zone)
    • API Gateway (3 threats: 3 exposed)
  ▼ Private (trust zone)
    • Lambda (2 threats: 2 exposed)
    • DynamoDB (1 threat: 1 exposed)
  ▼ Data Flows
    • Payment Request (2 threats: 2 exposed)
    • Store Transaction (1 threat: 1 exposed)
```

**Threats column** (clicking "API Gateway"):
```
┌─────────────────────────────────────────────────────────────────────┐
│ API Gateway Unauthorized Access                          [EXPOSED] │
│ STRIDE: Spoofing, Elevation of Privilege                           │
│ ▸ CAPEC: 115  |  CWE: 285, 862                                    │
│                                                                    │
│ Countermeasures:                                                   │
│   • Cognito Authorizer    [suggested ▾]  PCI-DSS: 6.2.4, 1.2.1     │
│   • API Key               [suggested ▾]                             │
│   • WAF                   [suggested ▾]                             │
└─────────────────────────────────────────────────────────────────────┘
```

The user changes countermeasure statuses:
- Cognito Authorizer: suggested → **active** (implemented)
- WAF: suggested → **scheduled** (planned for next sprint)
- Lambda Input Validation: suggested → **active**
- DynamoDB Encryption: suggested → **active**

#### Database (after status updates)

```
ComponentInstanceCountermeasure:
  id=400, status="active"      # Cognito Auth — implemented
  id=401, status="suggested"   # API Key — still needs attention
  id=402, status="scheduled"   # WAF — planned
  id=403, status="active"      # Lambda Input Validation — implemented
  ...
```

Threat status derivation:
- API Gateway Unauthorized Access: has `suggested` (API Key) → **exposed**
- Lambda Code Injection: all countermeasures `active` → **mitigated**
- DynamoDB Unauthorized Access: mix of `active` and `suggested` → **exposed**

---

### A.5 Step 5: Create Threat Model WITHOUT DFD

A user creates a threat model without using the DFD editor — for example, when doing process-based threat modeling from a whiteboard session.

#### Frontend

1. User clicks **New Threat Model** → fills in same scope metadata
2. Instead of creating a DFD, user uploads a **reference image** (photo of a whiteboard DFD)
3. User manually adds components via the component panel (not the canvas):
   - Selects "Amazon API Gateway" from the AWS Mini library
   - Selects "AWS Lambda" from the AWS Mini library
   - Selects "Amazon DynamoDB" from the AWS Mini library
4. User creates trust zones manually
5. User assigns components to trust zones
6. User clicks **Analyze Threats** — same engine runs

#### Database

Identical to Step 4, except:
- No `DFD` or `ThreatModelDFD` record (no canvas data)
- A `ThreatModelReferenceImage` record holds the whiteboard photo
- Components still exist as `OrgsystemComponent` records
- Threat analysis still produces the same `ComponentInstanceThreat` and `ComponentInstanceCountermeasure` records
- Data flows can be created without a DFD via the data flow management UI (a table/list rather than a canvas)

The key insight: the threat analysis engine works on `OrgsystemComponent` and `DataFlow` records, not on DFD canvas data. The DFD is a visual tool for creating those records, but they can also be created directly.

---

### A.6 Step 6: Export to TM-BOM JSON

The user clicks **Export as TM-BOM** in the workspace header.

#### Backend: Export Logic

```python
# Pseudo-code for export
def export_tmbom(threat_model):
    components = OrgsystemComponent.objects.filter(orgsystem__threat_models=threat_model)
    data_flows = DataFlow.objects.filter(orgsystem__threat_models=threat_model)
    trust_zones = TrustZone.objects.filter(orgsystem__threat_models=threat_model)
    threats = ComponentInstanceThreat.objects.filter(component__in=components)
    flow_threats = DataFlowInstanceThreat.objects.filter(data_flow__in=data_flows)
    # ... gather all related data

    return build_tmbom_json(threat_model, components, data_flows, trust_zones, threats, ...)
```

#### Exported TM-BOM JSON

```json
{
  "$schema": "https://github.com/nicktackes/OWASP-Threat-Model-Library/...",
  "version": "1.0.0",
  "scope": {
    "title": "Payment Processing API",
    "description": "Threat model for our PCI-compliant payment processing pipeline",
    "business_criticality": "high",
    "data_sensitivity": ["pci", "fin"],
    "exposure": "external",
    "tier": "business_critical"
  },
  "trust_zones": [
    {
      "symbolic_name": "dmz",
      "title": "DMZ",
      "description": "Internet-facing zone"
    },
    {
      "symbolic_name": "private",
      "title": "Private",
      "description": "Internal protected zone"
    }
  ],
  "trust_boundaries": [],
  "actors": [],
  "components": [
    {
      "symbolic_name": "api-gateway",
      "title": "API Gateway",
      "description": "Amazon API Gateway — API Management",
      "trust_zone": "dmz",
      "repo_link": null,
      "parent_component": null
    },
    {
      "symbolic_name": "lambda",
      "title": "Lambda",
      "description": "AWS Lambda — Serverless Function",
      "trust_zone": "private"
    }
  ],
  "data_stores": [
    {
      "symbolic_name": "dynamodb",
      "title": "DynamoDB",
      "description": "Amazon DynamoDB — NoSQL Database",
      "type": "key_value",
      "vendor": "aws",
      "product": "DynamoDB",
      "trust_zone": "private"
    }
  ],
  "data_sets": [],
  "data_flows": [
    {
      "symbolic_name": "payment-request",
      "title": "Payment Request",
      "source": { "type": "component", "name": "api-gateway" },
      "destination": { "type": "component", "name": "lambda" }
    },
    {
      "symbolic_name": "store-transaction",
      "title": "Store Transaction",
      "source": { "type": "component", "name": "lambda" },
      "destination": { "type": "data_store", "name": "dynamodb" }
    }
  ],
  "threats": [
    {
      "symbolic_name": "apigw-unauthorized-access",
      "title": "API Gateway Unauthorized Access",
      "description": "Unauthenticated or unauthorized requests reach backend services.",
      "attack_mechanisms": [{"capec_id": 115, "capec_title": "Authentication Bypass"}],
      "weaknesses": [{"cwe_id": 285, "cwe_title": "Improper Authorization"}, {"cwe_id": 862, "cwe_title": "Missing Authorization"}],
      "components_affected": ["api-gateway"]
    },
    {
      "symbolic_name": "lambda-injection",
      "title": "Lambda Code Injection",
      "description": "Malicious input exploits Lambda function...",
      "attack_mechanisms": [{"capec_id": 66, "capec_title": "SQL Injection"}, {"capec_id": 108, "capec_title": "Command Line Execution through SQL Injection"}],
      "weaknesses": [{"cwe_id": 89, "cwe_title": "SQL Injection"}, {"cwe_id": 78, "cwe_title": "OS Command Injection"}],
      "components_affected": ["lambda"]
    },
    {
      "symbolic_name": "dynamodb-unauthorized-access",
      "title": "DynamoDB Unauthorized Access",
      "description": "Unauthorized access to DynamoDB tables...",
      "attack_mechanisms": [{"capec_id": 122, "capec_title": "Privilege Abuse"}],
      "weaknesses": [{"cwe_id": 285, "cwe_title": "Improper Authorization"}],
      "components_affected": ["dynamodb"]
    }
  ],
  "controls": [
    {
      "symbolic_name": "cognito-authorizer",
      "title": "API Gateway Cognito Authorizer",
      "description": "Enforce Cognito-based authentication...",
      "status": "active",
      "priority": "high",
      "threats": ["apigw-unauthorized-access"]
    },
    {
      "symbolic_name": "api-key",
      "title": "API Key",
      "description": "Require API key for access...",
      "status": "suggested",
      "priority": "none",
      "threats": ["apigw-unauthorized-access"]
    },
    {
      "symbolic_name": "waf",
      "title": "WAF",
      "description": "Web Application Firewall...",
      "status": "scheduled",
      "priority": "medium",
      "threats": ["apigw-unauthorized-access", "apigw-injection"]
    },
    {
      "symbolic_name": "lambda-input-validation",
      "title": "Lambda Input Validation",
      "description": "Validate and sanitize all input...",
      "status": "active",
      "priority": "high",
      "threats": ["lambda-injection", "dynamodb-injection"]
    }
  ],
  "risks": [],
  "extensions": {
    "precogly.org/workflow": {
      "status": "draft",
      "modeling_mode": "asset"
    },
    "precogly.org/scope": {
      "scope_locked": false,
      "assets": [],
      "out_of_scope_items": []
    },
    "precogly.org/taxonomy-references": {
      "apigw-unauthorized-access": {
        "stride": ["spoofing", "elevation-of-privilege"]
      },
      "lambda-injection": {
        "stride": ["tampering", "information-disclosure"]
      },
      "dynamodb-unauthorized-access": {
        "stride": ["spoofing", "information-disclosure"]
      }
    },
    "precogly.org/trust-zone-hierarchy": {},
    "precogly.org/diagrams": [
      {
        "dfd_id": "20",
        "title": "Payment Processing DFD",
        "diagram_type": "dfd",
        "canvas_data": { "nodes": [...], "edges": [...] }
      }
    ],
    "precogly.org/reference-images": []
  }
}
```

**Key export decisions:**
- **STRIDE** goes to `extensions.precogly.org/taxonomy-references` (TM-BOM has no STRIDE field)
- **CAPEC** maps to TM-BOM `attack_mechanisms` (prefixed as `CAPEC-{id}`)
- **CWE** maps to TM-BOM `weaknesses` (prefixed as `CWE-{id}`)
- **Controls** are merged: if the same `CountermeasureLibrary` appears across multiple component-threat pairs, it becomes one TM-BOM control with multiple `threats[]` entries
- **Control status** maps from Precogly's expanded statuses to TM-BOM's 8 statuses (mostly 1:1 after expansion)
- **DFD canvas data** preserved in extensions for Precogly round-trip
- **PCI-DSS mappings** are NOT in the TM-BOM output (compliance is not part of TM-BOM schema) — they live in the pack library and are re-applied on import

---

### A.7 Step 7: Re-Import the TM-BOM JSON (Round-Trip)

Another user (or the same user in a different org) imports the exported JSON.

#### Frontend: Import Flow

1. User clicks **Import from TM-BOM** on the threat models list page
2. Selects the exported JSON file
3. System calls `POST /api/threat-models/validate-tmbom/`
4. Preview appears:
   ```
   ┌─────────────────────────────────────────────────┐
   │ Import Preview: Payment Processing API           │
   │                                                  │
   │ Trust Zones:      2                              │
   │ Components:       2 (+ 1 data store)             │
   │ Data Flows:       2                              │
   │ Threats:          3                              │
   │ Controls:         4                              │
   │                                                  │
   │ ⚠ Warnings:                                      │
   │   • STRIDE taxonomy references found in          │
   │     extensions — will be applied if STRIDE pack  │
   │     is installed                                 │
   │   • DFD canvas data found in extensions — will   │
   │     restore DFD editor layout                    │
   └─────────────────────────────────────────────────┘
   ```
5. User clicks **Confirm Import**

#### Backend: Import Logic

```python
def import_tmbom(json_data, organization):
    with transaction.atomic():
        # 1. Create ThreatModel from scope
        threat_model = ThreatModel.objects.create(
            name=json_data["scope"]["title"],
            description=json_data["scope"]["description"],
            criticality=json_data["scope"]["business_criticality"],
            data_sensitivity=json_data["scope"]["data_sensitivity"],
            exposure=json_data["scope"]["exposure"],
            tier=json_data["scope"]["tier"],
            organization=organization,
        )

        symbolic_name_map = {}

        # 2. Create TrustZones
        for tz_data in json_data["trust_zones"]:
            tz = TrustZone.objects.create(
                name=tz_data["title"],
                description=tz_data["description"],
                orgsystem=orgsystem,  # auto-created or linked
            )
            symbolic_name_map[("trust_zone", tz_data["symbolic_name"])] = tz

        # 3. Create Components
        for comp_data in json_data["components"]:
            trust_zone = symbolic_name_map[("trust_zone", comp_data["trust_zone"])]
            comp = OrgsystemComponent.objects.create(
                name=comp_data["title"],
                description=comp_data.get("description", ""),
                category="process",
                trust_zone=trust_zone,
                orgsystem=orgsystem,
            )
            symbolic_name_map[("component", comp_data["symbolic_name"])] = comp

        # 4. Create DataStores (as OrgsystemComponent with category="datastore")
        for ds_data in json_data["data_stores"]:
            trust_zone = symbolic_name_map[("trust_zone", ds_data["trust_zone"])]
            ds = OrgsystemComponent.objects.create(
                name=ds_data["title"],
                category="datastore",
                data_store_type=ds_data.get("type", ""),
                provider=ds_data.get("vendor", ""),
                trust_zone=trust_zone,
                orgsystem=orgsystem,
            )
            symbolic_name_map[("data_store", ds_data["symbolic_name"])] = ds

        # 5. Create DataFlows (resolve source/destination from symbolic_name_map)
        for df_data in json_data["data_flows"]:
            source_key = (df_data["source"]["type"], df_data["source"]["name"])
            dest_key = (df_data["destination"]["type"], df_data["destination"]["name"])
            DataFlow.objects.create(
                label=df_data["title"],
                source_component=symbolic_name_map[source_key],
                dest_component=symbolic_name_map[dest_key],
            )

        # 6. Create Threats → ComponentInstanceThreat
        for threat_data in json_data.get("threats", []):
            # Create or find ThreatLibrary entry
            threat_lib, _ = ThreatLibrary.objects.get_or_create(
                slug=threat_data["symbolic_name"],
                defaults={"name": threat_data["title"], "description": threat_data.get("description", "")},
            )

            # Link CAPEC taxonomy entries (from attack_mechanisms)
            # TM-BOM format: [{"capec_id": 66, "capec_title": "SQL Injection"}, ...]
            for mechanism in threat_data.get("attack_mechanisms", []):
                capec_id = str(mechanism["capec_id"])
                try:
                    entry = TaxonomyEntry.objects.get(taxonomy__slug="capec", external_id=capec_id)
                    ThreatLibraryTaxonomyEntry.objects.get_or_create(
                        threat_library=threat_lib, taxonomy_entry=entry
                    )
                except TaxonomyEntry.DoesNotExist:
                    pass  # CAPEC pack not installed — log warning

            # Link CWE taxonomy entries (from weaknesses)
            # TM-BOM format: [{"cwe_id": 89, "cwe_title": "SQL Injection"}, ...]
            for weakness in threat_data.get("weaknesses", []):
                cwe_id = str(weakness["cwe_id"])
                try:
                    entry = TaxonomyEntry.objects.get(taxonomy__slug="cwe", external_id=cwe_id)
                    ThreatLibraryTaxonomyEntry.objects.get_or_create(
                        threat_library=threat_lib, taxonomy_entry=entry
                    )
                except TaxonomyEntry.DoesNotExist:
                    pass  # CWE pack not installed — log warning

            # Create component instance threats
            for comp_symbolic in threat_data.get("components_affected", []):
                comp = (
                    symbolic_name_map.get(("component", comp_symbolic))
                    or symbolic_name_map.get(("data_store", comp_symbolic))
                    or symbolic_name_map.get(("actor", comp_symbolic))
                )
                if comp:
                    cit = ComponentInstanceThreat.objects.create(
                        component=comp, threat_library=threat_lib,
                    )
                    symbolic_name_map[("threat", threat_data["symbolic_name"])] = cit

        # 7. Create Controls → ComponentInstanceCountermeasure
        for ctrl_data in json_data.get("controls", []):
            cm_lib, _ = CountermeasureLibrary.objects.get_or_create(
                slug=ctrl_data["symbolic_name"],
                defaults={"name": ctrl_data["title"], "description": ctrl_data.get("description", "")},
            )

            for threat_symbolic in ctrl_data.get("threats", []):
                # Find all ComponentInstanceThreats for this symbolic threat
                cits = ComponentInstanceThreat.objects.filter(
                    threat_library__slug=threat_symbolic
                )
                for cit in cits:
                    ComponentInstanceCountermeasure.objects.create(
                        component_threat=cit,
                        countermeasure_library=cm_lib,
                        status=ctrl_data.get("status", "suggested"),
                        priority=ctrl_data.get("priority", "none"),
                    )

        # 8. Process extensions (Precogly-specific round-trip data)
        extensions = json_data.get("extensions", {})

        # Restore STRIDE taxonomy references
        stride_refs = extensions.get("precogly.org/taxonomy-references", {})
        for threat_symbolic, taxonomies in stride_refs.items():
            threat_lib = ThreatLibrary.objects.filter(slug=threat_symbolic).first()
            if threat_lib:
                for taxonomy_slug, entry_ids in taxonomies.items():
                    for entry_id in entry_ids:
                        try:
                            entry = TaxonomyEntry.objects.get(
                                taxonomy__slug=taxonomy_slug, external_id=str(entry_id)
                            )
                            ThreatLibraryTaxonomyEntry.objects.get_or_create(
                                threat_library=threat_lib, taxonomy_entry=entry
                            )
                        except TaxonomyEntry.DoesNotExist:
                            pass

        # Restore DFD canvas data
        diagrams_ext = extensions.get("precogly.org/diagrams", [])
        for diagram_data in diagrams_ext:
            dfd = DFD.objects.create(
                name=diagram_data["title"],
                canvas_data=diagram_data["canvas_data"],
            )
            ThreatModelDFD.objects.create(threat_model=threat_model, dfd=dfd)

        # Restore scope data
        scope_ext = extensions.get("precogly.org/scope", {})
        threat_model.scope_locked = scope_ext.get("scope_locked", False)
        threat_model.save()

    return threat_model
```

#### Round-Trip Verification

After re-import, the new threat model contains:
- ✅ Same 2 trust zones (DMZ, Private)
- ✅ Same 3 components (API Gateway, Lambda, DynamoDB) with correct categories and trust zone assignments
- ✅ Same 2 data flows with correct source/destination
- ✅ Same 3 threats with CAPEC and CWE taxonomy links (from TM-BOM fields)
- ✅ STRIDE taxonomy links restored (from extensions)
- ✅ Same 4 controls with correct statuses and threat associations
- ✅ DFD canvas layout restored (from extensions)

**What is NOT round-tripped** (by design):
- PCI-DSS compliance mappings → these live in the pack library, not in the TM-BOM. If the importing org has the PCI-DSS pack and AWS Mini pack installed, compliance mappings are re-derived from the pack joins when the user views countermeasure details
- `ComponentLibrary` linkage → imported components are standalone instances. If the importing org has the AWS Mini pack, a future "re-link to library" feature could match by name/slug
- Internal IDs (database PKs) → new IDs are assigned
- Workflow state (draft/in_review/approved) → reset to "draft" on import
- Progress checklist → reset to defaults

---

### A.8 Summary: Data Flow Through Each Layer

| Stage | Pack YAML | Database | Backend API | Frontend UI |
|---|---|---|---|---|
| **Import taxonomies** | `taxonomy.yaml` with slug + entries | `ExternalTaxonomy` + `TaxonomyEntry` rows | `import_pack` command processes `pack_type=taxonomy` | Libraries page → Import → "6 entries imported" |
| **Import compliance** | `framework.yaml` with sections | `StandardFramework` + `StandardRequirement` rows | `import_pack` processes `pack_type=compliance` | Libraries page → Import → "42 requirements imported" |
| **Import tech pack** | `threats.yaml` with `taxonomy_references` | `ThreatLibrary` + `ThreatLibraryTaxonomyEntry` M2M rows | `import_pack` resolves taxonomy references → creates join rows | Libraries page → Import → "20 threats, 25 countermeasures" |
| **Create threat model** | — | `ThreatModel` + scope fields | `POST /api/threat-models/` | New Threat Model form |
| **Build DFD** | — | `DFD`, `TrustZone`, `OrgsystemComponent`, `DataFlow` | Component/flow CRUD endpoints | React Flow canvas editor |
| **Run threat analysis** | `joins/*.yaml` define what threats apply | `ComponentInstanceThreat` + `ComponentInstanceCountermeasure` rows | Threat generation engine | Threat Analysis screen with taxonomy badges |
| **Update statuses** | — | `ComponentInstanceCountermeasure.status` updates | `PATCH /api/.../countermeasures/{id}/` | Status dropdown per countermeasure |
| **Export TM-BOM** | — | Read all related models | `GET /api/threat-models/{id}/export-tmbom/` → JSON file | "Export as TM-BOM" button → file download |
| **Re-import TM-BOM** | — | Creates all models from JSON | `POST /api/threat-models/import-tmbom/` | Upload → Preview → Confirm → Navigate to new TM |
