# Zone-Based Countermeasure Inheritance

## Prerequisite

[UPDATE-IMPORT-PACKS.md](./archive/UPDATE-IMPORT-PACKS.md) must be implemented first. That change adds `default_status` to `CountermeasureLibrary`, allowing packs to declare countermeasures as `platform`. This document defines how those platform countermeasures can be reviewed and applied to downstream components via trust zone topology.

## Problem

A WAF with `SQL Injection Filtering: platform` protects all components behind it. Today, each downstream component's countermeasure still starts as `gap`, requiring manual resolution — even though the WAF already handles it.

## Solution: User-Initiated Zone Inheritance

Rather than automatically mutating countermeasure statuses behind the scenes, the system **analyzes** the zone topology and **suggests** inherited protections for the user to review and apply. This keeps the user in control, avoids silent side effects, and makes the inheritance logic transparent and auditable.

### How It Works

Given this architecture:

```
[Internet Zone]          [DMZ Zone]              [Internal Zone]
  User ──────→ WAF ──── trust boundary ────→ Web Server → Database
```

1. The WAF is in the DMZ zone and has `SQL Injection Filtering: platform` (from its pack)
2. A `TrustBoundary` connects the DMZ zone to the Internal zone
3. The Web Server is in the Internal zone and also has a `SQL Injection` threat with its countermeasure at `gap`
4. The user clicks **"Review Zone Protections"** (or similar action)
5. The system analyzes the topology and presents a suggestion: *"SQL Injection Filtering on Web Server can inherit platform status from WAF (DMZ)"*
6. The user accepts or dismisses each suggestion
7. Accepted suggestions update the countermeasure to `platform` with `is_inherited=True`

### Determining Protection Direction

`TrustZone.trust_level` (0–100 scale) determines which zone is "outer" (lower trust) and which is "inner" (higher trust). Platform countermeasures propagate **inward** — from lower-trust zones toward higher-trust zones, matching how perimeter defenses work.

The `trust_level` is derived from the frontend `zoneType` via `_zone_type_to_trust_level()` during DFD canvas sync:

| `zoneType` (frontend) | `zone_type` (backend) | `trust_level` |
|---|---|---|
| `zoneInternet` | `zone_internet` | 0 |
| `zoneDmz` | `zone_dmz` | 25 |
| `zoneInternal` | `zone_internal` | 75 |
| `zoneRestricted` | `zone_restricted` | 100 |

For a `TrustBoundary` connecting `zone_a` and `zone_b`:

- The zone with the **lower** `trust_level` is the perimeter/outer zone
- Platform countermeasures on components in the outer zone can be suggested for components in the inner zone
- If trust levels are equal (e.g., two `zoneInternal` zones), no suggestions — ambiguous topology

## Existing Wiring

This approach leverages models and relationships that already exist:

| What                                                     | Where                    | How It's Used                                                                    |
| -------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------- |
| `OrgsystemComponent.trust_zone`                          | `systems/models.py`      | FK to `TrustZone` — every component knows its zone                               |
| `TrustZone.trust_level`                                  | `systems/models.py`      | 0–100 scale, determines inner vs outer                                           |
| `TrustZone.parent`                                       | `systems/models.py`      | Self-referential FK for nested zones                                             |
| `TrustBoundary.zone_a / zone_b`                          | `systems/models.py`      | Connects two zones, defines the security perimeter                               |
| `ComponentInstanceCountermeasure.countermeasure_library` | `threats/models.py`      | FK to library item — used to match "same countermeasure" across components       |
| `ComponentInstanceCountermeasure.status`                 | `threats/models.py`      | Already supports `platform` value                                                |
| DFD canvas sync                                          | `diagrams/services.py`   | Automatically sets `trust_zone` FK when components are placed in zones on canvas |
| `_zone_type_to_trust_level()`                            | `diagrams/services.py`   | Maps frontend `zoneType` to numeric `trust_level` during sync                    |
| Component serializer                                     | `systems/serializers.py` | `trust_zone` is already a writable field — supports non-DFD assignment           |

## What Needs to Be Built

### 1. Zone Protection Analysis Function

A function that analyzes the zone topology and returns a list of suggested inheritance actions. Each suggestion identifies the source countermeasure, the target countermeasure, and the protection path:

