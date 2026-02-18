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

> **Important: TM-BOM trust zones are flat.** There is no `parent` field. Precogly supports nested trust zones (via `parent` FK to self), but TM-BOM does not. On export, nested zones are flattened. Nesting hierarchy is preserved in `extensions` for round-trip fidelity.

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
| **DataSet** | `DataAsset` (name, classification, CIA ratings) + `ComponentDataAsset` join table | Missing: `data_sensitivity` array (pii/phi/fin/ip/cred/biz/gov/pci/op), `access_control_methods`, `record_count`, `encrypted` on placements. Existing `ComponentDataAsset` already provides the placement relationship but needs field additions. See Section 3.3 for the data_sets vs data_stores conceptual distinction. |
| **Threat classifications** | `ThreatLibrary.stride_category` (single), `source`/`source_id` (single) | All three become arrays: `stride_categories[]` (a threat can span multiple STRIDE categories), `capec_references[]`, `cwe_references[]`. Old single-value fields (`stride_category`, `source`, `source_id`) are dropped. Pack YAML files updated to match. |
| **Scope metadata** | `ThreatModel.criticality` exists; others missing | Missing: `data_sensitivity[]`, `exposure` (internal/external), `tier` (mission_critical/business_critical/important/non_critical), `business_criticality` as 5-level enum. |
| **DataStore** | `OrgsystemComponent` with `category=datastore` | Missing: `data_store_type` (sql/key_value/document/object/graph/time_series), `vendor`, `product`. Currently the component model has generic `component_type` and `provider` which partially overlap. |
| **Actor** | `OrgsystemComponent` with `category=human_actor/system_actor` | Missing: `actor_type` (system/user/power_user/administrator/engineer/third_party), `permissions` text. |
| **DataFlow** | `DataFlow` model exists | Missing: `has_sensitive_data`, `description`. The `label` field partially covers `title`. |
| **Control status/priority** | `ComponentInstanceCountermeasure.status` (GAP/PLANNED/VERIFIED/WAIVED) | TM-BOM has 8-value status enum and a separate priority field (none/low/medium/high/critical). Precogly countermeasure instances have no priority. |
| **Threat fields** | `ComponentInstanceThreat` + `ThreatLibrary` | Missing on threats: `event` (trigger description), `sources[]` (adversary/human_error/failure/events_beyond_org_control), `threat_persona` linkage, `components_affected` as array. |
| **Top-level metadata** | `ThreatModel` | Missing: `frozen`, `released_at`, `product_release_date`, `release_docs_link`, `reviewed_at`, `repo_link`. |

### 3.3 DataSets vs DataStores: Conceptual Distinction

TM-BOM draws a clear line between **where** data lives and **what** data exists:

- **`data_stores`** = the **physical storage infrastructure**. Examples: "Azure Blob Storage", "PostgreSQL Database", "Redis Cache". Described by `type` (sql, key_value, document, object, graph, time_series), `vendor`, and `product`. Think of these as the containers.

- **`data_sets`** = the **logical data collections**. Examples: "Training Images", "API Keys", "User Credentials". Described by `data_sensitivity[]`, `access_control_methods[]`, `record_count`, and crucially `placements[]` — which data_stores hold this data set. Think of these as the contents.

The relationship is many-to-many via `placements`: a single data_set can be placed on multiple data_stores (e.g., "User Credentials" stored in both a primary database and a backup vault), and a single data_store can hold multiple data_sets.

**In Precogly today**, `DataAsset` is closest to `data_set`, and `OrgsystemComponent` with `category=datastore` is closest to `data_store`. The `ComponentDataAsset` join table already provides the placement relationship (linking data assets to components, including datastore-category ones), but tracks different fields (`data_state`: at_rest/processed, `volume`) rather than TM-BOM's `encrypted` boolean. `DataAsset` also lacks `data_sensitivity[]`, `access_control_methods[]`, and `record_count`. The approach is to evolve these existing models rather than create new ones (see Section 4.2).

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

TrustBoundary (edge between zones)
  - trust_zone_a, trust_zone_b
  - access_control_methods[]
  - authentication_methods[]
  - token config (expires, ttl, refresh)
  - logout capabilities
