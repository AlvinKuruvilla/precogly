# Risk as a First-Class Entity

**Date:** 2026-02-27
**Revised:** 2026-03-01
**Status:** Proposed

---

## Problem

Our schema treats risk implicitly — severity lives directly on threat instances (`inherent_severity`, `residual_severity`). There's no way to express "these 3 threats together create a business risk with likelihood X and impact Y."

Formats like TM-Library model risk as a separate entity that aggregates multiple threats, with its own likelihood/impact scoring and mitigation planning. We need to support both the threat-centric view (ours) and the risk-centric view (TM-Library and others).

### Severity vs. Risk — Key Distinction

These are different concepts at different abstraction levels:

| Concept | Where It Lives | What It Measures |
|---|---|---|
| **Threat severity** | `ComponentInstanceThreat.inherent_severity` | Technical impact *if* the threat materializes (no likelihood) |
| **Residual severity** | `ComponentInstanceThreat.residual_severity` | Technical impact after countermeasures |
| **Risk score** | Proposed `Risk` model | Business impact x likelihood = quantified risk |

Threat-level severity is a practical shorthand for prioritizing countermeasure work. Risk adds the missing dimension (likelihood) and aggregates multiple threats into a business-level statement. Both coexist:

- **Engineer** works threat-by-threat using severity to prioritize controls.
- **Risk owner** sees aggregated business risk using likelihood x impact.

---

## Prerequisites

These changes to existing models are required before or alongside Risk table creation.

### 1. Add `effectiveness` field to countermeasure models

Residual risk score computation requires knowing how effective each countermeasure is. Risk assessment is inherently subjective — in a real risk planning session, stakeholders vote on control effectiveness just like they vote on likelihood and impact. The `effectiveness` field makes this explicit.

**Add to both `ComponentInstanceCountermeasure` and `FlowInstanceCountermeasure`:**

```python
effectiveness = models.FloatField(
    null=True,
    blank=True,
    validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
    help_text="User-assessed control effectiveness (0.0-1.0). Null = not yet assessed.",
)
```

When `effectiveness` is null (not yet assessed), the residual score calculation uses a **status-derived fallback**:

| Countermeasure Status | Implied Effectiveness |
|---|---|
| `verified` | 1.0 |
| `planned` | 0.5 |
| `gap` | 0.0 |
| `waived` | 0.0 (accepted risk, not a control) |

Once a user provides an explicit effectiveness value, it takes precedence over the status-derived default. This gives teams automatic defaults that work immediately while allowing precise overrides during risk planning sessions.

**Migration:** 1 migration adding the nullable float field to both tables. No data backfill needed — null means "use status fallback."

### 2. Add `_recalculate_threat_status` to `DataFlowInstanceThreatViewSet`

`_recalculate_threat_status` currently exists only on `ComponentInstanceThreatViewSet`. The `DataFlowInstanceThreatViewSet` has no recalculation logic and no `recalculate_status` action endpoint. Risk status derivation depends on accurate `threat.status` for both component and flow threats.

**Add to `DataFlowInstanceThreatViewSet`:**
- `_recalculate_threat_status()` — same logic as the component version, querying `flow_threat.countermeasures` instead
- `@action(detail=True, methods=["post"]) recalculate_status` — public endpoint
- Call `_recalculate_threat_status()` from `apply_countermeasure` (if added) and after flow countermeasure status changes

This is a bug fix independent of the Risk feature — flow threat status has always been stale when countermeasures change.

---

## Proposal

Add two tables as an **optional aggregation layer** on top of existing threat instances.

### New Models

Both models extend `TimestampedModel` (providing `created_at`, `updated_at`), consistent with every other model in the codebase.

```
Risk (extends TimestampedModel)
  - threat_model (FK -> ThreatModel, CASCADE)
  - name (CharField, max_length=255)
  - description (TextField, blank=True)
  - scoring_method (CharField: tm_library / fair / owasp_rr / mozilla_rra / custom)
  - scoring_metadata (JSONField, default={})
  - inherent_score (IntegerField, 0-100)
  - inherent_level (CharField: low / medium / high / critical)
  - residual_score (IntegerField, 0-100, null=True, blank=True)
  - residual_level (CharField: low / medium / high / critical, blank=True)
  - owner (FK -> User, SET_NULL, nullable, related_name="owned_risks")
  - assigned_to (FK -> User, SET_NULL, nullable, related_name="assigned_risks")
  - format_metadata (JSONField, default={})

  Meta:
    ordering = ["-inherent_score"]
    constraints:
      - UNIQUE: (threat_model, name)

  def __str__(self):
      return f"{self.name} ({self.inherent_level})"

RiskThreat (extends TimestampedModel)
  - risk (FK -> Risk, CASCADE, related_name="risk_threats")
  - component_threat (FK -> ComponentInstanceThreat, nullable, CASCADE)
  - flow_threat (FK -> DataFlowInstanceThreat, nullable, CASCADE)

  Constraints:
    - CHECK: exactly one of component_threat or flow_threat is non-null
    - UNIQUE: (risk, component_threat) WHERE component_threat IS NOT NULL
    - UNIQUE: (risk, flow_threat) WHERE flow_threat IS NOT NULL

  def __str__(self):
      threat = self.component_threat or self.flow_threat
      return f"{self.risk.name} <- {threat}"
```

