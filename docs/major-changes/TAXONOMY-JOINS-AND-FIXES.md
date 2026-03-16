# STATUS - COMPLETE

# Taxonomy Join Migration & Related Fixes

**Date:** 2026-03-15
**Status:** Complete (2026-03-16)

---

## Overview

Five changes bundled together because they all touch the threat-taxonomy relationship:

1. **Migrate threat-taxonomy linking from inline to join files** (architectural)
2. **Remove unused `customCategory` field from AddThreatDialog** (bug fix)
3. **Show taxonomy indicator in collapsed threat view** (UI)
4. **Fix CODING_STANDARDS.md STRIDE values** (docs)
5. **Add clickable reference URLs to taxonomy entries** (feature)

---

## Change 1: Migrate to Join-Based Taxonomy Approach

### Problem

Threat-to-taxonomy mappings are embedded inline in `threats.yaml`:

```yaml
# aws-mini/threats.yaml (current)
- id: apigw-injection
  name: API Gateway Input Injection
  taxonomy_references: # <-- inline
    stride: [tampering]
    capec: ["66"]
    cwe: [CWE-20]
    mitre-attack: [T1190]
```

Every other cross-entity relationship uses join files:

| Relationship                  | Mechanism  | File                                     |
| ----------------------------- | ---------- | ---------------------------------------- |
| Components -> Threats         | join       | `joins/components-threats.yaml`          |
| Threats -> Countermeasures    | join       | `joins/threats-countermeasures.yaml`     |
| Countermeasures -> Compliance | join       | `joins/countermeasures-{framework}.yaml` |
| **Threats -> Taxonomies**     | **inline** | **`threats.yaml`**                       |

This inconsistency means adding a new taxonomy (e.g., LINDDUN) requires editing every threat pack's `threats.yaml`. With joins, a new pack can ship its own mappings independently.

### Solution

Move taxonomy references to join files using the same pattern as compliance overlays.

**New file pattern:** `joins/threats-{taxonomy-slug}.yaml`

```yaml
# joins/threats-stride.yaml
taxonomy: stride

mappings:
  - threat: s3-public-exposure
    entries: [information-disclosure]
  - threat: s3-data-tampering
    entries: [tampering]
  - threat: apigw-injection
    entries: [tampering]
  - threat: apigw-unauthorized-access
    entries: [spoofing]
```

```yaml
# joins/threats-cwe.yaml
taxonomy: cwe

mappings:
  - threat: s3-public-exposure
    entries: [CWE-862, CWE-200]
  - threat: apigw-injection
    entries: [CWE-20]
  - threat: apigw-unauthorized-access
    entries: [CWE-287, CWE-306]
```

Same pattern for `threats-capec.yaml` and `threats-mitre-attack.yaml`.

**Cleaned-up `threats.yaml`** — remove `taxonomy_references` entirely:

```yaml
# aws-mini/threats.yaml (after migration)
- id: apigw-injection
  name: API Gateway Input Injection
  description: |
    Malicious payloads passed through API Gateway to backend services,
    exploiting insufficient input validation.
  # taxonomy_references removed — now in joins/threats-*.yaml
```

### Backend Changes

**1. New function: `_load_threat_taxonomy_joins()`** in `packs/services.py`

Mirrors `_load_framework_overlay()`. Reads a `threats-{slug}.yaml` file and creates `ThreatLibraryTaxonomyEntry` M2M records:

```python
def _load_threat_taxonomy_joins(library_pack, file_path):
    """Load threat-taxonomy mappings from a join file."""
    data = yaml.safe_load(open(file_path)) or {}
    taxonomy_slug = data.get("taxonomy", "")
    count = 0

    for mapping in data.get("mappings", []):
        threat = _resolve_threat_reference(library_pack, mapping.get("threat", ""))
        if not threat:
            continue
        for external_id in mapping.get("entries", []):
            try:
                taxonomy_entry = TaxonomyEntry.objects.get(
                    taxonomy__slug=taxonomy_slug,
                    external_id=str(external_id),
                )
                ThreatLibraryTaxonomyEntry.objects.get_or_create(
                    threat_library=threat,
                    taxonomy_entry=taxonomy_entry,
                )
                count += 1
            except TaxonomyEntry.DoesNotExist:
                logger.warning(
                    f"Taxonomy entry {taxonomy_slug}:{external_id} not found"
                )
    return count
```

