# LINDDUN Privacy Threat Modeling Packs

**Date:** 2026-03-15
**Status:** Proposed

---

## Problem

The platform currently models security threats using STRIDE. Privacy threats — how personal data can be misused, linked, or exposed — are not covered. Organizations subject to GDPR need to perform Data Protection Impact Assessments (DPIAs), which are essentially threat models scoped to personal data processing. Without privacy-specific threats and countermeasures, users must manually create these items every time.

LINDDUN is the privacy equivalent of STRIDE. It classifies privacy threats into 7 categories:

| Category | What it means |
|---|---|
| **L**inking | Combining data from multiple sources to learn more about a person |
| **I**dentifying | Connecting information to a specific individual |
| **N**on-repudiation | Inability to deny actions (problematic when anonymity is expected) |
| **D**etecting | Observing or tracking user behavior and activity |
| **D**ata Disclosure | Exposing personal data to unauthorized parties |
| **U**nawareness | Users not informed about what data is collected or how it's used |
| **N**on-compliance | Violating privacy regulations (GDPR, ePrivacy, etc.) |

---

## Approach

No code changes needed. The existing pack system supports everything required — this is purely content (YAML files).

### Pack 1: `linddun-taxonomy`

A taxonomy pack (like `stride-taxonomy`) that defines the 7 LINDDUN categories.

```
libraries/packs/linddun-taxonomy/
├── pack.yaml          # pack_type: taxonomy
└── taxonomy.yaml      # 7 entries: linking, identifying, non-repudiation, detecting,
                       #            data-disclosure, unawareness, non-compliance
```

### Pack 2: `linddun-privacy`

A threat pack containing privacy threats and countermeasures. References AWS-Mini components via cross-pack qualified slugs (`aws-mini/s3`, `aws-mini/lambda`, etc.) so threats auto-populate when those components are used.

```
libraries/packs/linddun-privacy/
├── pack.yaml                                # pack_type: threat, depends_on: [linddun-taxonomy, stride-taxonomy]
├── threats.yaml                             # ~10 privacy threats
├── countermeasures.yaml                     # ~10 privacy countermeasures
├── joins/
│   ├── components-threats.yaml              # Maps threats → aws-mini components
│   ├── threats-countermeasures.yaml          # Maps threats → countermeasures
│   ├── threats-linddun.yaml                 # Threat → LINDDUN taxonomy mappings
│   ├── threats-stride.yaml                  # Threat → STRIDE taxonomy mappings
│   └── countermeasures-gdpr.yaml            # Maps countermeasures → GDPR articles
```

### Threats (targeting AWS-Mini components)

**S3:**
- PII stored without pseudonymization or classification (Data Disclosure, Unawareness)
- Excessive data retention violating data minimization (Non-compliance)

**Lambda:**
- PII logged to CloudWatch without masking (Data Disclosure, Linking)
- Personal data processed beyond stated purpose (Non-compliance)

**API Gateway:**
- User tracking/profiling via request metadata and headers (Detecting, Linking)
- No consent verification at API boundary (Non-compliance)

**DynamoDB:**
- Re-identification from combined record fields (Identifying, Linking)
- No automated data deletion/retention mechanism (Non-compliance)

**Data Flows:**
- Personal data transmitted without minimization (Data Disclosure)
- Metadata leakage enabling user activity correlation (Linking, Detecting)

Each threat maps to both LINDDUN and STRIDE taxonomy entries via join files:
```yaml
# joins/threats-linddun.yaml
taxonomy: linddun

mappings:
  - threat: s3-pii-exposure
    entries: [data-disclosure, unawareness]
```

```yaml
# joins/threats-stride.yaml
taxonomy: stride

mappings:
  - threat: s3-pii-exposure
    entries: [information-disclosure]
```

### Countermeasures

- Data minimization policy enforcement
- Pseudonymization / anonymization at ingestion
- Automated PII detection and classification
- Consent verification middleware
- Purpose limitation enforcement
- Data retention and automated deletion policies
- PII masking in logs and monitoring
- Data subject access request (DSAR) mechanism
- Privacy-by-design review checklist
- Data processing agreement (DPA) verification

### GDPR Compliance Overlay

Maps countermeasures to the existing `gdpr-2018` framework articles:

| Article | Relevant countermeasures |
|---|---|
| Art. 5 (Processing principles) | Data minimization, purpose limitation, retention policies |
| Art. 25 (Privacy by design) | Pseudonymization, PII detection, privacy-by-design review |
| Art. 32 (Security of processing) | Covered by existing security countermeasures in aws-mini |
| Art. 33 (Breach notification to authority) | Already exists — no new mapping needed |
| Art. 34 (Breach notification to data subject) | Already exists — no new mapping needed |

If GDPR isn't installed when `linddun-privacy` is installed, the mappings are stored as `PendingFrameworkOverlay` and activate automatically when GDPR is later installed.

---

## Integration with AWS-Mini

The `components-threats.yaml` file uses cross-pack references:

```yaml
mappings:
  - component: aws-mini/s3
    threats:
      - threat: s3-pii-exposure
        applies_to: component
      - threat: excessive-data-retention
        applies_to: component
  - component: aws-mini/api-gateway
    threats:
      - threat: user-tracking-profiling
        applies_to: component
      - threat: missing-consent-verification
        applies_to: both
```

This works because `_resolve_component_reference` in the pack install service resolves `aws-mini/s3` to the existing `ComponentLibrary` record. No changes to aws-mini needed.

### What users see after installing both packs

1. Apply the "AWS Serverless" DFD template
2. Save → components sync
3. Open Threat Analysis → each component shows **both** security threats (from aws-mini) **and** privacy threats (from linddun-privacy)
4. Privacy threats display LINDDUN taxonomy badges (e.g., "Data Disclosure", "Linking") alongside STRIDE badges
5. Privacy countermeasures show GDPR compliance coverage (e.g., "Art. 5", "Art. 25")

### Install order

1. `stride-taxonomy` (likely already installed)
2. `linddun-taxonomy` (new)
3. `gdpr` framework pack (may already be installed)
4. `linddun-privacy` (new — depends on the above)

---

## Testing

1. **Install packs** — verify no errors in install dialog, all dependencies resolve
2. **Library pages** — verify LINDDUN threats and privacy countermeasures appear in the Libraries page with correct taxonomy badges
3. **DFD + Threat Analysis** — create a threat model, apply AWS Serverless template, save, open Threat Analysis. Verify privacy threats appear alongside security threats for each component.
4. **Compliance tab** — add GDPR as a framework on the threat model. Verify privacy countermeasures show GDPR article coverage.
5. **Uninstall** — uninstall `linddun-privacy`, verify privacy threats and countermeasures are removed cleanly without affecting aws-mini items.

---

## DPIA Angle

A DPIA is not a separate feature — it's a threat model with:
- Components that process personal data
- LINDDUN privacy threats identified and assessed
- Privacy countermeasures evaluated
- GDPR compliance mapped

With these packs installed, any threat model using AWS-Mini components automatically becomes DPIA-capable. The Reports tab already renders all of this. No new report type needed — the "Compliance Report" focused on GDPR serves as the DPIA output.