#### `owner` vs `assigned_to` — two distinct roles

Risk registers need two user references:

- **`owner`** — The risk owner: the person accountable for the risk. Typically a business stakeholder, product owner, or CISO. They make accept/mitigate/transfer decisions.
- **`assigned_to`** — The person responsible for driving risk treatment (implementing countermeasures, coordinating with engineers). Typically a security champion or tech lead.

This mirrors the existing countermeasure pattern where `assigned_owner` tracks who is working on a control. Both fields are nullable — not every risk needs both roles assigned immediately.

#### Why no `created_by` field

The original draft included `created_by (FK -> User)`. No other model in the codebase tracks `created_by` — the pattern is `TimestampedModel` with `created_at`/`updated_at` only. `owner` already captures who is responsible for the risk. If creation audit is needed later, it can be added via a general audit log rather than a one-off field on Risk.

### Design Decisions

#### No `status` field on Risk — it's derived

TM-Library's `risk` entity has no status field (schema lines 693-750). Status only lives on `control`. We follow the same principle: **Risk status is computed from underlying countermeasure statuses**, just as threat status is already computed via `_recalculate_threat_status()`.

Derivation logic (mirrors existing threat status pattern):

```python
def derive_risk_status(risk):
    """
    Aggregate status from all linked threats' countermeasures.

    Returns: open / mitigated / accepted
    """
    risk_threats = risk.risk_threats.select_related(
        'component_threat', 'flow_threat'
    ).all()

    if not risk_threats.exists():
        return "open"

    all_threat_statuses = []
    for rt in risk_threats:
        threat = rt.component_threat or rt.flow_threat
        if threat and not threat.is_dismissed:
            all_threat_statuses.append(threat.status)

    if not all_threat_statuses:
        return "open"

    if all(s == "mitigated" for s in all_threat_statuses):
        return "mitigated"
    if all(s == "accepted" for s in all_threat_statuses):
        return "accepted"
    if all(s in ["mitigated", "accepted"] for s in all_threat_statuses):
        return "mitigated"
    return "open"
```

This avoids a separate Risk status vocabulary and keeps a single source of truth: countermeasures drive threat status, threat status drives risk status.

#### No treatment/response plan field — countermeasures ARE the treatment

Treatment already exists in the system:

```
Risk -> RiskThreat -> ComponentInstanceThreat -> ComponentInstanceCountermeasure(s)
                   -> DataFlowInstanceThreat  -> FlowInstanceCountermeasure(s)
```

TM-Library defines a `mitigation_plan` type (schema lines 752-774) linking a risk to controls, but it's not even included in the root schema properties — it's unused in practice. Our model is strictly better: countermeasures live on threats, risks aggregate threats, so a risk's treatment is the union of countermeasures on its constituent threats. The Risk `description` field handles human annotations like "residual risk accepted per CISO sign-off" or "transferred to cyber insurance policy #XYZ."

#### Inherent AND residual scores — not just one

Threat instances carry `inherent_severity` and `residual_severity`. Risks need the same split: inherent score (before controls) and residual score (after controls are factored in). The demo viewer's `risk-calculator.ts` already implements this pattern for the TM-Library method:

```
# TM-Library example (other methods compute inherent_score differently)
inherent_score = normalize_to_100(likelihood_value * impact_value)
residual_score = max(1, inherent_score * (1 - avg_control_effectiveness))
```

##### Residual score: control effectiveness

Control effectiveness is user-provided on each countermeasure (see Prerequisites). The residual score calculation:

```python
def compute_residual_score(risk):
    """
    Compute residual score from inherent score and countermeasure effectiveness.

    effectiveness comes from:
      1. User-entered value on the countermeasure (if set)
      2. Status-derived fallback: verified=1.0, planned=0.5, gap=0.0, waived=0.0
    """
    all_effectiveness = []
    for rt in risk.risk_threats.all():
        threat = rt.component_threat or rt.flow_threat
        if not threat or threat.is_dismissed:
            continue
        for cm in threat.countermeasures.all():
            if cm.effectiveness is not None:
                all_effectiveness.append(cm.effectiveness)
            else:
                # Status-derived fallback
                fallback = {"verified": 1.0, "planned": 0.5, "gap": 0.0, "waived": 0.0}
                all_effectiveness.append(fallback.get(cm.status, 0.0))

    if not all_effectiveness:
        return risk.inherent_score  # No controls = full inherent risk

    avg_effectiveness = sum(all_effectiveness) / len(all_effectiveness)
    return max(1, round(risk.inherent_score * (1 - avg_effectiveness)))
```

The residual score computation (applying control effectiveness) is universal across methods — it's only the inherent score calculation that varies per `scoring_method`.

#### No `likelihood` or `impact` columns on Risk — method inputs live in `scoring_metadata`