```

**Resolution:** Rename `TrustBoundary` → `TrustZone`. Create new `TrustBoundary` model as a relationship between two zones. See Section 4.1.

#### Trust Zone Nesting: Precogly vs TM-BOM

**Precogly:** Trust zones support nesting via `parent` FK. E.g., "Production VPC" → "Private Subnet" → "Database Tier".

**TM-BOM:** Trust zones are **flat** — no `parent` field in the schema. All zones are peers.

**Resolution:**
- **Keep nesting in Precogly** — it's a useful capability and more expressive than TM-BOM.
- **On export:** Flatten nested zones into a flat list. Store the parent-child hierarchy in `extensions.precogly.org/trust-zone-hierarchy` for round-trip fidelity.
- **On import:** All zones are created at the top level (no parent). If `precogly.org/trust-zone-hierarchy` extension exists, restore nesting.

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
- **Export:** Merge instances sharing the same countermeasure into one TM-BOM control. Status merge strategy: use **worst-case** (if any instance is GAP, export as `suggested`; if all VERIFIED, export as `active`). Priority derived from threat severity.

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

**All three should be arrays.** A single threat often spans multiple STRIDE categories (e.g., SQL Injection → Tampering + Information Disclosure; Session Hijacking → Spoofing + Elevation of Privilege). The old single-value `stride_category`, `source`, and `source_id` fields are replaced by `stride_categories[]`, `capec_references[]`, and `cwe_references[]`.

**Import consideration:** TM-BOM threats won't have STRIDE categories. On import, `stride_categories` is left empty. Optionally, a mapping from CAPEC → STRIDE could be applied (published CAPEC-to-STRIDE mappings exist), but this is best-effort and should be treated as a suggestion, not authoritative.

Precogly should store all three simultaneously as arrays. See Section 4.4.

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
    """Boundary between two trust zones with security properties."""

    threat_model = models.ForeignKey(
        "diagrams.ThreatModel",
        on_delete=models.CASCADE,
        related_name="trust_boundaries",
    )
    zone_a = models.ForeignKey(
        TrustZone,
        on_delete=models.CASCADE,
        related_name="boundaries_as_zone_a",
    )
    zone_b = models.ForeignKey(
        TrustZone,
        on_delete=models.CASCADE,
        related_name="boundaries_as_zone_b",
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

**Frontend impact:**
- Every reference to "trust boundary" in the UI, component panel, and DFD editor changes to "trust zone"
- New UI for defining trust boundaries (relationships between zones) with auth/access metadata
- The DFD editor's boundary shapes on canvas conceptually remain the same — they are zones

### 4.2 DataSet: Evolve Existing Models

Rather than creating new tables, evolve `DataAsset` → `DataSet` and `ComponentDataAsset` → `DataSetPlacement` in place.

**Rename `DataAsset` → `DataSet` and add new fields:**

```python
class DataSet(TimestampedModel):
    """Data set with sensitivity classification and placement tracking.
    (Renamed from DataAsset)
    """

    threat_model = models.ForeignKey(
        "diagrams.ThreatModel",
        on_delete=models.CASCADE,
        related_name="data_sets",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

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

**Rename `ComponentDataAsset` → `DataSetPlacement` and add `encrypted`:**

```python
class DataSetPlacement(TimestampedModel):
    """Placement of a data set on a component (typically a data store).
    (Renamed from ComponentDataAsset)
    """

    data_set = models.ForeignKey(
        DataSet,
        on_delete=models.CASCADE,
        related_name="placements",
    )
    data_store = models.ForeignKey(
        OrgsystemComponent,
        on_delete=models.CASCADE,
        related_name="data_set_placements",
        help_text="Must be a component with category=datastore",
    )

    # Existing fields (KEEP)
    data_state = models.CharField(max_length=20, choices=DataState.choices, default=DataState.PROCESSED)
    volume = models.CharField(max_length=100, blank=True)

    # NEW TM-BOM field
    encrypted = models.BooleanField(default=False)

    class Meta:
        unique_together = ["data_set", "data_store"]
```

**Why evolve rather than replace:**
- `ComponentDataAsset` already provides the placement relationship — no need for a new join table.
- CIA triad ratings and TM-BOM `data_sensitivity[]` tags serve **different purposes** and are complementary: CIA rates HOW sensitive along three dimensions, while `data_sensitivity` classifies WHAT TYPE of sensitive data (pii, phi, cred, etc.). Keep both.
- `DataFlowAsset` remains unchanged — it tracks data assets in transit (protection methods, encryption types), which is a separate concern from data-at-rest placements.

**Migration steps:**
1. Rename `DataAsset` table → `DataSet` (database rename via migration)
2. Rename `ComponentDataAsset` table → `DataSetPlacement`
3. Add new fields (`data_sensitivity`, `access_control_methods`, `record_count`, `encrypted`)
4. Update all FK references and serializers

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

### 4.4 Threat Classification: All Arrays (STRIDE + CAPEC + CWE)

All three classification systems become arrays. A threat can span multiple STRIDE categories (e.g., SQL Injection → Tampering + Information Disclosure), reference multiple CAPEC attack patterns, and reference multiple CWE weaknesses simultaneously.

**Replace existing fields on `ThreatLibrary`:**

```python
# REPLACE stride_category (single CharField) with array:
stride_categories = ArrayField(
    models.CharField(max_length=30, choices=STRIDECategory.choices),
    default=list, blank=True,
    help_text="STRIDE categories this threat belongs to (can be multiple)",
)

# REPLACE source/source_id (single values) with arrays:
capec_references = models.JSONField(
    default=list, blank=True,
    help_text='Array of {"capec_id": int, "capec_title": str}',
)
cwe_references = models.JSONField(
    default=list, blank=True,
    help_text='Array of {"cwe_id": int, "cwe_title": str}',
)

# REMOVE after migration:
# stride_category (replaced by stride_categories)
# source (replaced by capec_references/cwe_references)
# source_id (replaced by capec_references/cwe_references)
```

**Same changes on `ComponentInstanceThreat` and `DataFlowInstanceThreat` (metadata copies):**

```python
stride_categories = ArrayField(
    models.CharField(max_length=30, choices=STRIDECategory.choices),
    default=list, blank=True,
    help_text="Copied from ThreatLibrary on creation",
)
capec_references = models.JSONField(
    default=list, blank=True,
    help_text="Copied from ThreatLibrary on creation",
)
cwe_references = models.JSONField(
    default=list, blank=True,
    help_text="Copied from ThreatLibrary on creation",
)
```

**Migration for existing data:**
1. `stride_category="tampering"` → `stride_categories=["tampering"]`
2. `source="capec"`, `source_id="CAPEC-66"` → `capec_references=[{"capec_id": 66, "capec_title": ""}]`
3. `source="cwe"`, `source_id="CWE-89"` → `cwe_references=[{"cwe_id": 89, "cwe_title": ""}]`
4. Drop `stride_category`, `source`, `source_id` columns after migration (all data is test data, clean cut).

**Pack YAML format change:** All existing library pack YAML files updated to use the new array format:

```yaml
# Before (old single-value format)
threats:
  - slug: sql-injection
    stride_category: tampering
    source: cwe
    source_id: "CWE-89"

# After (new array format)
threats:
  - slug: sql-injection
    stride_categories:
      - tampering
      - informationDisclosure
    capec_references:
      - capec_id: 66
        capec_title: "SQL Injection"
    cwe_references:
      - cwe_id: 89
        cwe_title: "Improper Neutralization of Special Elements used in SQL Command"
```

The `import_pack` management command updated to read the new array fields. The old `stride_category`, `source`, and `source_id` YAML keys are no longer supported — all packs migrated to the new format.

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
    # Current Precogly statuses (kept for backward compatibility)
    GAP = "gap", "Gap"
    PLANNED = "planned", "Planned"
    VERIFIED = "verified", "Verified"
    WAIVED = "waived", "Waived"
    # New TM-BOM-aligned statuses
    SUGGESTED = "suggested", "Suggested"
    UNDER_REVIEW = "under_review", "Under Review"
    APPROVED = "approved", "Approved"
    SCHEDULED = "scheduled", "Scheduled"
    ACTIVE = "active", "Active"
    ASSUMED = "assumed", "Assumed"
    RETIRED = "retired", "Retired"
    WONT_DO = "wont_do", "Won't Do"
```

**Migration note:** Map existing data: GAP → `suggested`, PLANNED → `scheduled`, VERIFIED → `active`, WAIVED → `retired`. Then remove the original 4 choices in a future cleanup.

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
| *(no equivalent)* | `TrustZone.parent` | Nesting not supported in TM-BOM. Preserved in `extensions.precogly.org/trust-zone-hierarchy` |
| *(no equivalent)* | `TrustZone.trust_level` | 0-100 scale not in TM-BOM. Preserved in extensions |

### 5.3 TrustBoundary ↔ TrustBoundary

| TM-BOM Field | Precogly Field | Notes |
|---|---|---|
| `trust_zone_a` | `TrustBoundary.zone_a` FK | Resolved via symbolic_name |
| `trust_zone_b` | `TrustBoundary.zone_b` FK | Resolved via symbolic_name |
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

### 5.7 DataSet ↔ DataSet (evolved from DataAsset)

| TM-BOM Field | Precogly Field | Notes |
|---|---|---|
| `symbolic_name` | Generated/stored slug | — |
| `title` | `DataSet.name` | Direct (existing field) |
| `description` | `DataSet.description` | Direct (existing field) |
| `data_sensitivity` | `DataSet.data_sensitivity` | New ArrayField |
| `access_control_methods` | `DataSet.access_control_methods` | New ArrayField |
| `record_count` | `DataSet.record_count` | New field |
| `placements[].data_store` | `DataSetPlacement.data_store` FK | Resolved via symbolic_name to datastore component (evolved from ComponentDataAsset) |
| `placements[].encrypted` | `DataSetPlacement.encrypted` | New field on existing join table |
| *(no equivalent)* | `DataSet.classification` | Existing Precogly field, preserved |
| *(no equivalent)* | `DataSet.confidentiality/integrity/availability` | Existing CIA triad ratings, preserved (complementary to data_sensitivity) |
| *(no equivalent)* | `DataSetPlacement.data_state` | Existing Precogly field (at_rest/processed), preserved |

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
| `attack_mechanisms` | `ThreatLibrary.capec_references` / instance copy | New JSONField (array) |
| `weaknesses` | `ThreatLibrary.cwe_references` / instance copy | New JSONField (array) |
| *(no equivalent)* | `ThreatLibrary.stride_categories` / instance copy | Precogly-specific ArrayField, preserved in extensions on export. Empty on TM-BOM import. |

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

When multiple per-component instances of the same countermeasure have different statuses, merge using worst-case priority:
1. If ANY instance is `suggested` or `gap` → export as `suggested`
2. Else if ANY instance is `under_review` or `planned` or `scheduled` → export as `under_review`
3. Else if ANY instance is `wont_do` or `retired` or `waived` → export as `retired`
4. Else if ALL instances are `active` or `verified` or `assumed` → export as `active`

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
7. DataSets + DataSetPlacements (from data_sets[] — references data_stores)
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

**STRIDE categories on import:** TM-BOM threats do not include STRIDE classification. On import, the `stride_categories` array on ThreatLibrary and instance copies is left empty. Optionally, a best-effort CAPEC → STRIDE inference can be applied (published mappings exist), but this should be flagged as inferred, not authoritative. This is not a problem — STRIDE is complementary to CAPEC/CWE, not required.

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
    statuses = {i.status for i in instances}
    if "gap" in statuses:
        return "suggested"
    if "planned" in statuses:
        return "under_review"
    if "waived" in statuses and statuses == {"waived"}:
        return "retired"
    if statuses == {"verified"}:
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

Precogly supports nested trust zones but TM-BOM does not. On export, flatten all zones and preserve hierarchy in extensions:

```python
# Export all zones as flat list
export_data["trust_zones"] = [
    {
        "symbolic_name": generate_symbolic_name(zone.name),
        "title": zone.name,
        "description": zone.description,
    }
    for zone in all_zones  # includes nested zones at all depths
]

# Preserve nesting in extensions
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
export_data["extensions"] = {
    "precogly.org/diagrams": [
        {
            "dfd_id": str(dfd.id),
            "title": dfd.name,
            "diagram_type": dfd.diagram_type,
            "canvas_data": dfd.canvas_data,
        }
        for dfd in threat_model.dfds.all()
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
export_data.setdefault("extensions", {})
export_data["extensions"]["precogly.org/reference-images"] = [
    {
        "filename": img.filename,
        "caption": img.caption,
        "content_type": img.content_type,  # "image/jpeg", "image/png", "image/webp"
        "data": base64_encode(img.image.read()),
    }
    for img in threat_model.reference_images.all()
]
```

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

**Entry point:** Button in the threat model list page ("Import from TM-BOM") and/or in the workspace header.

**Flow:**
1. **Upload** — File picker, accepts `.json` files
2. **Validate** — Call `validate-tmbom` endpoint. Show preview of what will be created (component count, threat count, etc.) and any warnings
3. **Confirm** — User reviews preview and confirms import
4. **Result** — Navigate to the newly created threat model's workspace

### 9.2 Export Flow

**Entry point:** Button in the workspace header (next to Share, Delete).

**Flow:**
1. Click "Export as TM-BOM"
2. Optional: checkbox for "Include generated Mermaid diagram"
3. Download JSON file

### 9.3 UI for New Entities

The following new entities need UI in the workspace:

- **Threat Personas** — New section in workspace, possibly under System Context or a new tab
- **Assumptions** — New section, likely alongside System Context
- **Risk Assessments** — The planned Risk Analysis tab
- **Trust Boundary details** — Expand the current trust zone display to show boundary relationships between zones
- **Data Sets** — New section showing data sensitivity, placements, and access controls

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

#### Threats Column: STRIDE Badges + Attack References

**Current:**
```
● API Gateway Input Injection          addressable  ✕
  Tampering
```

**After:**
```
● API Gateway Input Injection          addressable  ✕
  Tampering · Information Disclosure   ← multiple STRIDE badges
  ▸ Attack References  3              ← expandable (collapsed by default)
    CAPEC
    [CAPEC-66]  SQL Injection
    [CAPEC-108] Command Line Execution through SQL Injection
    CWE
    [CWE-89]   Improper Neutralization of SQL
  🎭 Malware Operator                 ← threat persona (if linked)
```

The CAPEC/CWE section mirrors how compliance mappings work under countermeasures — a collapsible row with a count badge, expanding to show grouped references. Default view stays clean.

**Event** (trigger description) and **threat sources** (adversary/human_error/etc.) go in a threat detail drawer or tooltip, not on the main list view.

#### Countermeasures Column: Expanded Statuses

**Current buttons:** `Gap` | `Planned` | `Waived`

**After (12 statuses):** Too many for inline buttons. Use a dropdown selector or grouped button set:

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
| **Threats with no STRIDE categories** | Normal for TM-BOM imports. `stride_categories` left empty. Optional CAPEC→STRIDE inference can be offered post-import |
| **Import of flat zones into system with nested zones** | All imported zones created at top level (no parent). Existing nested zones in other threat models unaffected |

### 10.2 Export Edge Cases

| Edge Case | Handling |
|---|---|
| **Component name collision on symbolic_name generation** | Append suffix: `api-gateway`, `api-gateway-2` |
| **Orphaned threats (no threat_library)** | Export using copied metadata (threat_name, threat_description) |
| **Orphaned countermeasures** | Export using copied metadata |
| **Threats with no CAPEC/CWE data** | Export with empty `attack_mechanisms` and `weaknesses` arrays |
| **Dismissed threats** | Exclude from export (they represent user decisions to ignore) |
| **Components not in any trust zone** | Assign to a generated "unassigned" trust zone on export |
| **Multi-DFD with duplicate components** | Deduplicate by component_library or name |
| **Empty threat model (no components)** | Valid export — produces minimal TM-BOM with empty arrays |
| **Nested trust zones** | Flattened to flat list. Hierarchy preserved in `extensions.precogly.org/trust-zone-hierarchy` |
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

### 11.2 DataAsset → DataSet Rename

**Risk:** Renaming `DataAsset` → `DataSet` and `ComponentDataAsset` → `DataSetPlacement` requires updating all references across backend and frontend.

**Affected areas:**
- Model imports and FK references throughout backend
- Serializers: `DataAssetSerializer`, `ComponentDataAssetSerializer`
- API endpoints and URL patterns referencing data_assets
- Frontend types and API hooks referencing dataAssets
- React Query cache keys

**Mitigation:** Comprehensive rename via search-and-replace with manual review. Database migration renames tables and columns. Existing fields (CIA ratings, data_state, volume) are preserved — no data loss. Since all data is test data, migration is safe.

### 11.3 ThreatLibrary Field Changes

**Risk:** Replacing `stride_category` (single), `source` (single), and `source_id` (single) with `stride_categories` (array), `capec_references` (array), and `cwe_references` (array) is a breaking change across backend, frontend, and library packs.

**Affected areas:**
- `ThreatLibrary`, `ComponentInstanceThreat`, `DataFlowInstanceThreat` — field renames and type changes
- All serializers that expose stride_category, source, source_id
- Frontend components that display STRIDE badges (currently expect a single category, must handle array)
- Frontend filtering/grouping by STRIDE category (currently exact match, must handle multi-category threats)
- All library pack YAML files — `stride_category`/`source`/`source_id` keys replaced with `stride_categories`/`capec_references`/`cwe_references`
- `import_pack` management command — must read new YAML keys
- `ComponentLibraryThreat` association logic — threat generation copies metadata to instances, must copy arrays

**Mitigation:**
- Migration script converts existing single values to arrays (`stride_category="tampering"` → `stride_categories=["tampering"]`, etc.)
- Drop old columns after migration (all data is test data, clean cut)
- Update all pack YAML files to new array format
- Update `import_pack` command to read new format
- Frontend STRIDE display updated from single badge to multiple badges
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

The DFD editor currently draws "trust boundary" boxes on the canvas. After the rename, these are "trust zones." The DFD editor must be updated:

- Node type rename in ReactFlow: `trustBoundary` → `trustZone` in canvas_data
- UI labels: "Add Trust Boundary" → "Add Trust Zone"
- The actual trust boundary (edge between zones) needs a new UI — possibly a visual indicator on data flows that cross zone boundaries, or a separate panel showing boundary metadata

**Risk of confusion:** Users familiar with the term "trust boundary" might be confused by "trust zone." Need clear UX copy explaining that zones are the areas, boundaries are the crossings between areas.

### 12.2 Per-Instance Controls Create Export Ambiguity

When multiple instances of the same countermeasure have different statuses, the worst-case merge strategy produces a conservative export. This means:

- A threat model with 99 VERIFIED instances and 1 GAP instance exports the control as `suggested` (effectively saying it's not implemented)
- Users may be surprised that their "mostly done" control appears as a suggestion in the export

**Mitigation:** Include a per-component breakdown in `extensions`:
```json
"extensions": {
  "precogly.org/control-details": {
    "rate-limiting": {
      "global_status": "suggested",
      "instance_statuses": {
        "api-gateway × resource-exhaustion-dos": "verified",
        "orchestrator × resource-exhaustion-dos": "gap"
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

## Implementation Sequence

### Phase 1: Schema Evolution (Backend)
1. Trust Zone/Boundary separation (rename + new model)
2. DataAsset → DataSet evolution (rename + add fields, rename ComponentDataAsset → DataSetPlacement)
3. New models: ThreatPersona, Assumption, RiskAssessment
4. ThreatLibrary: replace `stride_category`/`source`/`source_id` with `stride_categories[]`/`capec_references[]`/`cwe_references[]` arrays. Same changes on instance models. Drop old columns.
5. Library pack YAML migration: update all pack YAML files to new array format (`stride_categories`, `capec_references`, `cwe_references`). Update `import_pack` management command to read new keys.
6. Component/DataFlow: add new fields
7. ThreatModel: add scope metadata fields (`data_sensitivity`, `exposure`, `tier`, `scope_locked`, `scope_locked_at`) and publication fields (`frozen`, `released_at`, `product_release_date`, `release_docs_link`, `reviewed_at`, `repo_link`). Expand `criticality` choices to 5-level enum.
8. New models: ScopeAsset, OutOfScopeItem (replacing workspace_data JSON arrays)
9. Countermeasure: expand status enum (4 → 12 values), add priority field
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
1. Update all trust boundary → trust zone references
2. Refactor `useWorkspaceThreatAnalysis` — reduce to only managing `progressChecklist` via workspace_data. All other state reads from ThreatModel fields and related models.
3. Refactor `SystemContextModal`, `AssetsModal`, `OutOfScopeModal` — replace workspace_data JSON writes with proper API calls (ThreatModel PATCH for scope fields, CRUD endpoints for ScopeAsset/OutOfScopeItem).
4. Update frontend types in `threat-analysis.ts` — remove `SystemContext`/`SystemContextAsset`/`SystemContextOutOfScopeItem` from workspace state, replace with API-driven types.
5. Import/export UI (buttons, upload flow, preview)
6. Trust boundary detail UI (zone-to-zone relationships)
7. Data set management UI
8. Threat persona management UI
9. Assumption management UI
10. (Risk Analysis tab — separate major feature)

### Phase 4: Testing & Validation
1. Round-trip tests: import all 4 sample files → export → diff
2. Precogly-native round-trip: create in UI → export → import → verify
3. Edge case coverage from Section 10
4. Regression testing for renamed/removed models
5. Verify workspace_data cleanup: confirm only progressChecklist remains in workspace_data, all other fields served by proper DB columns/endpoints