**2. Update `_import_pack()` orchestration** — add join file scanning after existing joins:

```python
# After line 908 (threat-countermeasure joins), add:
for join_file in joins_dir.glob("threats-*.yaml"):
    if join_file.name == "threats-countermeasures.yaml":
        continue  # Already handled above
    _load_threat_taxonomy_joins(library_pack, join_file)
```

**3. Remove `_link_taxonomy_references()` call** from `_load_threats()` (line 1296).

The function `_link_taxonomy_references()` itself can be deleted entirely.

**4. Remove `taxonomy_references` parsing** from `_load_threats()` — the field is no longer read.

**5. Update `_extract_pack_preview()`** in `packs/services.py` (lines 356-366)

This function reads `taxonomy_references` directly from `threats.yaml` to build preview data for uninstalled packs (the "Browse Packs" dialog). After removing `taxonomy_references` from threats.yaml, previews would show zero taxonomy entries.

Update to also scan join files in the pack directory:

```python
# After existing taxonomy_references parsing (which can remain as a fallback),
# also scan for join files:
join_taxonomy_entries = {}  # {threat_slug: [taxonomy_entry_dicts]}
joins_dir = pack_dir / "joins"
if joins_dir.exists():
    for join_file in joins_dir.glob("threats-*.yaml"):
        if join_file.name == "threats-countermeasures.yaml":
            continue
        try:
            with open(join_file) as f:
                join_data = yaml.safe_load(f) or {}
            taxonomy_slug = join_data.get("taxonomy", "")
            for mapping in join_data.get("mappings", []):
                threat_slug = mapping.get("threat", "")
                for entry_id in mapping.get("entries", []):
                    title = str(entry_id).replace("-", " ").title()
                    join_taxonomy_entries.setdefault(threat_slug, []).append({
                        "taxonomy_slug": taxonomy_slug,
                        "external_id": str(entry_id),
                        "title": title,
                    })
        except Exception as e:
            logger.error(f"Error reading {join_file}: {e}")

# Merge join-sourced taxonomy entries into each threat's taxonomy_entries list.
# This runs after the threats list is built (existing code around lines 356-373),
# so each threat dict already has a "taxonomy_entries" key from inline refs (or []).
for threat in threats:
    slug = threat.get("slug", "")
    if slug in join_taxonomy_entries:
        threat["taxonomy_entries"].extend(join_taxonomy_entries[slug])
```

Without this change, the pack preview dialog will show threats with no taxonomy badges after migration.

### Pack YAML Changes (aws-mini and base-stride)

Create join files, remove `taxonomy_references` from `threats.yaml` in **both** packs:

```
aws-mini/
├── joins/
│   ├── components-threats.yaml          # existing
│   ├── threats-countermeasures.yaml     # existing
│   ├── countermeasures-*.yaml           # existing
│   ├── threats-stride.yaml              # NEW
│   ├── threats-cwe.yaml                 # NEW
│   ├── threats-capec.yaml               # NEW
│   └── threats-mitre-attack.yaml        # NEW
├── threats.yaml                         # MODIFIED (remove taxonomy_references)
```

```
base-stride/
├── joins/
│   └── threats-stride.yaml              # NEW (28 threats, STRIDE-only)
├── threats.yaml                         # MODIFIED (remove taxonomy_references)
```

`base-stride` has 28 threats with inline `taxonomy_references` mapping to STRIDE only. Without migrating it, reimporting base-stride after deleting `_link_taxonomy_references()` would create threats with **no taxonomy links**. Since base-stride has no CWE/CAPEC/ATT&CK mappings, only one join file (`threats-stride.yaml`) is needed.

### No Model Changes

The `ThreatLibraryTaxonomyEntry` M2M table is unchanged. Only the data ingestion path changes.