TM-Library uses `likelihood` (rare/unlikely/possible/likely/certain) and `impact` (negligible/minor/moderate/major/severe) as its scoring dimensions. But these are **one method's inputs**, not universal risk concepts:

- FAIR uses loss event frequency and loss magnitude — no likelihood/impact enum
- OWASP Risk Rating uses threat agent factors and vulnerability factors — its own sub-dimensions
- Mozilla RRA uses data classification tiers — no numeric likelihood at all

If we promoted TM-Library's enums to top-level columns, we'd be coupling our schema to one format's vocabulary while every other method's inputs are "second class" in a JSONField. Instead, **all method inputs live in `scoring_metadata`**, and the Risk model only stores universal outputs (`inherent_score`, `inherent_level`, `residual_score`, `residual_level`).

TM-Library export still works: the adapter reads `scoring_metadata.likelihood` and `scoring_metadata.impact` when `scoring_method == "tm_library"`. If TM-Library changes their enums tomorrow, we update the adapter — no migration needed.

**Tradeoff:** Filtering by likelihood/impact requires a JSONField lookup (`Risk.objects.filter(scoring_metadata__likelihood="certain")`) instead of a column filter. But this only applies when the method is `tm_library`, and filtering by `inherent_level` (a real column) covers the universal "show me all critical risks" query regardless of method.

#### Multi-method risk scoring via `scoring_method` + `scoring_metadata`

Default is TM-Library's 5x5 matrix. All method-specific inputs live in `scoring_metadata`.

##### Where scoring methods come from — code-level registry, not database

Scoring methods are **algorithms**, not content. Compare to the two patterns in the codebase:

| Pattern | Examples | Managed via |
|---|---|---|
| **Content** (user-extensible) | ThreatLibrary, CountermeasureLibrary, TaxonomyEntry, LibraryPack | DB models + packs, users create/import |
| **Choices** (small stable enum) | Severity, Status, Trigger, Criticality | TextChoices on the model |

Scoring methods are closer to Choices — the list is small (~5 well-known frameworks), changes rarely, and each entry requires Python code to compute anything. You can't "import" a scoring method like you import a threat library pack.

##### Scoring engine architecture

```
backend/apps/threats/scoring/
    __init__.py
    registry.py          # maps method keys to engine classes + metadata
    base.py              # abstract base engine
    tm_library.py        # 5x5 matrix (default, ships first)
    fair.py              # FAIR quantitative
    owasp_rr.py          # OWASP Risk Rating
    mozilla_rra.py       # Mozilla Rapid Risk Assessment
```

The registry defines each method's metadata and engine:

```python
# registry.py
SCORING_METHODS = {
    "tm_library": {
        "label": "Likelihood x Impact (5x5 Matrix)",
        "description": "TM-Library compatible. Score = likelihood(1-5) x impact(1-5).",
        "metadata_schema": {
            "likelihood": {"type": "enum", "values": ["rare", "unlikely", "possible", "likely", "certain"], "required": True},
            "impact": {"type": "enum", "values": ["negligible", "minor", "moderate", "major", "severe"], "required": True},
            "impact_description": {"type": "text", "required": False},
        },
        "engine": TmLibraryScoringEngine,
    },
    "fair": {
        "label": "FAIR",
        "description": "Factor Analysis of Information Risk. Quantitative.",
        "metadata_schema": {
            "loss_event_frequency": {"type": "range", "required": True},
            "loss_magnitude": {"type": "range", "required": True},
            "threat_event_frequency": {"type": "number", "required": True},
            "vulnerability": {"type": "number", "min": 0, "max": 1, "required": True},
        },
        "engine": FairScoringEngine,
    },
    "owasp_rr": {
        "label": "OWASP Risk Rating",
        "description": "Likelihood and impact factor groups per OWASP methodology.",
        "metadata_schema": {
            "threat_agent_factors": {"type": "object", "required": True},
            "vulnerability_factors": {"type": "object", "required": True},
            "technical_impact_factors": {"type": "object", "required": True},
            "business_impact_factors": {"type": "object", "required": True},
        },
        "engine": OwaspRiskRatingScoringEngine,
    },
    "mozilla_rra": {
        "label": "Mozilla Rapid Risk Assessment",
        "description": "Qualitative risk assessment with data classification.",
        "metadata_schema": {
            "data_classification": {"type": "enum", "values": ["public", "confidential_internal", "confidential_specific", "confidential_restricted"], "required": True},
            "risk_impact": {"type": "object", "required": True},
        },
        "engine": MozillaRraScoringEngine,
    },
    "custom": {
        "label": "Manual Score",
        "description": "User enters score directly. No automated calculation.",
        "metadata_schema": {
            "justification": {"type": "text", "required": False},
        },
        "engine": None,  # no computation — user provides score directly
    },
}
```

Each engine implements a base interface:

```python
# base.py
class BaseScoringEngine:
    def validate_inputs(self, scoring_metadata):
        """Raise ValidationError if required inputs are missing or invalid."""
        ...

    def calculate(self, scoring_metadata):
        """Returns (score: int 0-100, level: str). All inputs come from scoring_metadata."""
        ...
```

##### Score normalization — all engines output 0-100