```python
def analyze_zone_protections(orgsystem):
    """
    Analyze the zone topology for an orgsystem and return a list of
    inheritance suggestions. Each suggestion is a dict with:
      - target_countermeasure_id: the gap countermeasure that could inherit
      - source_countermeasure_id: the platform countermeasure providing protection
      - source_component_name: e.g. "WAF"
      - source_zone_name: e.g. "DMZ"
      - countermeasure_name: e.g. "SQL Injection Filtering"
    """
    suggestions = []

    # Get all components with gap countermeasures that have a trust zone
    gap_countermeasures = ComponentInstanceCountermeasure.objects.filter(
        instance_threat__component__orgsystem=orgsystem,
        instance_threat__component__trust_zone__isnull=False,
        countermeasure_library__isnull=False,
        status="gap",
    ).select_related(
        "instance_threat__component__trust_zone",
        "instance_threat__threat_library",
        "countermeasure_library",
    )

    for gap_cm in gap_countermeasures:
        component = gap_cm.instance_threat.component
        zone = component.trust_zone
        threat_library = gap_cm.instance_threat.threat_library

        # Find all outer zones reachable via trust boundary chain
        outer_zones = _get_all_outer_zones(zone)
        if not outer_zones:
            continue

        # Find matching platform countermeasures in outer zones
        source_cm = ComponentInstanceCountermeasure.objects.filter(
            instance_threat__component__trust_zone__in=outer_zones,
            countermeasure_library=gap_cm.countermeasure_library,
            status="platform",
        ).select_related(
            "instance_threat__component__trust_zone",
            "countermeasure_library",
        ).first()

        if source_cm:
            suggestions.append({
                "target_countermeasure_id": gap_cm.id,
                "source_countermeasure_id": source_cm.id,
                "source_component_name": source_cm.instance_threat.component.name,
                "source_zone_name": source_cm.instance_threat.component.trust_zone.name,
                "countermeasure_name": gap_cm.countermeasure_library.name,
                "target_component_name": component.name,
                "target_zone_name": zone.name,
            })

    return suggestions


def _get_all_outer_zones(zone, visited=None):
    """
    Walk the trust boundary chain outward, collecting all zones with
    lower trust_level. Traverses multiple boundary layers for nested zones.
    """
    if visited is None:
        visited = set()
    visited.add(zone.id)

    outer_zones = []
    boundaries = TrustBoundary.objects.filter(
        Q(zone_a=zone) | Q(zone_b=zone)
    )

    for boundary in boundaries:
        adjacent = boundary.zone_a if boundary.zone_b == zone else boundary.zone_b
        if adjacent.id in visited:
            continue
        if adjacent.trust_level >= zone.trust_level:
            continue  # Not an outer zone

        outer_zones.append(adjacent)
        # Recurse: collect zones even further out
        outer_zones.extend(_get_all_outer_zones(adjacent, visited))

    return outer_zones
```

### 2. Apply Suggestions Endpoint

An endpoint that accepts a list of suggestion IDs and applies them:

```python
def apply_zone_protections(countermeasure_ids):
    """
    Apply inheritance to the given countermeasures by setting
    status='platform' and is_inherited=True.
    """
    updated = ComponentInstanceCountermeasure.objects.filter(
        id__in=countermeasure_ids,
        status="gap",  # Only update gap countermeasures
    ).update(
        status="platform",
        is_inherited=True,
    )
    return updated
```

### 3. Model Change: `is_inherited` Field

Add a boolean to track which platform countermeasures were applied via zone inheritance vs. the component's own pack:

```python
# On ComponentInstanceCountermeasure and FlowInstanceCountermeasure
is_inherited = models.BooleanField(default=False)
```

This allows the user to distinguish inherited protections in the UI and to reset them if needed (e.g., "Revert inherited protections" action that sets `is_inherited=True` countermeasures back to `gap`).

### 4. API Endpoints

