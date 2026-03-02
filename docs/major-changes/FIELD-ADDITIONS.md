# Field Additions

**Date:** 2026-02-28
**Status:** Completed (schema + API only — frontend CRUD UI not yet implemented)

---

## Problem

Several models are missing fields that are useful for threat modeling workflows — component descriptions, datastore types, actor types, data sensitivity classifications. These gaps also block format interoperability (TM-Library, OTM), but many are independently valuable.

---

## Proposal

### Core columns (useful to the product)

**OrgsystemComponent:**

```
description        TextField (blank)
actor_type         CharField (blank) — system, user, power_user, administrator, engineer, third_party
data_store_type    CharField (blank) — sql, key_value, document, object, graph, time_series
parent_component   FK → self (nullable) — component hierarchy
```

`actor_type` applies when `category` is human_actor/system_actor. `data_store_type` applies when `category` is datastore. Both are blank for other categories.

**DataFlow:**

```
description        TextField (blank)
has_sensitive_data  BooleanField (default False)
```

**DataAsset:**

```
threat_model       FK → ThreatModel (nullable) — scopes asset to a threat model
description        TextField (blank)
data_sensitivity   ArrayField of CharField — pii, phi, fin, ip, cred, biz, gov, pci, op
```

`data_sensitivity` is complementary to the existing CIA triad fields. CIA rates *how* sensitive along three dimensions; `data_sensitivity` classifies *what type* of sensitive data.

**ComponentDataAsset:**

```
encrypted          BooleanField (default False)
```

### Format metadata (format-specific, not core columns)

These live in `format_metadata` JSONField (see FORMAT-INTEROPERABILITY.md):

| Field | Model | Why metadata |
|---|---|---|
| `permissions` (free text) | OrgsystemComponent | Only TM-Library uses this |
| `repo_link` (URL) | OrgsystemComponent | Niche usage |
| `access_control_methods` (array) | DataAsset | Overlaps with trust boundary auth |
| `record_count` (int) | DataAsset | Format-specific detail |
| `event` (text) | ComponentInstanceThreat | Format-specific threat field |
| `threat_sources` (array) | ComponentInstanceThreat | Format-specific threat field |
| `threat_persona` (ref) | ComponentInstanceThreat | Decided — metadata only |

### Also adding (from gap #2 decision)

**ComponentInstanceCountermeasure + FlowInstanceCountermeasure:**

```
priority           CharField (default "none") — none, low, medium, high, critical
```

---

## Impact

- 12 new columns across 6 existing models, 1 migration
- All new fields are optional/nullable — no breaking changes to existing API consumers
- Frontend types updated to include new optional fields
- djangorestframework-camel-case handles conversion automatically
