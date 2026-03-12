# Assumptions Feature

## Summary

Add an `assumptions` field to the `ThreatModel` model to capture environmental and design assumptions that the threat analysis depends on. This aligns with the OWASP TM-Library schema which treats assumptions as a top-level array on the threat model.

## Motivation

Threat models make implicit assumptions about the environment (network isolation, third-party reliability, trust relationships) that, if broken, invalidate the security analysis. Without recording them, teams have no way to know which threats need re-evaluation when infrastructure or organizational changes occur.

## Data Model

### Approach: JSONField on ThreatModel (not a separate table)

Add a single field to the existing `ThreatModel` model:

```python
# backend/apps/threat_models/models.py

class ThreatModel(TimestampedModel):
    # ... existing fields ...
    assumptions = models.JSONField(default=list, blank=True)
```

### JSON Structure

Each entry in the array:

```json
{
  "description": "Application Zone network is isolated to platform team",
  "topics": ["auth-service", "transfer-service"],
  "validity": "confirmed"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | Yes | The assumption statement |
| `topics` | string[] | No | References to components, flows, or other entities by name (human-readable, not DB IDs — keeps it lightweight and compatible with TM-Library format) |
| `validity` | enum | Yes | `unconfirmed` / `confirmed` / `rejected` |

### Why JSONField, Not a Separate Table

- Matches the TM-Library schema structure (top-level array, not a separate entity)
- Assumptions are simple annotated strings — no relationships, no FKs, no cascading deletes
- Same pattern as `workspace_data` and `format_metadata` already on ThreatModel
- The `topics` field provides lightweight traceability without needing M2M joins
- Keeps migrations minimal — one field addition

## API Changes

### Serializer

Add `assumptions` to `ThreatModelSerializer` fields list. The JSONField serializes directly — no nested serializer needed.

Validation in the serializer (or a dedicated validator):
- Each entry must have `description` (non-empty string) and `validity` (one of the three enum values)
- `topics` is optional, defaults to `[]`
- Reject duplicate descriptions within the same threat model

### Endpoints

No new endpoints needed. Assumptions are read/written as part of the existing `ThreatModel` CRUD:

- `GET /api/threat-models/:id/` — includes `assumptions` in response
- `PATCH /api/threat-models/:id/` — accepts `assumptions` array to replace

## TM-Library Import/Export

### Existing Bug: Silent Data Loss

**`assumptions` from imported TM-Library JSON files are silently dropped.**

The TM-Library schema includes `assumptions` as a top-level array, and real-world threat model files use it (e.g., `cryptocurrency-wallet-threat-model.json` has two assumptions). However, the current `TmLibraryAdapter` never reads this key:

- **`validate()`** — `entity_lists` (line 119-129) enumerates 9 keys; `assumptions` is not among them. Unknown top-level keys are silently ignored — no warning emitted.
- **`import_data()`** — steps 1-12 process trust_zones through risks. There is no step for assumptions. `json_data.get("assumptions")` is never called.
- **`export_data()`** — since nothing was stored, nothing is exported. Round-trip data loss.
- **No "unrecognized keys" guard** — the adapter has no mechanism to warn about top-level keys it didn't process.

This is the same class of issue that could affect any future TM-Library schema additions — the adapter is whitelist-based but doesn't warn about keys it skips.

Compare with `threat_personas` (step 9, line 553-558), which also lacks a dedicated model but is preserved by stashing the raw JSON into `format_metadata.tm_library.threat_personas`. Assumptions should have received the same treatment but were missed.

### Fix (as part of this feature)

Once the `assumptions` JSONField exists on ThreatModel, add a new import step between step 9 (threat_personas) and step 10 (threats):

```python
# In import_data(), after step 9 (Threat Personas):

