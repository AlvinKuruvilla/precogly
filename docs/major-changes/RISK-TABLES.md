# Risk as a First-Class Entity

**Date:** 2026-02-27
**Status:** Proposed

---

## Problem

Our schema treats risk implicitly — severity lives directly on threat instances (`inherent_severity`, `residual_severity`). There's no way to express "these 3 threats together create a business risk with likelihood X and impact Y."

Formats like TM-Library model risk as a separate entity that aggregates multiple threats, with its own likelihood/impact scoring and mitigation planning. We need to support both the threat-centric view (ours) and the risk-centric view (TM-Library and others).

---

## Proposal

Add two tables as an **optional aggregation layer** on top of existing threat instances:

### New Models

```
Risk
  - threat_model (FK → ThreatModel, CASCADE)
  - name (CharField)
  - description (TextField)
  - likelihood (CharField: rare / unlikely / possible / likely / certain)
  - impact (CharField: negligible / minor / moderate / major / severe)
  - impact_description (TextField)
  - score (IntegerField, 0-25)
  - level (CharField: low / medium / high / critical)
  - status (CharField: open / accepted / mitigated / transferred)

RiskThreat (junction)
  - risk (FK → Risk, CASCADE)
  - component_threat (FK → ComponentInstanceThreat, nullable, SET_NULL)
  - flow_threat (FK → DataFlowInstanceThreat, nullable, SET_NULL)
```

### How It Works

```
              Risk (likelihood + impact + score)
                |
        aggregates N threats
       /                    \
ComponentInstanceThreat   DataFlowInstanceThreat
       |                          |
  countermeasures            countermeasures
  (GAP/PLANNED/VERIFIED)    (GAP/PLANNED/VERIFIED)
```

- **Engineering view (existing, unchanged):** Work threat-by-threat, countermeasure-by-countermeasure.
- **Risk register view (new):** See aggregated risk posture. Mitigation status is derived from the underlying countermeasures — no separate mitigation plan table needed.
- **Score:** Can be manually set or auto-suggested from underlying threat severities. Product decides later without schema changes.

### What Doesn't Change

- ComponentInstanceThreat / DataFlowInstanceThreat keep their `inherent_severity` and `residual_severity` fields.
- Countermeasure linkage to threats stays the same.
- Risk grouping is optional — threat instances work fine without being assigned to a risk.

---

## Impact

- 2 new tables, 1 new migration
- No changes to existing models
- New API endpoints for risk CRUD
- Frontend: risk register view (new page or tab on threat model detail)