Two new endpoints on the orgsystem or threat analysis resource:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/orgsystems/{id}/zone-protections/` | Run `analyze_zone_protections()` and return suggestions |
| `POST` | `/api/orgsystems/{id}/zone-protections/apply/` | Accept `{ countermeasure_ids: [...] }` and apply them |

### 5. Frontend: Review Zone Protections UI

The entire feature lives in the **Threat Analysis workspace** (`ThreatAnalysisView.tsx` → `ComponentView.tsx`). This is the only place users review and resolve countermeasure statuses, so it's the natural home.

#### Trigger Button

Add a **"Review Zone Protections"** button in the `ThreatAnalysisView.tsx` header bar, next to the existing "+ Add Component" button:

```
Threat Analysis  |  Filter by DFD: [All DFDs ▾]  |  + Add Component  |  🛡 Review Zone Protections  |  [Component View] [Table View]
```

- Use a `Shield` icon to visually distinguish it from "+ Add Component"
- Optionally show a count badge (e.g., "🛡 Review Zone Protections (3)") when suggestions are available — fetch the count on workspace load via the GET endpoint
- The button opens a **dialog** (not a panel or page navigation), keeping the user in context

#### Review Dialog

A `Dialog` (shadcn/ui) that overlays the workspace. Contents:

- **Title**: "Zone Protections — Review Suggestions"
- **Description**: "Components in inner zones can inherit platform countermeasures from protective components in outer zones. Select the protections to apply."
- **Suggestions list**: Each suggestion rendered as a selectable card/row:
  ```
  ☑  SQL Injection Filtering
     Web Server (Internal) ← inherited from WAF (DMZ)
  ```
  - Checkbox for select/deselect
  - Countermeasure name (bold)
  - Target component + zone → source component + zone
- **Select all / Deselect all** toggle at the top of the list
- **Footer**: "Apply Selected (N)" primary button + "Cancel" secondary button
- **Empty state**: "No zone-based protections available. This can happen when there are no trust boundaries, no platform countermeasures in outer zones, or all inheritable countermeasures are already resolved."

#### Inherited Badge on Countermeasure Cards

After applying, inherited countermeasures appear in the right-panel countermeasure list within `ComponentView.tsx`. They already display the green Platform badge with lock icon (`CountermeasureStatusButtons`). Add an **"Inherited from" subtitle** below the countermeasure name, styled like the existing "Provided by boundary" badge:

```
🟢 API Gateway WAF Integration                              ✕
   Inherited from WAF (DMZ)                          [Revert]
   ○ Compliance Coverage  2                            ▾  ✏
   Priority: [None ▾]
   🟢 Platform 🔒
```

- Use a green `Shield` icon + text like the existing boundary badge pattern
- Add an optional "Revert" link that sets the countermeasure back to `gap` and clears `is_inherited`
- Reverted countermeasures will reappear as suggestions on the next analysis run

### 6. Trust Zone Assignment in Non-DFD Mode

The workspace (Threat Analysis tab) needs a way to assign components to trust zones without the DFD canvas. The backend already accepts `trust_zone` on the component serializer. The frontend needs:

- A trust zone dropdown/selector on the "Add Component" dialog or component edit panel in the workspace view
- This enables zone-based inheritance for the `manual` and `hybrid` modeling modes

## Nested Zones

`TrustZone.parent` supports nested zones (e.g., DMZ → App Tier → Database Tier). The analysis traverses the full zone hierarchy: a platform countermeasure at the outermost boundary can be suggested for all inner zones, not just the immediately adjacent one.

The `_get_all_outer_zones()` helper walks the `TrustBoundary` chain outward recursively, collecting every reachable zone with a lower `trust_level`. This means a single analysis pass covers all layers of perimeter defense.

## Edge Cases

| Scenario | Behavior |
| --- | --- |
| Component not in any zone | Not included in analysis — no suggestions generated |
| Zone has no trust boundaries | Not included in analysis — isolated zone |
| Equal trust levels on both sides of boundary | No suggestions — ambiguous topology. This includes two zones of the same type (e.g., both `zoneInternal` at trust_level 75) |
| Countermeasure already `platform` (from pack) | Not included in suggestions — already resolved |
| Countermeasure already `platform` with `is_inherited=True` | Not included in suggestions — already inherited (user can revert manually if needed) |
| Multiple outer zones provide coverage for same countermeasure | Suggestion shows the first matching source; only one suggestion per target countermeasure |
| User reverts an inherited countermeasure to `gap` | It will reappear as a suggestion on the next analysis run — the user can dismiss it again |

## Scope

This is a standalone feature that builds on `default_status` from pack import. It does not require changes to pack YAML format, risk scoring, or threat status derivation (those already handle `platform` correctly).

No automatic re-evaluation triggers are needed. The user runs the analysis when they want to — after building their DFD, after adding new components, or after changing zone topology. The system never silently mutates countermeasure statuses.