All scoring engines normalize their native output to a universal 0-100 integer scale. The `inherent_level` band is derived from the normalized score:

| Score Range | Level |
|---|---|
| 1-25 | `low` |
| 26-50 | `medium` |
| 51-75 | `high` |
| 76-100 | `critical` |

Each engine's normalization:

| Method | Native Range | Normalization to 0-100 |
|---|---|---|
| **TM-Library** | 1-25 (5x5 grid) | `round(native_score / 25 * 100)` — e.g., 3x4=12 -> 48 (medium) |
| **FAIR** | Dollar-denominated ALE | Logarithmic bucketing of annualized loss expectancy into predefined tiers. E.g., <$10K->10, $10K-$100K->30, $100K-$1M->60, >$1M->90. Exact tier boundaries are configurable in the engine. |
| **OWASP RR** | 0-81 (avg_likelihood 0-9 x avg_impact 0-9) | `round(native_score / 81 * 100)` — e.g., 6.75x7=47.25 -> 58 (high) |
| **Mozilla RRA** | Qualitative tiers | Direct mapping: public->15 (low), confidential_internal->40 (medium), confidential_specific->65 (high), confidential_restricted->90 (critical). Adjusted by `risk_impact` sub-factors. |
| **Custom** | User enters 0-100 directly | No normalization needed. |

The level derivation is centralized (not per-engine):

```python
def score_to_level(score):
    if score <= 25:
        return "low"
    if score <= 50:
        return "medium"
    if score <= 75:
        return "high"
    return "critical"
```

##### How the frontend consumes it

A read-only API endpoint exposes the registry:

```
GET /api/scoring-methods/
```

Returns the list of available methods with their `label`, `description`, and `metadata_schema`. The frontend renders a dynamic form from `metadata_schema` based on the selected method:

- **tm_library** selected: show likelihood + impact dropdowns + optional impact description (from `metadata_schema`)
- **fair** selected: show FAIR-specific number/range inputs (from `metadata_schema`)
- **custom** selected: show a raw score input + optional justification (from `metadata_schema`)

##### Example data per method

```json
// TM-Library (default) -- likelihood and impact live in scoring_metadata
{"scoring_method": "tm_library", "scoring_metadata": {
  "likelihood": "possible",
  "impact": "major",
  "impact_description": "Erosion of user trust, potential regulatory fines."
}}

// FAIR
{"scoring_method": "fair", "scoring_metadata": {
  "loss_event_frequency": {"min": 0.1, "max": 2.0},
  "loss_magnitude": {"min": 50000, "max": 500000},
  "threat_event_frequency": 5.0,
  "vulnerability": 0.3
}}

// OWASP Risk Rating
{"scoring_method": "owasp_rr", "scoring_metadata": {
  "threat_agent_factors": {"skill": 6, "motive": 9, "opportunity": 7, "size": 5},
  "vulnerability_factors": {"ease_of_discovery": 3, "ease_of_exploit": 6},
  "technical_impact_factors": {"loss_of_confidentiality": 9, "loss_of_integrity": 7},
  "business_impact_factors": {"financial": 9, "reputation": 7}
}}

// Custom (manual)
{"scoring_method": "custom", "scoring_metadata": {
  "justification": "Score derived from external vendor risk assessment report dated 2026-01-15."
}}
```

The `inherent_score` and `inherent_level` fields are the universal outputs — all methods produce a number (0-100) + level band. Each method's specific inputs (TM-Library's likelihood/impact, FAIR's loss frequency/magnitude, etc.) all live in `scoring_metadata`. The TM-Library adapter knows to read `scoring_metadata.likelihood` and `scoring_metadata.impact` when exporting to TM-Library format.

##### Why not a database model for methods

- Adding a method requires Python code anyway (the calculation logic)
- The `metadata_schema` is tightly coupled to the engine that validates/consumes it
- There's no user workflow for "create your own risk methodology"
- The list is small and stable — a new methodology gains industry adoption maybe once a year
- No migration needed to add a new method, just a new engine file + registry entry

##### Future extensibility

If org-level custom scoring methods are ever needed, the registry could be extended to check for DB-stored methods with formula expressions (a simple DSL). But that's a v2 concern — start with the code-level registry.

#### CASCADE on RiskThreat FKs, not SET_NULL

If a `ComponentInstanceThreat` is deleted (e.g., its parent component is deleted), the `RiskThreat` junction row should be deleted too — not left as an orphan with both FKs null. The Risk itself survives; it just has fewer linked threats.

#### CHECK constraint: exactly one FK must be non-null

Prevents meaningless rows where both `component_threat` and `flow_threat` are null (or both are set).

#### Uniqueness constraints prevent duplicate linkage

Partial unique indexes ensure the same threat can't be added to the same risk twice.

### How It Works

```
              Risk
              scoring_method + scoring_metadata -> inherent_score (0-100) -> inherent_level
                |
        aggregates N threats
       /                    \
ComponentInstanceThreat   DataFlowInstanceThreat
       |                          |
  countermeasures            countermeasures
  (GAP/PLANNED/VERIFIED)    (GAP/PLANNED/VERIFIED)
  + effectiveness (0.0-1.0)  + effectiveness (0.0-1.0)
       |                          |
  -> threat.status           -> threat.status
       \                        /
        -> risk status (derived)
        -> residual_score (computed from control effectiveness)
```