# 9b. Assumptions → store in dedicated field
assumptions_data = json_data.get("assumptions", [])
if assumptions_data:
    threat_model.assumptions = [
        {
            "description": a.get("description", ""),
            "topics": a.get("topics", []),
            "validity": a.get("validity", "unconfirmed"),
        }
        for a in assumptions_data
        if isinstance(a, dict) and a.get("description")
    ]
    threat_model.save(update_fields=["assumptions"])
    summary["assumptions"] = len(threat_model.assumptions)
```

Note: unlike `threat_personas`, assumptions go to the dedicated field — not to `format_metadata` — since we now have a first-class field for them.

### Export (`TmLibraryAdapter.export_data`)

```python
# In export_data(), after scope section:
if threat_model.assumptions:
    result["assumptions"] = [
        {
            "description": a["description"],
            **({"topics": a["topics"]} if a.get("topics") else {}),
            "validity": a.get("validity", "unconfirmed"),
        }
        for a in threat_model.assumptions
    ]
```

### Validation

Add `assumptions` to the `entity_lists` validation in `validate()`, or validate separately since assumptions don't use `symbolic_name`:

```python
# In validate(), after entity_lists validation:
for idx, assumption in enumerate(json_data.get("assumptions", [])):
    if not isinstance(assumption, dict):
        errors.append(f"assumptions[{idx}]: must be an object.")
        continue
    if not assumption.get("description"):
        errors.append(f"assumptions[{idx}]: missing 'description'.")
    validity = assumption.get("validity", "")
    if validity and validity not in ("unconfirmed", "confirmed", "rejected"):
        warnings.append(
            f"assumptions[{idx}]: unknown validity '{validity}', "
            f"will default to 'unconfirmed'."
        )
```

## Frontend Changes

### Types

```typescript
// types/index.ts
interface Assumption {
  description: string;
  topics: string[];
  validity: 'unconfirmed' | 'confirmed' | 'rejected';
}

// Add to ThreatModel type
interface ThreatModel {
  // ... existing fields ...
  assumptions: Assumption[];
}
```

### UI Location

**4th tab in the "View / Manage System Context" modal**, alongside the existing Define Assets, Out of Scope, and Describe System tabs.

Rationale:
- Assumptions are not known at creation time — they emerge during the modeling process as the team draws components, identifies trust boundaries, and reasons about threats
- The System Context modal already houses the other "what do we believe about this system?" inputs. Out of Scope ("we're not analyzing this") and Assumptions ("we believe this is true") are two sides of the same coin
- Adding a tab has zero navigation footprint — users who don't use it never see it, same as Out of Scope today
- The Create Threat Model form stays focused on getting started quickly

**Tab design:**

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Define Assets│  Out of Scope│  Assumptions │Describe System│
└──────────────┴──────────────┴──────────────┴──────────────┘

 Assumption                              Validity
 ┌─────────────────────────────────────┐ ┌────────────┐
 │ e.g., Internal network is isolated  │ │ Unconfirmed▾│
 └─────────────────────────────────────┘ └────────────┘

 Topics (optional)
 ┌─────────────────────────────────────────────────────┐
 │ [Auth Service] [Transfer Service]  + add            │
 └─────────────────────────────────────────────────────┘

                                          [+ Add Assumption]

 ┌─────────────────────────────────────────────────────────┐
 │ ● Internal network is isolated to      Confirmed    ✕  │
 │   platform team                                        │
 │   Auth Service · Transfer Service                      │
 ├─────────────────────────────────────────────────────────┤
 │ ○ Mobile app binary is not tampered    Unconfirmed  ✕  │
 │   Mobile Client App                                    │
 └─────────────────────────────────────────────────────────┘
```

Each row:
- Description (text input) — the assumption statement
- Validity (dropdown: unconfirmed / confirmed / rejected) — with color coding: confirmed = green, unconfirmed = yellow, rejected = red
- Topics (tag/chip input — freeform text, not linked to DB entities)
- Delete button (✕)

### Reporting

Assumptions appear in **Section 2.4** of the threat model report, between out-of-scope items and referenced threat models.

## Migration

One migration: `AddField` for `assumptions` with `default=list`.

No data migration needed — existing threat models get an empty `[]`.
