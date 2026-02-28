# Unified Taxonomy Model

**Date:** 2026-02-28
**Status:** Proposed

---

## Problem

Our threat classification is hardcoded to a single taxonomy at a time:

```python
# ThreatLibrary (current)
stride_category = CharField  # single STRIDE value: "spoofing", "tampering", etc.
source = CharField            # single source: "stride", "capec", "owasp", "cwe", "custom"
source_id = CharField         # single ID: "CAPEC-66", "CWE-89"
```

This has three problems:

1. **Single-value limitation.** A real threat like SQL Injection maps to multiple taxonomies simultaneously — STRIDE:tampering + STRIDE:information-disclosure + CAPEC:66 + CWE:89. Our schema only stores one.

2. **Hardcoded taxonomies.** Adding support for MITRE ATT&CK, EMB3D (IoT), EVITA (automotive), LINDDUN (privacy), or any future taxonomy means adding new fields to the model each time.

3. **Format interoperability.** TM-Library threats carry `attack_mechanisms[]` (CAPEC) and `weaknesses[]` (CWE) as arrays with no STRIDE. We need to store all of these without losing data on import/export.

The `stride_category` field is also copied to `ComponentInstanceThreat` and `DataFlowInstanceThreat` as a denormalized field.

---

## Proposal

Replace the hardcoded fields with a generic M2M taxonomy system. This follows the same pattern we already use for compliance frameworks (`StandardFramework` → `StandardRequirement` is generic, not one table per framework).

### New Models

```
ExternalTaxonomy
  - source_pack (FK → LibraryPack, nullable, SET_NULL)
  - slug (SlugField, unique)          # "stride", "capec", "cwe", "mitre-attack"
  - name (CharField)                   # "STRIDE Threat Model"
  - description (TextField)
  - source_url (URLField)              # "https://capec.mitre.org/"
  - version (CharField)                # "3.9"

TaxonomyEntry
  - taxonomy (FK → ExternalTaxonomy, CASCADE)
  - external_id (CharField)            # "66", "CWE-89", "tampering", "T1059"
  - title (CharField)                  # "SQL Injection"
  - description (TextField)
  - unique_together: [taxonomy, external_id]

ThreatLibraryTaxonomyEntry (M2M join)
  - threat_library (FK → ThreatLibrary, CASCADE)
  - taxonomy_entry (FK → TaxonomyEntry, CASCADE)
  - unique_together: [threat_library, taxonomy_entry]
```

### How It Works

A single threat can link to multiple entries across multiple taxonomies:

```
ThreatLibrary: "SQL Injection"
    ├── ThreatLibraryTaxonomyEntry → TaxonomyEntry(stride, "tampering")
    ├── ThreatLibraryTaxonomyEntry → TaxonomyEntry(stride, "information-disclosure")
    ├── ThreatLibraryTaxonomyEntry → TaxonomyEntry(capec, "66")
    └── ThreatLibraryTaxonomyEntry → TaxonomyEntry(cwe, "89")
```

Querying by taxonomy is straightforward:

```python
# All STRIDE categories for a threat
threat.taxonomy_entries.filter(taxonomy_entry__taxonomy__slug="stride")

# All threats tagged with CAPEC-66
ThreatLibrary.objects.filter(taxonomy_entries__taxonomy_entry__external_id="66",
                              taxonomy_entries__taxonomy_entry__taxonomy__slug="capec")
```

### Fields Removed

From `ThreatLibrary`:
- `stride_category` — replaced by ThreatLibraryTaxonomyEntry rows where taxonomy.slug="stride"
- `source` — no longer needed
- `source_id` — no longer needed

From `ComponentInstanceThreat` and `DataFlowInstanceThreat`:
- `stride_category` (denormalized copy) — instance threats reach taxonomy entries through their `threat_library` FK

### Parallel with Compliance Frameworks

This is the same structural pattern we already have:

| Compliance | Taxonomy |
|---|---|
| StandardFramework | ExternalTaxonomy |
| StandardRequirement | TaxonomyEntry |
| CountermeasureLibraryStandard | ThreatLibraryTaxonomyEntry |
| Compliance packs | Taxonomy packs |

---

## Taxonomy Packs

Taxonomies are delivered as library packs with `pack_type: taxonomy` (new PackType choice).

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

### Threat Packs Reference Taxonomies

Threat packs declare taxonomy dependencies and reference entries by namespace + ID:

```yaml
# pack.yaml
pack:
  slug: aws-mini
  depends_on:
    - stride: "^1.0.0"
    - capec: "^3.0.0"

# threats.yaml (new format)
threats:
  - slug: sql-injection
    name: SQL Injection
    description: Malicious input exploits application...
    taxonomy_references:
      stride: [tampering, information-disclosure]
      capec: [66, 108]
      cwe: [89]
```

Compared to the old format:

```yaml
# threats.yaml (old format — single values only)
threats:
  - slug: sql-injection
    stride_category: tampering
    source: cwe
    source_id: "CWE-89"
```

The `import_pack` command resolves references: looks up `ExternalTaxonomy(slug="capec")` → `TaxonomyEntry(external_id="66")` → creates `ThreatLibraryTaxonomyEntry` join row. If a referenced taxonomy pack isn't imported yet, the reference is stored as a deferred linkage (same pattern as `PendingFrameworkOverlay` for compliance).

### ID Normalization

Current `stride_category` values use inconsistent casing (camelCase in some places, snake_case in others). The unified taxonomy normalizes all entry IDs to kebab-case: `information-disclosure`, `denial-of-service`, `elevation-of-privilege`.

---

## Migration Strategy

1. Create `ExternalTaxonomy`, `TaxonomyEntry`, `ThreatLibraryTaxonomyEntry` models
2. Add `TAXONOMY` to `LibraryPack.PackType` choices
3. Seed STRIDE taxonomy (6 entries) as a built-in
4. Data migration — convert existing `stride_category` values:
   - For each ThreatLibrary with `stride_category="tampering"`, create a ThreatLibraryTaxonomyEntry linking to `TaxonomyEntry(taxonomy__slug="stride", external_id="tampering")`
5. Data migration — convert existing `source`/`source_id`:
   - If `source="capec"`, `source_id="CAPEC-66"`, create CAPEC taxonomy + entry + join row
   - If `source="cwe"`, `source_id="CWE-89"`, create CWE taxonomy + entry + join row
6. Drop `stride_category`, `source`, `source_id` from ThreatLibrary
7. Drop `stride_category` from ComponentInstanceThreat and DataFlowInstanceThreat
8. Update all pack YAML files to `taxonomy_references` format
9. Update `import_pack` command to read `taxonomy_references` and `taxonomy.yaml`

---

## Format Interoperability

On **TM-Library import**: `attack_mechanisms[]` → create CAPEC TaxonomyEntry rows + join. `weaknesses[]` → create CWE TaxonomyEntry rows + join. No STRIDE rows created (TM-Library doesn't carry STRIDE).

On **TM-Library export**: filter ThreatLibraryTaxonomyEntry by taxonomy slug. `capec` entries → `attack_mechanisms[]`. `cwe` entries → `weaknesses[]`. `stride` entries → preserved in `extensions.precogly.org/stride-categories` for round-trip.

---

## Impact

- 3 new tables, 1 new PackType choice
- Remove 3 fields from ThreatLibrary, 1 field from each instance threat model
- Update `import_pack` command
- Update all existing pack YAML files
- Frontend: threat detail views show taxonomy tags instead of a single STRIDE badge
- Frontend: taxonomy entries become filterable/searchable