- **Engineering view (existing, unchanged):** Work threat-by-threat, countermeasure-by-countermeasure using severity to prioritize.
- **Risk register view (new):** See aggregated risk posture. Status and residual score are derived from underlying countermeasures — no separate mitigation plan or status field needed.
- **Format interop:** TM-Library adapter maps `Risk` to/from TM-Library's `risk` schema entity. `format_metadata` stores any TM-Library-specific fields (e.g., `mitigation_plan` data). Status vocabulary translation is the adapter's responsibility per FORMAT-INTEROPERABILITY.md.

### Risk Recalculation — When and How

Risk status and residual score must stay in sync with the underlying countermeasures. The trigger strategy mirrors the existing `_recalculate_threat_status` pattern — **recalculation is called explicitly from viewset actions**, not via Django signals.

#### Trigger points

1. **Countermeasure status change** — When `ComponentInstanceCountermeasureViewSet.update()` or `FlowInstanceCountermeasureViewSet.update()` changes `status` or `effectiveness`, the viewset:
   a. Calls `_recalculate_threat_status(instance_threat)` on the parent threat (existing for component threats, new for flow threats per Prerequisites)
   b. Finds all Risks linked to that threat via `RiskThreat` and calls `recalculate_risk(risk)` on each

2. **RiskThreat added/removed** — When a threat is linked or unlinked from a Risk, `recalculate_risk(risk)` is called on the affected Risk.

3. **Manual recalculation** — `@action(detail=True, methods=["post"]) recalculate` on `RiskViewSet` for on-demand recomputation.

#### Implementation

```python
def recalculate_risk(risk):
    """
    Recompute derived fields: status and residual_score/residual_level.
    Called from viewset actions, not signals.
    """
    risk_status = derive_risk_status(risk)
    residual_score = compute_residual_score(risk)
    residual_level = score_to_level(residual_score) if residual_score else None

    Risk.objects.filter(pk=risk.pk).update(
        residual_score=residual_score,
        residual_level=residual_level,
    )
```

#### Fan-out for shared threats

When a threat belongs to multiple Risks (allowed — see Edge Cases), a single countermeasure change triggers recalculation on all linked Risks:

```python
def recalculate_risks_for_threat(threat_instance, threat_type="component"):
    """
    Find all Risks linked to this threat and recalculate each.
    Called after threat status changes.
    """
    if threat_type == "component":
        risk_ids = RiskThreat.objects.filter(
            component_threat=threat_instance
        ).values_list("risk_id", flat=True)
    else:
        risk_ids = RiskThreat.objects.filter(
            flow_threat=threat_instance
        ).values_list("risk_id", flat=True)

    for risk in Risk.objects.filter(id__in=risk_ids):
        recalculate_risk(risk)
```

Risk count per threat model is typically small (<50), so this fan-out is not a performance concern.

### Status Vocabulary — Adapters Own Translation

Our internal canonical vocabulary is:

| Level | Internal Status | Derived From |
|---|---|---|
| Countermeasure | `gap / planned / verified / waived` | Set by user |
| Threat | `open / mitigated / accepted` | Computed from countermeasure statuses |
| Risk | `open / mitigated / accepted` | Computed from threat statuses |

TM-Library uses a different control-status enum (`assumed / active / suggested / under_review / approved / scheduled / retired / wont_do`). Format adapters translate on import/export. This is already the approach in FORMAT-INTEROPERABILITY.md — no new vocabulary needed.

> **Note:** The frontend currently maps `verified -> platform` and uses `exposed / addressable / mitigated` for threat display. These are UI presentation concerns, not schema concerns. The backend remains the source of truth.

### Custom Threats and Countermeasures

The Risk model fully supports custom (non-library) threats and countermeasures. `RiskThreat` links to *instance* models (`ComponentInstanceThreat`, `DataFlowInstanceThreat`), not library models. Custom threats have `threat_library=null` and custom countermeasures have `countermeasure_library=null`, but they are still valid instances with their own `threat_name`, `status`, `inherent_severity`, etc. (metadata copied on creation for orphan resilience).

This means:
- A Risk can aggregate a mix of library-backed and custom threats
- Custom countermeasures on those threats factor into residual score and status derivation identically to library-backed ones
- The `effectiveness` field works the same way regardless of whether the countermeasure came from a library or was created ad-hoc

### What Doesn't Change

- ComponentInstanceThreat / DataFlowInstanceThreat keep their `inherent_severity` and `residual_severity` fields. These are threat-level severity assessments, distinct from risk-level scores.
- Countermeasure linkage to threats stays the same (plus the new `effectiveness` field).
- Risk grouping is optional — threat instances work fine without being assigned to a risk.
- Existing stats computation (`compute_threat_model_stats_from_canvas`) continues to work at the threat level.

### Edge Cases

