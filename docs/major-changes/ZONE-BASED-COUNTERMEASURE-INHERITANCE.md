# Zone-Based Countermeasure Inheritance

## Prerequisite

[UPDATE-IMPORT-PACKS.md](./UPDATE-IMPORT-PACKS.md) must be implemented first. That change adds `default_status` to `CountermeasureLibrary`, allowing packs to declare countermeasures as `platform`. This document defines how those platform countermeasures propagate to other components via trust zone topology.

## Problem

A WAF with `SQL Injection Filtering: platform` protects all components behind it. Today, each downstream component's countermeasure still starts as `gap`, requiring manual resolution — even though the WAF already handles it.

## Solution: Trust Zone Inheritance

Use the existing trust zone and trust boundary architecture to propagate platform countermeasures. Components in a protected zone inherit platform countermeasures from components at or near the zone boundary.

### How It Works

Given this architecture:

```
[External Zone]          [DMZ Zone]              [Internal Zone]
  User ──────→ WAF ──── trust boundary ────→ Web Server → Database
```

1. The WAF is in the DMZ zone and has `SQL Injection Filtering: platform` (from its pack)
2. A `TrustBoundary` connects the DMZ zone to the Internal zone
3. The Web Server is in the Internal zone and also has a `SQL Injection` threat
4. During threat generation for the Web Server, the system checks: does any component in an adjacent outer zone (connected via trust boundary) have a platform countermeasure for the same `ThreatLibrary`?
5. If yes → create the Web Server's countermeasure as `platform` (inherited)
6. If no → create as `gap` (default behavior)

### Determining Protection Direction

`TrustZone.trust_level` (0–100 scale) determines which zone is "outer" (lower trust) and which is "inner" (higher trust). Platform countermeasures propagate **inward** — from lower-trust zones toward higher-trust zones, matching how perimeter defenses work.

For a `TrustBoundary` connecting `zone_a` and `zone_b`:
- The zone with the **lower** `trust_level` is the perimeter/outer zone
- Platform countermeasures on components in the outer zone propagate to components in the inner zone
- If trust levels are equal, no automatic propagation (ambiguous topology)

## Existing Wiring

This approach leverages models and relationships that already exist:

| What | Where | How It's Used |
|---|---|---|
| `OrgsystemComponent.trust_zone` | `systems/models.py` | FK to `TrustZone` — every component knows its zone |
| `TrustZone.trust_level` | `systems/models.py` | 0–100 scale, determines inner vs outer |
| `TrustZone.parent` | `systems/models.py` | Self-referential FK for nested zones |
| `TrustBoundary.zone_a / zone_b` | `systems/models.py` | Connects two zones, defines the security perimeter |
| `ComponentInstanceCountermeasure.countermeasure_library` | `threats/models.py` | FK to library item — used to match "same countermeasure" across components |
| `ComponentInstanceCountermeasure.status` | `threats/models.py` | Already supports `platform` value |
| DFD canvas sync | `diagrams/services.py` | Automatically sets `trust_zone` FK when components are placed in zones on canvas |
| Component serializer | `systems/serializers.py` | `trust_zone` is already a writable field — supports non-DFD assignment |

## What Needs to Be Built

### 1. Inheritance Query Function

A function that, given a component and a threat, determines if a platform countermeasure should be inherited:

```python
def get_inherited_platform_status(component, threat_library):
    """
    Check if any component in an adjacent outer zone has a platform
    countermeasure for the same threat. Returns "platform" or None.
    """
    zone = component.trust_zone
    if not zone:
        return None

    # Find trust boundaries where this zone is the inner (higher trust) side
    boundaries = TrustBoundary.objects.filter(
        Q(zone_a=zone) | Q(zone_b=zone)
    )

    for boundary in boundaries:
        outer_zone = boundary.zone_a if boundary.zone_b == zone else boundary.zone_b
        if outer_zone.trust_level >= zone.trust_level:
            continue  # Not an outer zone

        # Check components in the outer zone for matching platform countermeasures
        has_platform = ComponentInstanceCountermeasure.objects.filter(
            instance_threat__component__trust_zone=outer_zone,
            instance_threat__threat_library=threat_library,
            status="platform",
        ).exists()

        if has_platform:
            return "platform"

    return None
```

### 2. Integration into Threat Generation Paths

Update the countermeasure instance creation paths (listed in UPDATE-IMPORT-PACKS.md, section 3) to check for inheritance:

```python
# Determine status: library default_status → zone inheritance → fallback to "gap"
if countermeasure_library and countermeasure_library.default_status == "platform":
    status = "platform"
elif countermeasure_library:
    inherited = get_inherited_platform_status(component, threat_library)
    status = inherited or "gap"
else:
    status = "gap"
```

The same logic applies to `FlowInstanceCountermeasure` — use the source component's zone for the inheritance check.

### 3. Re-evaluation on Zone Changes

When a component's `trust_zone` assignment changes (via DFD canvas move or manual edit), re-evaluate its countermeasure statuses:

- Component moved **into** a protected zone → check for inherited platform countermeasures and update `gap` → `platform` where applicable
- Component moved **out of** a protected zone → revert inherited `platform` → `gap`

To distinguish inherited platform status from direct platform status (the component's own pack said `platform`), add a boolean field:

```python
# On ComponentInstanceCountermeasure and FlowInstanceCountermeasure
is_inherited = models.BooleanField(default=False)
```

Only inherited platform countermeasures are reverted on zone change. Direct platform countermeasures (from the component's own pack) are not affected.

### 4. Trust Zone Assignment in Non-DFD Mode

The workspace (Threat Analysis tab) needs a way to assign components to trust zones without the DFD canvas. The backend already accepts `trust_zone` on the component serializer. The frontend needs:

- A trust zone dropdown/selector on the "Add Component" dialog or component edit panel in the workspace view
- This enables zone-based inheritance for the `manual` and `hybrid` modeling modes

### 5. UI Indicators

When a countermeasure is inherited from a zone boundary component, the UI should indicate this:

- Show the platform badge (green + lock) as usual
- Add a label like "Inherited from WAF (DMZ)" so the user understands why it's platform
- The countermeasure should not be user-editable (same as direct platform countermeasures)

## Nested Zones

`TrustZone.parent` supports nested zones (e.g., DMZ → App Tier → Database Tier). Inheritance should traverse the zone hierarchy: a platform countermeasure at the outermost boundary protects all inner zones, not just the immediately adjacent one.

The inheritance query should walk the `TrustBoundary` chain inward, checking each boundary layer.

## Edge Cases

| Scenario | Behavior |
|---|---|
| Component not in any zone | No inheritance — status determined by library `default_status` only |
| Zone has no trust boundaries | No inheritance — isolated zone |
| Equal trust levels on both sides of boundary | No automatic propagation — ambiguous, treat as no inheritance |
| WAF component added to DFD after downstream threats already generated | Re-evaluate: existing `gap` countermeasures matching the WAF's platform countermeasures should flip to `platform` (inherited) |
| WAF component removed from DFD | Re-evaluate: inherited platform countermeasures should revert to `gap` |
| Multiple boundaries with conflicting signals (one path protected, one not) | Optimistic: if any boundary path provides protection, inherit as `platform`. The zone model assumes perimeter protection applies zone-wide |

## Scope

This is a standalone feature that builds on `default_status` from pack import. It does not require changes to pack YAML format, risk scoring, or threat status derivation (those already handle `platform` correctly).
