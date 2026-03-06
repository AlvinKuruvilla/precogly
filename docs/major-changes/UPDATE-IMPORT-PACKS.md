# Update: Pack Import — Platform-Owned Countermeasures

## Context

Countermeasures now have 5 distinct statuses: `platform`, `gap`, `planned`, `verified`, `waived`.

- **Platform** = infrastructure-provided, immutable (green + lock icon in UI)
- **Verified** = team-implemented and confirmed (green, editable)
- **Gap / Planned / Waived** = the standard workflow states

Platform status is not user-settable from the UI. It is assigned at creation time — specifically during pack import or automated threat analysis generation.

## What Needs to Change

When security teams author threat packs (component + threat + countermeasure + compliance mapping), they need the ability to mark specific countermeasures as **platform-owned** in the pack definition.

### Pack JSON Schema

The countermeasure entries in a pack should support an optional `default_status` field (or equivalent) that allows the pack author to specify `"platform"` as the initial status when the countermeasure is applied to a component.

Example: a WAF component pack might define its "SQL Injection Filtering" countermeasure as `platform` — meaning when the pack is imported and the WAF is placed in a DFD, that countermeasure is automatically marked as platform-provided rather than starting as a `gap`.

### Import Behavior

During pack import, if a countermeasure specifies `default_status: "platform"`:
- The created `ComponentInstanceCountermeasure` should have `status = "platform"`
- The UI should show the green lock badge (no user action needed)
- The threat status derivation should treat it as fully mitigated (same as `verified`)

### Threat Analysis Generation

When "Analyze Threats" runs and applies countermeasures from packs, the same `default_status` field should be respected so platform countermeasures are created with the correct status.

## Scope

This is one of several planned updates to the pack import feature. Other updates will be tracked separately.