**Dismissed threats in a Risk:** Dismissed threats (`is_dismissed=True`) are excluded from risk status derivation and residual score computation. They remain linked for audit purposes but don't affect the risk posture.

**One threat in multiple Risks:** Allowed. When a countermeasure changes on a shared threat, all linked Risks need residual score recomputation. The `recalculate_risks_for_threat` function handles this fan-out (see Risk Recalculation section).

**All threats removed from a Risk:** Risk status returns to `open` with the original inherent score. The risk entity persists as a placeholder until the user deletes it or links new threats.

**Cross-ThreatModel integrity:** RiskThreat references threats that belong to components/flows within the same ThreatModel. Enforced at the serializer validation level — the DB FK goes to ComponentInstanceThreat/DataFlowInstanceThreat directly, and the serializer verifies the threat's parent belongs to the Risk's threat_model.

Validation traversal path:
```
# Component threats
RiskThreat.component_threat
  -> ComponentInstanceThreat.component (FK -> OrgsystemComponent)
    -> OrgsystemComponent is linked to a DFD via canvas_data node IDs
      -> DFD is linked to ThreatModel via ThreatModelDFD junction

# Flow threats
RiskThreat.flow_threat
  -> DataFlowInstanceThreat.data_flow (FK -> DataFlow)
    -> DataFlow is linked to a DFD via canvas_data edge IDs
      -> DFD is linked to ThreatModel via ThreatModelDFD junction
```

Since component/flow-to-DFD linkage is implicit (via canvas_data node/edge IDs, not explicit FKs), the serializer validation uses the threat model's component and flow querysets:

```python
def validate_component_threat(self, value):
    threat_model = self.context["threat_model"]
    # Get all component IDs across all DFDs in this threat model
    valid_component_ids = OrgsystemComponent.objects.filter(
        threats__isnull=False,
        # Components linked via DFD canvas_data for this threat model
    ).values_list("id", flat=True)

    if value.component_id not in valid_component_ids:
        raise ValidationError(
            "Component threat does not belong to this threat model."
        )
    return value
```

In practice, since `useThreatModelThreats(threatModelId)` already aggregates threats scoped to a threat model, the frontend only presents threats belonging to the current threat model. The serializer validation is a safety net against manual API calls.

---

## API Design

### URL Structure

Risk endpoints are nested under threat models, following the existing pattern of `/api/threat-models/{id}/threats/`:

```
# Risk CRUD (nested under threat model)
GET    /api/threat-models/{tm_id}/risks/              # List risks for a threat model
POST   /api/threat-models/{tm_id}/risks/              # Create risk (with optional inline threat_ids)
GET    /api/threat-models/{tm_id}/risks/{risk_id}/     # Risk detail
PATCH  /api/threat-models/{tm_id}/risks/{risk_id}/     # Update risk
DELETE /api/threat-models/{tm_id}/risks/{risk_id}/     # Delete risk

# Risk actions
POST   /api/threat-models/{tm_id}/risks/{risk_id}/recalculate/   # Recompute status + residual score
POST   /api/threat-models/{tm_id}/risks/{risk_id}/add-threats/   # Bulk link threats
POST   /api/threat-models/{tm_id}/risks/{risk_id}/remove-threats/ # Bulk unlink threats

# Scoring methods (top-level, read-only)
GET    /api/scoring-methods/     # List available scoring methods with metadata_schema
```

### Risk Creation — Inline Threat Linking

The `POST /risks/` endpoint accepts optional `threat_ids` for atomic creation, avoiding N+1 API calls:

```json
{
  "name": "Data Breach via API Exploitation",
  "description": "Combined risk from multiple API-related threats",
  "scoring_method": "tm_library",
  "scoring_metadata": {
    "likelihood": "possible",
    "impact": "major"
  },
  "component_threat_ids": [12, 34],
  "flow_threat_ids": [56]
}
```

The serializer validates all threat IDs belong to the same threat model, creates the Risk and RiskThreat rows in a single transaction, then runs the scoring engine to compute `inherent_score` and `inherent_level`.

### Bulk Threat Linking/Unlinking

```json
// POST /api/threat-models/{tm_id}/risks/{risk_id}/add-threats/
{
  "component_threat_ids": [78],
  "flow_threat_ids": [90]
}

// POST /api/threat-models/{tm_id}/risks/{risk_id}/remove-threats/
{
  "component_threat_ids": [12],
  "flow_threat_ids": []
}
```

Both actions call `recalculate_risk()` after modifying the junction table.

### Authorization

All Risk endpoints use `permission_classes = [IsAuthenticated]`, consistent with existing threat/countermeasure viewsets. Scoping is implicit via the nested URL — the `tm_id` in the URL determines which threat model's risks are accessible, and the viewset filters the queryset by `threat_model_id=tm_id`.

### Filters and Ordering

```python
class RiskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["scoring_method", "inherent_level", "residual_level", "owner", "assigned_to"]
    ordering_fields = ["inherent_score", "residual_score", "created_at", "name"]
    ordering = ["-inherent_score"]
```

---

## Serializer Design

### RiskListSerializer (for list views)