### No Frontend Changes

The API response structure is unchanged — `taxonomyEntries` is populated from the same M2M table regardless of how records were created.

### Future Benefit: Taxonomy Packs Can Ship Their Own Mappings

Once join-based loading supports cross-pack references, a LINDDUN taxonomy pack could ship:

```
linddun-taxonomy/
├── pack.yaml
├── taxonomy.yaml
└── joins/
    └── threats-linddun.yaml    # maps aws-mini/apigw-injection -> linddun categories
```

This requires one small addition: `_load_threat_taxonomy_joins()` should use `_resolve_threat_reference()` which already supports cross-pack qualified slugs (`aws-mini/apigw-injection`). So this works out of the box with the proposed implementation.

### Impact on LINDDUN-PRIVACY-PACKS.md

The existing LINDDUN proposal (in this same directory) shows inline `taxonomy_references`. After this migration, that doc should be updated to use join files instead. However, since that doc is a proposal and not yet implemented, it can be updated alongside this change.

---

## Change 2: Remove Unused `customCategory` from AddThreatDialog

### Problem

`AddThreatDialog.tsx:69` declares `customCategory` state and renders a STRIDE category selector in the Custom Threat form. But `handleAddCustom()` (line 107-117) never includes it in the API payload. The selected category is silently dropped.

### Solution

Remove the state variable, the `<Select>` component, and the reset call:

- **Delete** line 69: `const [customCategory, setCustomCategory] = useState<STRIDECategory | ''>('')`
- **Delete** line 138: `setCustomCategory('')`
- **Delete** the STRIDE category `<Select>` component in the custom threat form (the JSX block that renders the category dropdown)

### Files Changed

- `frontend/src/features/dfd-editor/components/threat-analysis/AddThreatDialog.tsx`

---

## Change 3: Show Taxonomy Indicator in Collapsed Threat View

### Problem

`ComponentView.tsx:1663-1677` — collapsed threats only show the STRIDE label. Threats with CWE/ATT&CK/CAPEC associations give no visual hint unless clicked. The same STRIDE-only pattern is duplicated for dismissed threats at lines 1758-1769.

### Solution

Replace **both** STRIDE-only displays with `TaxonomyBadges` using `maxVisible={1}`:

**Active threats (collapsed) — lines 1663-1677:**

```tsx
// BEFORE:
{
  (() => {
    const strideEntry = ct.taxonomyEntries?.find(
      (e) => e.taxonomySlug === "stride",
    );
    if (!strideEntry) return null;
    const strideConfig =
      STRIDE_CONFIG[strideEntry.externalId as STRIDECategory];
    return strideConfig ? (
      <span
        className="text-[10px] font-medium"
        style={{ color: strideConfig.color }}
      >
        {strideConfig.label}
      </span>
    ) : null;
  })();
}

// AFTER:
<TaxonomyBadges entries={ct.taxonomyEntries} maxVisible={1} size="sm" />;
```

**Dismissed threats — lines 1758-1769:**

```tsx
// BEFORE:
{
  (() => {
    const strideEntry = ct.taxonomyEntries?.find(
      (e) => e.taxonomySlug === "stride",
    );
    if (!strideEntry) return null;
    const strideConfig =
      STRIDE_CONFIG[strideEntry.externalId as STRIDECategory];
    return strideConfig ? (
      <span className="text-[10px] text-muted-foreground">
        {strideConfig.label}
      </span>
    ) : null;
  })();
}

// AFTER:
<TaxonomyBadges entries={ct.taxonomyEntries} maxVisible={1} size="sm" />;
```

This shows the first taxonomy badge (typically STRIDE) plus a "+N" indicator with tooltip for the rest. The `TaxonomyBadges` component already supports `maxVisible` with overflow tooltip — no new component logic needed.

### Files Changed

- `frontend/src/features/dfd-editor/components/threat-analysis/ComponentView.tsx`

---

## Change 4: Fix CODING_STANDARDS.md STRIDE Values

### Problem

`CODING_STANDARDS.md:103-109` shows STRIDE category values in camelCase:

```typescript
// CODING_STANDARDS.md (WRONG)
export type STRIDECategory =
  | "informationDisclosure"
  | "denialOfService"
  | "elevationOfPrivilege";
```

Actual code in `domain.ts:7-13`, database `TaxonomyEntry.external_id` values, and pack YAML files all use kebab-case:

```typescript
// domain.ts (CORRECT)
export type STRIDECategory =
  | "information-disclosure"
  | "denial-of-service"
  | "elevation-of-privilege";
```

### Why This Happened

STRIDE category values are `TaxonomyEntry.external_id` values — they're data stored in a taxonomy pack, not Django TextChoices. The CODING_STANDARDS rule "store enum values in camelCase" applies to Django TextChoices (e.g., `'inProgress'`), not to taxonomy external IDs which are defined in pack YAML files.

### Solution

Update `CODING_STANDARDS.md` lines 103-109 to use kebab-case, matching actual code:

```typescript
export type STRIDECategory =
  | "spoofing"
  | "tampering"
  | "repudiation"
  | "information-disclosure"
  | "denial-of-service"
  | "elevation-of-privilege";
```

### Files Changed

- `CODING_STANDARDS.md`

---

## Change 5: Add Clickable Reference URLs to Taxonomy Entries

### Problem

Taxonomy badges (CAPEC-66, CWE-20, T1190) are display-only. A developer reviewing a threat has no quick way to learn what "CWE-20" means without manually searching. These taxonomies all have stable, well-known reference URLs:

| Taxonomy | URL Pattern                                          | Example                                                      |
| -------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| CWE      | `https://cwe.mitre.org/data/definitions/{id}.html`   | [CWE-20](https://cwe.mitre.org/data/definitions/20.html)     |
| CAPEC    | `https://capec.mitre.org/data/definitions/{id}.html` | [CAPEC-66](https://capec.mitre.org/data/definitions/66.html) |
| ATT&CK   | `https://attack.mitre.org/techniques/{id}/`          | [T1190](https://attack.mitre.org/techniques/T1190/)          |
| STRIDE   | _(none — classification model, not a database)_      | —                                                            |

### Solution

#### Backend: Add `reference_url` to `TaxonomyEntry` model

```python
# threats/models.py — TaxonomyEntry (line 114)
class TaxonomyEntry(TimestampedModel):
    taxonomy = models.ForeignKey(...)
    external_id = models.CharField(...)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    reference_url = models.URLField(blank=True)  # NEW
```

Requires a migration: `python manage.py makemigrations threats`.

#### Backend: Add `reference_url` to serializer

```python
# threats/serializers.py — TaxonomyEntryNestedSerializer (line 43)
class TaxonomyEntryNestedSerializer(serializers.ModelSerializer):
    taxonomy_slug = serializers.CharField(source="taxonomy.slug", read_only=True)
    taxonomy_name = serializers.CharField(source="taxonomy.name", read_only=True)

    class Meta:
        model = TaxonomyEntry
        fields = ["id", "taxonomy_slug", "taxonomy_name", "external_id", "title", "reference_url"]
```

#### Backend: Populate from taxonomy pack YAML

Add `reference_url` to each taxonomy entry in the pack YAML files:

```yaml
# mini-cwe/taxonomy.yaml
taxonomies:
  - slug: cwe
    name: CWE Software Weaknesses
    source_url: "https://cwe.mitre.org/"
    entries:
      - external_id: CWE-20
        title: Improper Input Validation
        reference_url: "https://cwe.mitre.org/data/definitions/20.html" # NEW
      - external_id: CWE-79
        title: Improper Neutralization of Input During Web Page Generation (XSS)
        reference_url: "https://cwe.mitre.org/data/definitions/79.html" # NEW
```

```yaml
# mini-capec/taxonomy.yaml
entries:
  - external_id: "66"
    title: SQL Injection
    reference_url: "https://capec.mitre.org/data/definitions/66.html" # NEW
```

```yaml
# mini-attack/taxonomy.yaml
entries:
  - external_id: T1190
    title: Exploit Public-Facing Application
    reference_url: "https://attack.mitre.org/techniques/T1190/" # NEW
```

STRIDE entries get no `reference_url` (no external database to link to).

Update `_load_taxonomy()` in `packs/services.py` to read and store the field during pack import.

#### Frontend: Add `referenceUrl` to TaxonomyEntry type

```typescript
// types/domain.ts
export interface TaxonomyEntry {
  id: number;
  taxonomySlug: string;
  taxonomyName: string;
  externalId: string;
  title: string;
  referenceUrl?: string; // NEW (optional — STRIDE entries won't have one)
}
```

#### Frontend: Make TaxonomyBadges clickable

Update `TaxonomyBadges.tsx` to render badges with `referenceUrl` as external links:

```tsx
// TaxonomyBadges.tsx — for each visible entry:
if (entry.referenceUrl) {
  return (
    <a
      key={`${entry.taxonomySlug}-${entry.externalId}`}
      href={entry.referenceUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Badge
        variant="outline"
        className={`${textSizeClass} ${bgClass} cursor-pointer hover:opacity-80`}
        title={entry.title}
      >
        {label}
      </Badge>
    </a>
  );
}
// Otherwise render non-clickable badge (existing code for STRIDE)
```

Clicking a CWE/CAPEC/ATT&CK badge opens the reference page in a new tab. STRIDE badges remain non-clickable (no `referenceUrl`).

### Files Changed

- `backend/apps/threats/models.py` — add `reference_url` field
- `backend/apps/threats/serializers.py` — include `reference_url` in nested serializer
- `backend/apps/packs/services.py` — read `reference_url` from YAML during taxonomy import
- `libraries/packs/mini-cwe/taxonomy.yaml` — add `reference_url` to each entry
- `libraries/packs/mini-capec/taxonomy.yaml` — add `reference_url` to each entry
- `libraries/packs/mini-attack/taxonomy.yaml` — add `reference_url` to each entry
- `frontend/src/types/domain.ts` — add optional `referenceUrl` to `TaxonomyEntry`
- `frontend/src/components/shared/TaxonomyBadges.tsx` — wrap badges in `<a>` when URL exists

---

## Risk Analysis

### Unintended Consequences

| Change                | Risk                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Mitigation                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Join migration        | Existing `taxonomy_references` in threats.yaml silently ignored if both old and new code paths exist during transition                                                                                                                                                                                                                                                                                                                               | Delete `_link_taxonomy_references()` and remove field from threats.yaml atomically. Pre-release + test data = safe.                                                            |
| Join migration        | Import order dependency — taxonomy packs must be installed before threat packs referencing them                                                                                                                                                                                                                                                                                                                                                      | Already enforced by `depends_on` in pack.yaml. aws-mini already declares `depends_on: [stride-taxonomy, mini-capec, mini-cwe, mini-attack]`.                                   |
| Join migration        | Pack preview (`_extract_pack_preview()`) reads `taxonomy_references` from threats.yaml — previews break if field removed without updating preview logic                                                                                                                                                                                                                                                                                              | Update `_extract_pack_preview()` to also scan join files (see Backend Change 5).                                                                                               |
| Join migration        | base-stride pack reimport would lose all taxonomy links after `_link_taxonomy_references()` is deleted                                                                                                                                                                                                                                                                                                                                               | Migrate base-stride in the same pass — create `joins/threats-stride.yaml`, remove inline refs.                                                                                 |
| Remove customCategory | Custom threats still have no taxonomy associations after creation                                                                                                                                                                                                                                                                                                                                                                                    | This is existing behavior (the field was never wired). Future work: add taxonomy association UI for custom threats.                                                            |
| Collapsed view change | Slightly wider collapsed threat cards due to badge rendering vs plain text                                                                                                                                                                                                                                                                                                                                                                           | `maxVisible={1}` keeps it compact. Badge + "+N" takes roughly the same space as the current STRIDE text label.                                                                 |
| Reference URLs        | External URLs could become stale or change                                                                                                                                                                                                                                                                                                                                                                                                           | CWE/CAPEC/ATT&CK URLs have been stable for years. URLs are stored per-entry so they can be updated individually during pack reimport.                                          |
| Reference URLs        | Clicking a badge navigates away from the app                                                                                                                                                                                                                                                                                                                                                                                                         | Opens in a new tab (`target="_blank"`). No loss of context.                                                                                                                    |
| Join migration        | Stale M2M records persist on reimport. Both `_link_taxonomy_references()` and proposed `_load_threat_taxonomy_joins()` use `get_or_create` — they only add, never delete. If a taxonomy mapping is removed from a join file and the pack is reimported, the old `ThreatLibraryTaxonomyEntry` record remains in the database. This is a pre-existing systemic issue (also affects framework overlays) but the migration is a good time to address it. | Consider adding a cleanup step: delete existing M2M entries for the pack's threats before re-creating them, to ensure idempotent reimports.                                    |
| Join migration        | Decoupled refs are easier to forget. With inline `taxonomy_references`, editing a threat naturally surfaces its taxonomy associations. With separate join files, someone could modify `threats.yaml` (add/rename/remove a threat) and forget to update the corresponding join files.                                                                                                                                                                 | No automated validation exists to catch orphaned refs in join files. Consider a management command or import-time warning for join file refs that don't resolve to any threat. |

### Potential Regression Errors

| Area                 | What Could Break                                                                                                                                                               | How to Verify                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pack import          | New join files not detected during import                                                                                                                                      | Test: reimport aws-mini and base-stride, verify `ThreatLibraryTaxonomyEntry` count matches expected.                                                                                                                                                                                                                                             |
| Pack import          | `threats-countermeasures.yaml` accidentally processed as taxonomy join                                                                                                         | The glob `threats-*.yaml` matches it — must explicitly skip `threats-countermeasures.yaml` in the loop. Any future file matching `threats-*.yaml` (e.g., `threats-countermeasures-nist.yaml`) would also be incorrectly processed as a taxonomy join. Consider using a more specific glob or a naming convention like `taxonomy-threats-*.yaml`. |
| Threat API responses | `taxonomyEntries` field empty after migration                                                                                                                                  | Verify serializer still works — it reads from the same M2M table, unaffected by data ingestion changes.                                                                                                                                                                                                                                          |
| Report generation    | `_get_stride_category()` in `report_service.py:288-296` depends on STRIDE taxonomy entries existing                                                                            | Unchanged — STRIDE entries are still created via the new join file.                                                                                                                                                                                                                                                                              |
| Report generation    | `_get_stride_category()` uses `"stride" in entry.taxonomy.slug.lower()` — a substring match. A future taxonomy slug like `"linddun-stride-extended"` would accidentally match. | Not a regression from this change, but worth hardening to `entry.taxonomy.slug == "stride"` while touching related code.                                                                                                                                                                                                                         |
| Pack import          | Data flow threats (dataflow-mitm, dataflow-eavesdropping, dataflow-replay-attack, dataflow-injection) exist in aws-mini/threats.yaml                                           | Verify these are included in the new join files. The examples in this doc only show S3/APIGW threats.                                                                                                                                                                                                                                            |
| LINDDUN doc          | Proposed doc shows inline `taxonomy_references`                                                                                                                                | Update the proposal to use join file format.                                                                                                                                                                                                                                                                                                     |
| Pack preview         | `_extract_pack_preview()` shows zero taxonomy entries for uninstalled packs                                                                                                    | Verify "Browse Packs" dialog still shows taxonomy badges after migration.                                                                                                                                                                                                                                                                        |
| Dismissed threats    | Dismissed threats view still uses STRIDE-only code                                                                                                                             | Replace with `TaxonomyBadges` alongside active collapsed threats (see Change 3).                                                                                                                                                                                                                                                                 |

### Inconsistencies (Pre-Existing)

| Issue                                                                            | Location                                                                                                           | Severity                                                                                                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `base-stride` pack threats have no CWE/CAPEC/ATT&CK references                   | `libraries/packs/base-stride/threats.yaml`                                                                         | Low — pack not actively used, STRIDE-only is expected. Included in join migration scope to prevent broken reimport. |
| 5 aws-mini threats are STRIDE-only (no CWE/CAPEC/ATT&CK)                         | `lambda-dos`, `apigw-rate-limit-bypass`, `apigw-logging-gap`, `dynamodb-capacity-exhaustion`, `sqs-queue-flooding` | Medium — these could be enriched when creating the new join files.                                                  |
| AddThreatDialog library tab shows taxonomy as comma-separated titles, not badges | `AddThreatDialog.tsx:199-203`                                                                                      | Low — cosmetic.                                                                                                     |

### Gaps

| Gap                                                                   | Impact                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No write API for `ThreatLibraryTaxonomyEntry`                         | Users cannot manually associate taxonomy entries with threats via UI. Only pack import creates these.                                                                                                                                                                        |
| No `selected_overlays` support for taxonomy joins                     | Unlike compliance overlays, taxonomy joins cannot be selectively imported/skipped. Could be added later.                                                                                                                                                                     |
| Custom threats have zero taxonomy associations and no way to add them | 127 custom threats in test DB have no taxonomy badges.                                                                                                                                                                                                                       |
| No idempotent M2M cleanup on reimport                                 | Both current and proposed code only use `get_or_create` for taxonomy M2M entries — removed mappings in YAML are never deleted from the database. Systemic issue across all join types.                                                                                       |
| `_load_taxonomy()` update not fully specified                         | The doc says to update `_load_taxonomy()` to read `reference_url`, but doesn't show the specific code change. The `defaults` dict in `TaxonomyEntry.objects.update_or_create()` (services.py line ~1160) needs `"reference_url": entry_data.get("reference_url", "")` added. |

### Incidental Findings

| Finding                                                                                           | Location                                                                                                                          | Type                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `customCategory` state declared, rendered, but never sent to API                                  | `AddThreatDialog.tsx:69`                                                                                                          | Dead code (addressed in Change 2)                                                                                                                   |
| Dismissed threats view duplicates STRIDE-only rendering pattern                                   | `ComponentView.tsx:1758-1769`                                                                                                     | Inconsistency with expanded view (addressed in Change 3)                                                                                            |
| `ExternalTaxonomyViewSet` and `TaxonomyEntryViewSet` are read-only                                | `threats/views.py:496-512`                                                                                                        | Design limitation — no write endpoints                                                                                                              |
| `ThreatLibraryTaxonomyEntryAdmin` registered but taxonomy editing only possible via Django Admin  | `threats/admin.py:84-87`                                                                                                          | Limited access path                                                                                                                                 |
| 127 orphaned custom threats with `source_pack=NULL`                                               | Database                                                                                                                          | Test data artifacts — includes items like "dinki chika threat"                                                                                      |
| 6 CWE, 7 ATT&CK, 9 CAPEC taxonomy entries exist in DB but are never referenced by any threat      | Database                                                                                                                          | Unused taxonomy entries — could be mapped when enriching the 5 STRIDE-only aws-mini threats                                                         |
| `_get_stride_category()` in report_service.py hardcodes STRIDE lookup for report generation       | `report_service.py:288-296`                                                                                                       | Not a bug, but reports currently only summarize STRIDE distribution — no CWE/ATT&CK/CAPEC report sections exist                                     |
| `_get_stride_category()` uses substring match (`"stride" in slug.lower()`) instead of exact match | `report_service.py:293`                                                                                                           | Could match unintended taxonomy slugs in the future (e.g., `"linddun-stride-extended"`)                                                             |
| 4 serializers duplicate identical `get_taxonomy_entries()` method                                 | `ThreatLibrarySerializer`, `ThreatLibraryListSerializer`, `ComponentInstanceThreatSerializer`, `DataFlowInstanceThreatSerializer` | Maintenance smell — adding `reference_url` to `TaxonomyEntryNestedSerializer` propagates automatically, but the duplicated method logic could drift |
| N+1 query potential in taxonomy serializers                                                       | All 4 `get_taxonomy_entries()` methods call `obj.threat_library.taxonomy_entries.select_related(...)` per-object in list views    | Consider `prefetch_related("taxonomy_entries__taxonomy_entry__taxonomy")` on list querysets                                                         |
| `toggleChecklistItem` in `useWorkspaceThreatAnalysis.ts` is a no-op                               | `useWorkspaceThreatAnalysis.ts:375-377`                                                                                           | Empty function body — planned but not implemented                                                                                                   |

---

## Implementation Order

1. **CODING_STANDARDS.md fix** — zero risk, do first
2. **Remove `customCategory`** — simple deletion, no dependencies
3. **Add `reference_url` to taxonomy entries** — model migration + YAML data + serializer (do before join migration so both changes can be verified with a single reimport)
   - Add `reference_url` field to `TaxonomyEntry` model, run migration
   - Add `reference_url` to all entries in `mini-cwe`, `mini-capec`, `mini-attack` taxonomy YAML files
   - Update `_load_taxonomy()` in `packs/services.py` to read the field
   - Add `reference_url` to `TaxonomyEntryNestedSerializer`
   - Add optional `referenceUrl` to frontend `TaxonomyEntry` type
   - Update `TaxonomyBadges` to render clickable links
4. **Create join files + backend migration** — the main architectural change
   - Create `joins/threats-stride.yaml`, `threats-cwe.yaml`, `threats-capec.yaml`, `threats-mitre-attack.yaml` in aws-mini
   - Create `joins/threats-stride.yaml` in base-stride (28 STRIDE-only threats)
   - Enrich the 5 STRIDE-only aws-mini threats with CWE/CAPEC/ATT&CK entries while creating the join files
   - Add `_load_threat_taxonomy_joins()` to `packs/services.py`
   - Update `_extract_pack_preview()` to scan join files for taxonomy data
   - Remove `_link_taxonomy_references()` and `taxonomy_references` parsing from `_load_threats()`
   - Remove `taxonomy_references` from `aws-mini/threats.yaml` and `base-stride/threats.yaml`
   - Reimport both packs and verify (this also verifies `reference_url` from step 3)
5. **Collapsed view taxonomy indicator** — depends on step 4 being verified (so all taxonomy data is populated correctly)
6. **Update LINDDUN-PRIVACY-PACKS.md** to use join file format instead of inline taxonomy_references

---

## Testing

1. **Reimport aws-mini and base-stride** — verify no import errors, all taxonomy M2M records created
2. **Django shell verification:**
   ```python
   from apps.threats.models import ThreatLibraryTaxonomyEntry, TaxonomyEntry
   # aws-mini: ~95 total (49 STRIDE + 46 others)
   # base-stride: 28 total (28 STRIDE)
   ThreatLibraryTaxonomyEntry.objects.count()
   # Verify all 21 aws-mini threats have STRIDE
   # Verify all 21 aws-mini threats have at least one non-STRIDE entry (after enrichment)
   # Verify all 28 base-stride threats have STRIDE
   # Verify reference_url populated for CWE/CAPEC/ATT&CK entries
   TaxonomyEntry.objects.exclude(reference_url="").count()
   # Verify STRIDE entries have no reference_url
   TaxonomyEntry.objects.filter(taxonomy__slug="stride", reference_url="").count()  # should be 6
   ```
3. **Pack preview** — uninstall a pack, verify "Browse Packs" dialog still shows taxonomy badges
4. **Threat Analysis workspace** — select a component, verify expanded threats show all taxonomy badges
5. **Clickable badges** — click a CWE/CAPEC/ATT&CK badge, verify it opens the correct reference page in a new tab. Verify STRIDE badges are not clickable.
6. **Collapsed threats** — verify "+N" indicator appears for threats with multiple taxonomies
7. **Dismissed threats** — verify taxonomy badges appear for dismissed threats (not just STRIDE label)
8. **Custom threat creation** — verify STRIDE category selector is gone, custom threats create successfully without it
9. **Reports tab** — verify STRIDE summary still renders correctly in reports