Lightweight — no nested threat data, just counts and derived status:

```python
class RiskListSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    threat_count = serializers.SerializerMethodField()
    owner_email = serializers.EmailField(source="owner.email", read_only=True, default=None)
    assigned_to_email = serializers.EmailField(source="assigned_to.email", read_only=True, default=None)

    class Meta:
        model = Risk
        fields = [
            "id", "name", "description",
            "scoring_method", "inherent_score", "inherent_level",
            "residual_score", "residual_level",
            "status", "threat_count",
            "owner", "owner_email",
            "assigned_to", "assigned_to_email",
            "created_at", "updated_at",
        ]

    def get_status(self, obj):
        return derive_risk_status(obj)

    def get_threat_count(self, obj):
        return obj.risk_threats.count()
```

### RiskDetailSerializer (for detail/create/update)

Includes nested threat summary and scoring metadata:

```python
class RiskDetailSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    owner_email = serializers.EmailField(source="owner.email", read_only=True, default=None)
    assigned_to_email = serializers.EmailField(source="assigned_to.email", read_only=True, default=None)
    threats = serializers.SerializerMethodField()

    # Write-only fields for creation with inline threat linking
    component_threat_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False, default=[]
    )
    flow_threat_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False, default=[]
    )

    class Meta:
        model = Risk
        fields = [
            "id", "name", "description",
            "scoring_method", "scoring_metadata",
            "inherent_score", "inherent_level",
            "residual_score", "residual_level",
            "status", "threats",
            "owner", "owner_email",
            "assigned_to", "assigned_to_email",
            "format_metadata",
            "component_threat_ids", "flow_threat_ids",
            "created_at", "updated_at",
        ]
        read_only_fields = ["inherent_score", "inherent_level", "residual_score", "residual_level"]

    def get_threats(self, obj):
        """Return linked threats with basic info."""
        result = []
        for rt in obj.risk_threats.select_related("component_threat", "flow_threat").all():
            threat = rt.component_threat or rt.flow_threat
            if threat:
                result.append({
                    "risk_threat_id": rt.id,
                    "threat_id": threat.id,
                    "threat_type": "component" if rt.component_threat else "flow",
                    "threat_name": threat.threat_name,
                    "status": threat.status,
                    "is_dismissed": threat.is_dismissed,
                })
        return result

    def validate_scoring_metadata(self, value):
        """Validate scoring_metadata against the selected method's schema."""
        method_key = self.initial_data.get("scoring_method", "tm_library")
        method_config = SCORING_METHODS.get(method_key)
        if method_config and method_config["engine"]:
            engine = method_config["engine"]()
            engine.validate_inputs(value)
        return value
```

`inherent_score` and `inherent_level` are read-only — they're computed by the scoring engine from `scoring_metadata` during `create()` and `update()`. The serializer's `create()` method calls the engine's `calculate()`, then creates RiskThreat rows from the inline `component_threat_ids` / `flow_threat_ids`.

---

## Frontend Types

```typescript
// types/risk.ts

export interface Risk {
  id: number
  name: string
  description: string
  scoringMethod: ScoringMethodKey
  scoringMetadata: Record<string, unknown>
  inherentScore: number       // 0-100
  inherentLevel: RiskLevel
  residualScore: number | null
  residualLevel: RiskLevel | null
  status: RiskStatus          // derived, read-only
  threatCount: number         // list view only
  threats?: RiskThreatEntry[] // detail view only
  owner: number | null
  ownerEmail: string | null
  assignedTo: number | null
  assignedToEmail: string | null
  formatMetadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type RiskStatus = 'open' | 'mitigated' | 'accepted'
export type ScoringMethodKey = 'tm_library' | 'fair' | 'owasp_rr' | 'mozilla_rra' | 'custom'

export interface RiskThreatEntry {
  riskThreatId: number
  threatId: number
  threatType: 'component' | 'flow'
  threatName: string
  status: string
  isDismissed: boolean
}

export interface ScoringMethod {
  key: ScoringMethodKey
  label: string
  description: string
  metadataSchema: Record<string, ScoringFieldSchema>
}

export interface ScoringFieldSchema {
  type: 'enum' | 'number' | 'range' | 'object' | 'text'
  values?: string[]      // for enum type
  min?: number           // for number type
  max?: number           // for number type
  required: boolean
}

export interface CreateRiskInput {
  name: string
  description?: string
  scoringMethod: ScoringMethodKey
  scoringMetadata: Record<string, unknown>
  owner?: number | null
  assignedTo?: number | null
  componentThreatIds?: number[]
  flowThreatIds?: number[]
}
```

Note: `scoringMethod` uses snake_case (`tm_library`, `owasp_rr`) because these are enum values (identifiers), not object field names. Per `CODING_STANDARDS.md`, the camelCase conversion by `djangorestframework-camel-case` applies to JSON keys (`scoringMethod`, `inherentScore`), not to string values within those keys. Backend model fields use `snake_case` (`scoring_method`, `inherent_score`), frontend interface fields use `camelCase` (`scoringMethod`, `inherentScore`), and API URL paths use `kebab-case` (`/api/scoring-methods/`).

---

## Frontend UX — Risk Analysis Tab

The risk register and scoring configuration live in the **"Risk Analysis" tab** of `ThreatModelDetail.tsx` (currently showing "Coming Soon"). This tab becomes the primary interface for creating, viewing, and managing risks.

### Tab layout

1. **Risk Register Table** — The main view. A table listing all risks for the threat model with columns: name, inherent score/level, residual score/level, status, threat count, owner, assigned to. Sortable and filterable by level and status.

2. **"Add Risk" button** — Opens a dialog/drawer for creating a new risk. The dialog includes:
   - Name, description fields
   - **Scoring method selector** — A dropdown populated from `GET /api/scoring-methods/`. Selecting a method dynamically renders the method's input form from its `metadata_schema` (e.g., TM-Library shows likelihood + impact dropdowns; FAIR shows numeric range inputs; Custom shows a raw score input).
   - **Threat picker** — Multi-select list of the threat model's existing threats (both component and flow threats, both library-backed and custom). Pre-filtered to the current threat model via `useThreatModelThreats()`.
   - Owner and assigned-to user selectors (searchable combobox, same pattern as countermeasure owner assignment in `ComponentView.tsx`).

3. **Risk detail panel** — Clicking a risk row expands or navigates to a detail view showing:
   - Scoring inputs (editable, re-renders the method-specific form)
   - Linked threats with their statuses
   - Derived status and residual score (read-only, with a "Recalculate" button for manual refresh)
   - Control effectiveness summary across linked countermeasures

The scoring method selector and its dynamic form are the "risk calculator" — there is no separate calculator page. The method selection and scoring inputs are inline within the risk creation/edit dialog, making the calculation transparent and immediate.

---

## Shared View Integration

Risks are included in magic link shared views. The `MagicLinkAccessResponse` already returns threat analysis data; risks are a natural aggregation layer on top.

### Changes to shared view

**Backend:** The `MagicLinkAccessView` (or equivalent) adds a `risks` key to the response, containing `RiskListSerializer` data for the shared threat model. Risk status and scores are read-only — no computation needed at request time since they're pre-computed and stored.

**Frontend:** `ReadOnlyThreatAnalysisView` gains an optional "Risk Register" section (a simple read-only table) showing risk name, level, status, and threat count. This reuses the same `RiskLevel` color coding as the authenticated view.

**`compute_threat_model_stats_from_canvas`:** No changes needed. This function computes threat-level stats from canvas data for the magic link preview. Risk stats are computed from the `Risk` table directly, not from canvas data.

---

## Dashboard Stats

`DashboardStats` (in `types/index.ts` and `DashboardStatsView`) currently tracks threat model counts by status. The dashboard gains a risk summary section:

```typescript
// Addition to DashboardStats interface
export interface DashboardStats {
  // ... existing fields (total, inProgress, pendingReview, approved)
  risks: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
    open: number
    mitigated: number
  }
}
```

**Backend:** `DashboardStatsView.get()` adds a `risks` key by querying `Risk.objects.filter(threat_model__owner=request.user)` with aggregation by `inherent_level`.

**Frontend:** `StatsCards` gains a fourth card showing total risks with a breakdown by level (critical/high/medium/low) using the same color coding as severity.

`SummaryCards` (workspace-level, inside ThreatModelDetail) gains a risk summary row showing the count of risks by status (open/mitigated/accepted) for the current threat model.

---

## Impact

- **Prerequisite migration:** Add `effectiveness` (nullable FloatField) to `ComponentInstanceCountermeasure` and `FlowInstanceCountermeasure`
- **Prerequisite code fix:** Add `_recalculate_threat_status` and `recalculate_status` action to `DataFlowInstanceThreatViewSet`
- 2 new tables (Risk, RiskThreat), 1 migration
- `format_metadata` JSONField on Risk for format interop (aligns with FORMAT-INTEROPERABILITY.md)
- New viewset: `RiskViewSet` with CRUD, `recalculate`, `add-threats`, `remove-threats` actions
- New module: `backend/apps/threats/scoring/` — code-level registry + engine classes (ship `tm_library` first, add others later)
- New API endpoint: `GET /api/scoring-methods/` (read-only, exposes registry for frontend form rendering)
- Frontend: risk register view in the existing "Risk Analysis" tab (currently "Coming Soon" in ThreatModelDetail.tsx)
- Frontend: new types in `types/risk.ts`, new API hooks in `api/risks.ts`
- Frontend stats: `SummaryCards.tsx`, `StatsCards.tsx`, `DashboardStats` type, and `useWorkspaceThreatAnalysis` hook gain risk-aware sections
- Shared views: `MagicLinkAccessResponse` and `ReadOnlyThreatAnalysisView` include risk data

---

## Dependencies

- FORMAT-INTEROPERABILITY.md — `format_metadata` pattern, adapter architecture for TM-Library import/export of risks
- CODING_STANDARDS.md — snake_case (backend), camelCase (frontend), kebab-case (URLs) conventions; `djangorestframework-camel-case` handles API boundary conversion
