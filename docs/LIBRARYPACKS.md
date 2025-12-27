# Library Packs Architecture

> **Last Updated:** December 27, 2025 (Zombie Record Fix - Partial Unique Constraints)

## Table of Contents

1. [Overview](#overview)
2. [Data Model](#data-model)
3. [Namespace & Qualified Slugs](#namespace--qualified-slugs)
4. [Customization Tracking](#customization-tracking)
5. [Dependency Version Constraints](#dependency-version-constraints)
6. [Soft Delete & Deletion Cascades](#soft-delete--deletion-cascades)
7. [Pack File Structure](#pack-file-structure)
8. [Pack YAML Schema](#pack-yaml-schema)
9. [DFD Templates](#dfd-templates)
10. [Import Process](#import-process)
11. [Multi-Tenant Query Logic](#multi-tenant-query-logic)
12. [Compliance Mapping](#compliance-mapping)
13. [Pack Catalog Examples](#pack-catalog-examples)
14. [Onboarding Flow](#onboarding-flow)
15. [Validation Rules](#validation-rules)
16. [Error Handling](#error-handling)

---

## Overview

Library Packs are modular, installable bundles of threat modeling content that organizations can install to populate their libraries. This architecture enables:

- **Community Contributions**: Open-source packs maintained via GitHub
- **Industry-Specific Content**: Banking, healthcare, fintech starter kits
- **Monetization**: Premium/enterprise packs with licensing
- **Multi-Tenant SaaS**: Different orgs see different libraries based on installed packs
- **Version Control**: Semantic versioning with dependency management

### Key Concepts

| Term               | Definition                                                                         |
| ------------------ | ---------------------------------------------------------------------------------- |
| **Pack**           | A bundle of components, threats, countermeasures, and/or DFD templates             |
| **Slug**           | Identifier within a pack (e.g., `aws-s3`, `sql-injection`)                         |
| **Qualified Slug** | Namespace-safe identifier: `{pack-slug}/{item-slug}` (e.g., `aws-technologies/s3`) |
| **Source Pack**    | FK on library items indicating which pack they came from                           |
| **Installation**   | Record of which packs an organization has installed                                |
| **Customization**  | Status tracking for forked items: `original`, `customized`, `detached`             |
| **Aliases**        | Previous slugs for backward compatibility after renames                            |

---

## Data Model

### LibraryPack

```
┌─────────────────────────────────────────────────────────────────┐
│                         LibraryPack                             │
├─────────────────────────────────────────────────────────────────┤
│ slug: "banking-technologies"        (unique identifier)         │
│ name: "Banking Technologies Pack"                               │
│ description: "Core banking system components..."                │
│ version: "1.2.0"                    (semantic versioning)       │
│ pack_type: technology|threat|countermeasure|compliance|         │
│            template|full                                        │
│ tier: free|premium|enterprise                                   │
│ source: official|partner|community|private                      │
│ author: "Precogly Team"                                         │
│ industries: ["banking", "fintech"]                              │
│ tags: ["payments", "swift", "core-banking"]                     │
│ repository_url: "github.com/precogly/packs/banking"             │
│ content: { ... }                    (JSON - see schema below)   │
│                                                                 │
│ # Dependencies via LibraryPackDependency model                  │
│ dependencies: [                                                 │
│   { pack: base-stride, version: "^1.0.0" }                      │
│ ]                                                               │
│ install_count: 42                                               │
│ is_published: true                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 OrganizationPackInstallation                    │
├─────────────────────────────────────────────────────────────────┤
│ organization: Acme Bank                                         │
│ pack: banking-technologies                                      │
│ installed_version: "1.2.0"                                      │
│ status: installed|pending_update|failed                         │
│ installed_by: admin@acmebank.com                                │
│ installed_at: 2025-01-15                                        │
│ license_key: "..."                  (for premium packs)         │
│ license_expires_at: 2026-01-15                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Library Models with source_pack FK

All library models have these common pack-related fields:

```python
class ComponentLibrary(TimestampedModel):
    # Organization scoping
    organization = FK(Organization, null=True)  # null = global/shared
    source_pack = FK(LibraryPack, null=True)    # null = custom item

    # Identifiers
    slug = SlugField(max_length=100)            # e.g., "s3"
    qualified_slug = CharField(db_index=True)   # e.g., "aws-technologies/s3"
    name = CharField(max_length=255)

    # Customization tracking
    customization_status = CharField(choices=['original', 'customized', 'detached'])
    base_item_qualified_slug = CharField(db_index=True)  # Original item if forked

    # Backward compatibility
    aliases = ArrayField(CharField())           # Previous slugs

    # Soft delete
    is_deleted = BooleanField(default=False)
    deleted_at = DateTimeField(null=True)

    # ... other fields

    class Meta:
        constraints = [
            # Partial unique constraint: only active records must be unique
            UniqueConstraint(
                fields=['qualified_slug'],
                condition=Q(is_deleted=False),
                name='unique_active_component_qualified_slug'
            )
        ]

# Same pattern applies to:
# - ThreatLibrary (unique_active_threat_qualified_slug)
# - CountermeasureLibrary (unique_active_countermeasure_qualified_slug)
# - DFDTemplatesLibrary (unique_active_dfdtemplate_qualified_slug)
```

---

## Namespace & Qualified Slugs

### The Problem: Namespace Collision

Without namespacing, two packs could define the same slug (e.g., both `aws-technologies` and `banking-core` could define a component with slug `api-gateway`). This causes non-deterministic behavior when resolving slugs.

### Solution: Qualified Slugs

Every library item has a `qualified_slug` that combines the pack slug and item slug:

```
qualified_slug = "{pack_slug}/{item_slug}"

Examples:
- aws-technologies/s3
- aws-technologies/api-gateway
- banking-core/api-gateway      # Different from above!
- global/custom-component       # For items without a pack
- org-42/custom-threat          # For org-specific items
```

### Auto-Generation Logic

```python
def save(self, *args, **kwargs):
    if not self.qualified_slug and self.slug:
        if self.source_pack:
            self.qualified_slug = f"{self.source_pack.slug}/{self.slug}"
        elif self.organization:
            self.qualified_slug = f"org-{self.organization.id}/{self.slug}"
        else:
            self.qualified_slug = f"global/{self.slug}"
    super().save(*args, **kwargs)
```

### Slug Resolution (Updated)

```python
def resolve_slug(slug: str, pack: LibraryPack, org: Organization, model_class):
    """
    Resolve a slug to a library item using qualified_slug.
    """
    # If slug contains '/', it's a qualified slug - use directly
    if '/' in slug:
        return model_class.objects.filter(
            qualified_slug=slug,
            is_deleted=False
        ).first()

    # Otherwise, try to build qualified slug from current pack
    qualified = f"{pack.slug}/{slug}"
    item = model_class.objects.filter(
        qualified_slug=qualified,
        is_deleted=False
    ).first()

    if not item:
        # Try aliases for backward compatibility
        item = model_class.objects.filter(
            aliases__contains=[slug],
            source_pack=pack,
            is_deleted=False
        ).first()

    return item
```

---

## Customization Tracking

### The Problem: Update vs Fork Dilemma

When an organization edits a pack-provided item, should pack updates overwrite their changes? This creates a conflict between:
- **Receiving upstream fixes** (good)
- **Preserving local customizations** (also good)

### Solution: Customization Status

Each library item tracks its customization state:

| Status        | Meaning                                      | Update Behavior                     |
| ------------- | -------------------------------------------- | ----------------------------------- |
| `original`    | Unchanged from pack                          | Safe to update automatically        |
| `customized`  | Org edited but wants upstream updates        | Flag for review, don't auto-update  |
| `detached`    | Org explicitly unlinked from pack            | Never update, treated as custom     |

### Workflow

```
Pack Installed
      │
      ▼
┌─────────────────┐
│    original     │◀───── Default state
└────────┬────────┘
         │ Org edits item
         ▼
┌─────────────────┐
│   customized    │◀───── base_item_qualified_slug tracks original
└────────┬────────┘
         │ User clicks "Detach from pack"
         ▼
┌─────────────────┐
│    detached     │◀───── No longer linked to pack
└─────────────────┘
```

### Fields

```python
customization_status = CharField(choices=[
    ('original', 'Original'),
    ('customized', 'Customized'),
    ('detached', 'Detached')
], default='original')

base_item_qualified_slug = CharField(blank=True)  # e.g., "aws-technologies/s3"
```

### Update Logic

```python
def update_pack_items(pack, org):
    for item in ComponentLibrary.objects.filter(source_pack=pack, organization=org):
        if item.customization_status == 'original':
            # Safe to update
            update_from_pack(item)
        elif item.customization_status == 'customized':
            # Flag for review
            create_update_notification(org, item, "Review required: upstream changes")
        # 'detached' items are skipped entirely
```

---

## Dependency Version Constraints

### The Problem: Breaking Changes

When Pack B depends on Pack A, updating Pack A might break Pack B if APIs change. Terraform and npm solve this with version constraints.

### Solution: SemVer Constraints

The `LibraryPackDependency` model supports semantic versioning:

```python
class LibraryPackDependency(TimestampedModel):
    pack = FK(LibraryPack)              # The dependent pack
    depends_on_pack = FK(LibraryPack)   # The dependency
    version_constraint = CharField()     # e.g., "^1.0.0"
    is_optional = BooleanField()         # Optional dependencies
```

### Supported Constraints

| Constraint      | Meaning                        | Example Match         |
| --------------- | ------------------------------ | --------------------- |
| `^1.0.0`        | Compatible with 1.x.x          | 1.0.0, 1.5.0, 1.99.0  |
| `~1.2.0`        | Compatible with 1.2.x          | 1.2.0, 1.2.5, 1.2.99  |
| `>=2.0.0`       | At least version 2.0.0         | 2.0.0, 3.0.0, etc.    |
| `>=1.0.0 <2.0.0`| Range constraint               | 1.0.0 to 1.99.99      |
| `1.5.0`         | Exact version                  | 1.5.0 only            |
| (empty)         | Any version (latest)           | Any                   |

### YAML Syntax

```yaml
pack:
  slug: banking-technologies
  depends_on:
    - pack: base-stride
      version: "^1.0.0"
    - pack: aws-technologies
      version: ">=2.0.0"
    - pack: ai-threats
      version: "~1.5.0"
      optional: true
```

### Installation Check

```python
def check_dependencies(pack, org):
    errors = []
    for dep in pack.dependencies.all():
        installation = OrganizationPackInstallation.objects.filter(
            organization=org,
            pack=dep.depends_on_pack
        ).first()

        if not installation:
            if not dep.is_optional:
                errors.append(f"Missing required dependency: {dep.depends_on_pack.slug}")
        elif not version_matches(installation.installed_version, dep.version_constraint):
            errors.append(
                f"Version mismatch: {dep.depends_on_pack.slug} "
                f"requires {dep.version_constraint}, got {installation.installed_version}"
            )
    return errors
```

---

## Soft Delete & Deletion Cascades

### The Problem: Deletion Cascades

When a pack is uninstalled, what happens to DFD nodes that reference pack components? Hard delete could break existing diagrams.

### Solution: Soft Delete with Partial Unique Constraints

Library items use soft delete to preserve historical data:

```python
is_deleted = BooleanField(default=False)
deleted_at = DateTimeField(null=True)
```

### The Zombie Record Trap (and how we avoid it)

**The Problem:** If `qualified_slug` has a simple `unique=True` constraint, and we soft-delete a record, we can't reinstall the same pack because the soft-deleted record still occupies the unique slug.

**The Solution:** PostgreSQL partial unique constraint that only enforces uniqueness on **active** records:

```python
class Meta:
    constraints = [
        models.UniqueConstraint(
            fields=['qualified_slug'],
            condition=models.Q(is_deleted=False),
            name='unique_active_component_qualified_slug'
        )
    ]
```

This allows:
- Multiple soft-deleted records with the same `qualified_slug`
- Only ONE active record per `qualified_slug`
- Reinstalling packs works correctly (soft-delete first, then update or create)

### Query Patterns

```python
# Active items only (default)
ComponentLibrary.objects.filter(is_deleted=False)

# Include soft-deleted for historical views
ComponentLibrary.objects.all()

# Custom manager for convenience
class ActiveManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

class ComponentLibrary(TimestampedModel):
    objects = ActiveManager()
    all_objects = models.Manager()  # Includes soft-deleted
```

### Uninstall Behavior

```
Pack Uninstall Requested
         │
         ▼
┌────────────────────────┐
│ Check for dependents   │──▶ Error if other packs depend on this
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ Check for usage        │──▶ Warning if items used in threat models
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ Soft delete all items  │
│ - Set is_deleted=True  │
│ - Set deleted_at=now() │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ Delete installation    │
│ record                 │
└────────────────────────┘
```

### DFD Preservation

DFD nodes that reference soft-deleted components:
- Still render (with visual indicator of "archived" state)
- Cannot be used in new threat models
- Can be replaced with active components via UI action

---

## Pack File Structure

Packs are stored as directories with the following structure:

```
banking-pack/
├── pack.yaml                    # Main pack file (required)
│   ├── metadata
│   ├── components (with nested threats/countermeasures)
│   ├── standalone threats
│   ├── standalone countermeasures
│   └── standards mappings
│
└── DFDTemplates/                # Separate directory for templates (optional)
    ├── banking-webapp-l1.yaml
    ├── banking-api-l2.yaml
    └── payment-flow.yaml
```

### Why This Structure?

1. **`pack.yaml`** contains all components, threats, countermeasures, and standards in a **single file** for data integrity
2. **`DFDTemplates/`** are separate files because:
   - `canvas_data` is verbose ReactFlow JSON
   - Templates can be large and complex
   - Each template references component slugs from `pack.yaml`

---

## Pack YAML Schema

### Complete Example: `pack.yaml`

```yaml
# =============================================================================
# PACK METADATA
# =============================================================================
pack:
  slug: banking-technologies
  name: "Banking Technologies Pack"
  description: "Core banking system components, threats, and controls"
  version: "1.0.0"
  author: "Precogly Team"
  pack_type: full # technology|threat|countermeasure|compliance|template|full
  tier: free # free|premium|enterprise
  source: official # official|partner|community|private
  industries:
    - banking
    - fintech
    - payments
  tags:
    - core-banking
    - swift
    - pci-dss
  repository_url: "https://github.com/precogly/packs/banking"
  documentation_url: "https://docs.precogly.dev/packs/banking"
  depends_on:
    - pack: base-stride
      version: "^1.0.0"      # SemVer constraint

# =============================================================================
# COMPONENTS (with nested threats and countermeasures)
# =============================================================================
# Components are the primary organizational unit. Each component has its own
# threats, and each threat has its own countermeasures. This hierarchical
# structure ensures data integrity and makes relationships explicit.

components:
  # ---------------------------------------------------------------------------
  # Core Banking System
  # ---------------------------------------------------------------------------
  - slug: core-banking-system
    name: "Core Banking System"
    category: process # process|datastore|external
    component_type: "Banking Platform"
    provider: internal

    threats:
      - slug: transaction-fraud
        name: "Transaction Fraud"
        description: "Unauthorized or manipulated financial transactions"
        stride_category: tampering
        severity: critical

        countermeasures:
          - slug: transaction-monitoring
            name: "Real-time Transaction Monitoring"
            description: "Monitor all transactions for anomalous patterns"
            control_type: technical
            cost: high

          - slug: fraud-detection-ml
            name: "ML-based Fraud Detection"
            description: "Machine learning models to detect fraud patterns"
            control_type: technical
            cost: high

      - slug: unauthorized-account-access
        name: "Unauthorized Account Access"
        description: "Attackers gaining access to customer accounts"
        stride_category: spoofing
        severity: high

        countermeasures:
          - slug: mfa
            name: "Multi-Factor Authentication"
            description: "Require multiple authentication factors"
            control_type: technical
            cost: medium

          - slug: session-management
            name: "Secure Session Management"
            description: "Proper session timeouts and token handling"
            control_type: technical
            cost: low

  # ---------------------------------------------------------------------------
  # SWIFT Gateway
  # ---------------------------------------------------------------------------
  - slug: swift-gateway
    name: "SWIFT Gateway"
    category: external
    component_type: "Payment Network"
    provider: SWIFT

    threats:
      - slug: swift-message-tampering
        name: "SWIFT Message Tampering"
        description: "Manipulation of SWIFT payment messages"
        stride_category: tampering
        severity: critical

        countermeasures:
          - slug: swift-csp
            name: "SWIFT CSP Compliance"
            description: "Implement SWIFT Customer Security Programme controls"
            control_type: technical
            cost: high

  # ---------------------------------------------------------------------------
  # Customer Database
  # ---------------------------------------------------------------------------
  - slug: customer-database
    name: "Customer Database"
    category: datastore
    component_type: "Database"
    provider: aws

    threats:
      - slug: customer-data-breach
        name: "Customer Data Breach"
        description: "Unauthorized access to customer PII"
        stride_category: information_disclosure
        severity: critical

        countermeasures:
          - slug: encryption-at-rest
            name: "Encryption at Rest"
            description: "AES-256 encryption for all stored data"
            control_type: technical
            cost: medium

          - slug: database-access-controls
            name: "Database Access Controls"
            description: "Role-based access and audit logging"
            control_type: technical
            cost: low

# =============================================================================
# STANDALONE THREATS (not component-specific)
# =============================================================================
# These threats can be applied to multiple components or are industry-wide.

threats:
  - slug: insider-threat
    name: "Insider Threat"
    description: "Malicious actions by authorized internal users"
    stride_category: elevation_of_privilege
    source: custom
    severity: high

  - slug: regulatory-non-compliance
    name: "Regulatory Non-Compliance"
    description: "Failure to meet banking regulatory requirements"
    stride_category: repudiation
    source: custom
    severity: high

# =============================================================================
# STANDALONE COUNTERMEASURES (reusable across threats)
# =============================================================================
# These countermeasures can be applied to multiple threats.

countermeasures:
  - slug: security-logging
    name: "Security Logging"
    description: "Comprehensive logging of security events"
    control_type: technical
    cost: low
    applicable_threats:
      - insider-threat
      - unauthorized-account-access

  - slug: employee-training
    name: "Security Awareness Training"
    description: "Regular security training for all employees"
    control_type: procedural
    cost: medium
    applicable_threats:
      - insider-threat

# =============================================================================
# COMPLIANCE STANDARDS MAPPING
# =============================================================================
# Maps countermeasures to compliance framework requirements.

standards:
  - countermeasure: transaction-monitoring
    requirement: pci-dss-10.1
    sufficiency: full

  - countermeasure: transaction-monitoring
    requirement: pci-dss-10.2
    sufficiency: partial

  - countermeasure: encryption-at-rest
    requirement: pci-dss-3.4
    sufficiency: full

  - countermeasure: mfa
    requirement: pci-dss-8.3
    sufficiency: full

  - countermeasure: security-logging
    requirement: pci-dss-10.2
    sufficiency: partial

  - countermeasure: security-logging
    requirement: soc2-cc6.1
    sufficiency: partial
```

### Field Reference

| Pack Field                       | Django Model Field                          | Required | Description                                               |
| -------------------------------- | ------------------------------------------- | -------- | --------------------------------------------------------- |
| `pack.slug`                      | `LibraryPack.slug`                          | Yes      | Unique pack identifier                                    |
| `pack.version`                   | `LibraryPack.version`                       | Yes      | Semantic version                                          |
| `pack.pack_type`                 | `LibraryPack.pack_type`                     | Yes      | technology/threat/countermeasure/compliance/template/full |
| `pack.tier`                      | `LibraryPack.tier`                          | No       | free (default)/premium/enterprise                         |
| `pack.source`                    | `LibraryPack.source`                        | No       | official/partner/community (default)/private              |
| `pack.depends_on[].pack`         | `LibraryPackDependency.depends_on_pack`     | No       | Dependency pack slug                                      |
| `pack.depends_on[].version`      | `LibraryPackDependency.version_constraint`  | No       | SemVer constraint (e.g., "^1.0.0")                        |
| `pack.depends_on[].optional`     | `LibraryPackDependency.is_optional`         | No       | Whether dependency is optional                            |
| `components[].slug`              | `ComponentLibrary.slug`                     | Yes      | Component identifier within pack                          |
| `components[].category`          | `ComponentLibrary.category`                 | Yes      | process/datastore/external                                |
| `threats[].slug`                 | `ThreatLibrary.slug`                        | Yes      | Threat identifier within pack                             |
| `threats[].stride_category`      | `ThreatLibrary.stride_category`             | Yes      | STRIDE category                                           |
| `countermeasures[].slug`         | `CountermeasureLibrary.slug`                | Yes      | Countermeasure identifier within pack                     |
| `countermeasures[].control_type` | `CountermeasureLibrary.control_type`        | Yes      | technical/procedural                                      |
| `standards[].requirement`        | `StandardRequirement.section_code`          | Yes      | Framework requirement code                                |
| `standards[].sufficiency`        | `CountermeasureLibraryStandard.sufficiency` | Yes      | full/partial                                              |

---

## DFD Templates

DFD Templates are stored in separate YAML files in the `DFDTemplates/` directory. Each template references component slugs from `pack.yaml`.

### Template File Structure

```yaml
# DFDTemplates/banking-webapp-l1.yaml

template:
  slug: banking-webapp-l1
  name: "Banking Web Application (Level 1)"
  description: "Standard banking web application architecture"
  category: webapp # webapp|microservices|iot|api|mobile
  diagram_type: level1 # context|level1|level2

# Node-to-component mappings
# Each node in the DFD references a component slug from pack.yaml
node_components:
  - node_id: "node-1"
    component_ref: customer-database # References slug from pack.yaml
    label: "Customer Database"

  - node_id: "node-2"
    component_ref: core-banking-system
    label: "Core Banking System"

  - node_id: "node-3"
    component_ref: swift-gateway
    label: "SWIFT Gateway"

  - node_id: "node-ext-1"
    component_ref: null # External entity, no component
    label: "Customer"
    is_external: true

# ReactFlow canvas data
canvas_data:
  nodes:
    - id: "node-1"
      type: "datastore"
      position: { x: 400, y: 300 }
      data:
        label: "Customer Database"

    - id: "node-2"
      type: "process"
      position: { x: 200, y: 200 }
      data:
        label: "Core Banking System"

    - id: "node-3"
      type: "external"
      position: { x: 400, y: 100 }
      data:
        label: "SWIFT Gateway"

    - id: "node-ext-1"
      type: "external"
      position: { x: 50, y: 200 }
      data:
        label: "Customer"

  edges:
    - id: "edge-1"
      source: "node-ext-1"
      target: "node-2"
      label: "HTTPS"
      data:
        protocol: "HTTPS"
        port: 443

    - id: "edge-2"
      source: "node-2"
      target: "node-1"
      label: "SQL/TLS"
      data:
        protocol: "PostgreSQL"
        port: 5432

    - id: "edge-3"
      source: "node-2"
      target: "node-3"
      label: "SWIFT"
      data:
        protocol: "SWIFT"
        port: 443
```

### Template Import Logic

When a user creates a DFD from a template:

1. Parse `node_components` section
2. For each `component_ref`, lookup `ComponentLibrary` by slug
3. Create DFD nodes linked to component instances
4. Threats and countermeasures automatically available via component relationships

---

## Import Process

### Two-Pass Import Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      PACK IMPORT FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. VALIDATION PHASE                                            │
│     ├─ Parse pack.yaml                                          │
│     ├─ Validate required fields                                 │
│     ├─ Check dependencies are installed                         │
│     ├─ Validate all slugs are unique within pack                │
│     └─ Validate cross-references exist (threat refs, etc.)      │
│                                                                 │
│  2. CREATION PHASE (Pass 1)                                     │
│     ├─ Create/update LibraryPack record                         │
│     ├─ Create ComponentLibrary records (with source_pack FK)    │
│     ├─ Create ThreatLibrary records (with source_pack FK)       │
│     ├─ Create CountermeasureLibrary records (with source_pack)  │
│     └─ Create DFDTemplatesLibrary records (with source_pack)    │
│                                                                 │
│  3. LINKING PHASE (Pass 2)                                      │
│     ├─ Create ComponentLibraryThreat records                    │
│     ├─ Link countermeasures to threats (applicable_threats M2M) │
│     └─ Create CountermeasureLibraryStandard records             │
│                                                                 │
│  4. FINALIZATION                                                │
│     ├─ Create OrganizationPackInstallation record               │
│     ├─ Increment pack install_count                             │
│     └─ Log installation audit trail                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Slug Resolution Logic

> **Note:** See [Namespace & Qualified Slugs](#namespace--qualified-slugs) for the updated resolution logic using `qualified_slug`.

```python
def resolve_slug(slug: str, pack: LibraryPack, org: Organization, model_class):
    """
    Resolve a slug to a library item using qualified_slug.
    Supports both qualified slugs (pack/item) and simple slugs.
    """
    # If qualified slug, resolve directly
    if '/' in slug:
        return model_class.objects.filter(
            qualified_slug=slug,
            is_deleted=False
        ).first()

    # Build qualified slug from current pack context
    qualified = f"{pack.slug}/{slug}"
    item = model_class.objects.filter(
        qualified_slug=qualified,
        is_deleted=False
    ).first()

    # Try aliases for backward compatibility
    if not item:
        item = model_class.objects.filter(
            aliases__contains=[slug],
            source_pack=pack,
            is_deleted=False
        ).first()

    return item
```

---

## Multi-Tenant Query Logic

### How Different Orgs See Different Libraries

```
Org A (Bank)                          Org B (Healthcare)
├── Installed Packs:                  ├── Installed Packs:
│   ├── base-stride                   │   ├── base-stride
│   ├── banking-technologies          │   ├── healthcare-technologies
│   └── pci-dss-controls              │   └── hipaa-controls
│                                     │
└── Sees:                             └── Sees:
    ├── STRIDE threats                    ├── STRIDE threats
    ├── Core Banking System               ├── EHR systems
    ├── SWIFT Gateway                     ├── Medical devices
    ├── PCI-DSS controls                  ├── HIPAA controls
    └── + Custom items                    └── + Custom items
```

### Query Implementation

```python
def get_components_for_org(org: Organization):
    """Get all active components visible to an organization."""
    installed_pack_ids = OrganizationPackInstallation.objects.filter(
        organization=org
    ).values_list('pack_id', flat=True)

    return ComponentLibrary.objects.filter(
        Q(organization=org) |                      # Org's custom items
        Q(source_pack_id__in=installed_pack_ids),  # From installed packs
        is_deleted=False                           # Exclude soft-deleted
    )

def get_threats_for_org(org: Organization):
    """Get all active threats visible to an organization."""
    installed_pack_ids = OrganizationPackInstallation.objects.filter(
        organization=org
    ).values_list('pack_id', flat=True)

    return ThreatLibrary.objects.filter(
        Q(organization=org) |
        Q(source_pack_id__in=installed_pack_ids),
        is_deleted=False                           # Exclude soft-deleted
    )
```

### Item Visibility Matrix

| organization | source_pack | Who Sees It                           |
| ------------ | ----------- | ------------------------------------- |
| null         | Pack A      | Orgs that installed Pack A            |
| Acme Bank    | null        | Only Acme Bank (custom item)          |
| Acme Bank    | Pack A      | Only Acme Bank (forked/modified copy) |

---

## Compliance Mapping

### Relationship Chain

```
Component
    └── has Threats
            └── have Countermeasures
                    └── map to StandardRequirements
                            └── belong to StandardFrameworks
```

### Compliance Query

To answer "Is my Core Banking System PCI-DSS compliant?":

```python
def get_compliance_status(component_slug: str, framework_slug: str):
    """
    Get compliance coverage for a component against a framework.
    """
    # Get all threats for this component
    component = ComponentLibrary.objects.get(slug=component_slug)
    threats = component.threats.all()

    # Get all countermeasures for those threats
    countermeasures = CountermeasureLibrary.objects.filter(
        applicable_threats__in=threats
    ).distinct()

    # Get framework requirements
    framework = StandardFramework.objects.get(name__icontains=framework_slug)
    requirements = framework.requirements.all()

    # Check coverage
    covered = []
    partial = []
    gaps = []

    for req in requirements:
        mappings = CountermeasureLibraryStandard.objects.filter(
            requirement=req,
            countermeasure_library__in=countermeasures
        )
        if mappings.filter(sufficiency='full').exists():
            covered.append(req)
        elif mappings.exists():
            partial.append(req)
        else:
            gaps.append(req)

    return {
        'covered': covered,
        'partial': partial,
        'gaps': gaps,
        'coverage_percentage': len(covered) / len(requirements) * 100
    }
```

---

## Pack Catalog Examples

| Pack                 | Type       | Tier    | Description                        |
| -------------------- | ---------- | ------- | ---------------------------------- |
| Base STRIDE          | Threat     | Free    | Core STRIDE threat categories      |
| OWASP Top 10         | Threat     | Free    | Web application threats            |
| CAPEC Injection      | Threat     | Free    | CAPEC injection attack patterns    |
| AWS Technologies     | Technology | Free    | AWS services catalog               |
| Azure Technologies   | Technology | Free    | Azure services catalog             |
| Banking Technologies | Full       | Free    | Banking-specific systems + threats |
| PCI-DSS Controls     | Compliance | Free    | PCI-DSS requirements & controls    |
| DORA Controls        | Compliance | Free    | EU DORA requirements               |
| SOC 2 Controls       | Compliance | Free    | SOC 2 trust criteria               |
| Agentic AI Threats   | Threat     | Premium | LLM/Agent-specific threats         |
| Healthcare HIPAA     | Full       | Premium | Full healthcare stack              |
| SWIFT Integration    | Template   | Premium | SWIFT connectivity templates       |

---

## Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Welcome to Precogly!                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Tell us about your organization                        │
│  Industry: [ Banking               ▼ ]                          │
│                                                                 │
│  Step 2: Select starter packs (recommended for Banking)         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✅ Base Infrastructure (AWS, Azure, GCP)           [Free]   ││
│  │ ✅ Banking Technologies                            [Free]   ││
│  │ ✅ Base STRIDE Threats                             [Free]   ││
│  │ ✅ PCI-DSS Compliance Pack                         [Free]   ││
│  │ ☐  Agentic AI Threats                      [Premium $99/mo] ││
│  │ ☐  SWIFT Integration Templates             [Premium $49/mo] ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│                    [ Install Selected Packs ]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

### Pack Validation

| Rule             | Description                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| `pack.slug`      | Required, unique, lowercase with hyphens only                               |
| `pack.version`   | Required, semantic version format (X.Y.Z)                                   |
| `pack.pack_type` | Required, one of: technology/threat/countermeasure/compliance/template/full |
| `depends_on`     | Each dependency must be a valid, published pack slug                        |

### Slug Validation

| Rule            | Description                                                      |
| --------------- | ---------------------------------------------------------------- |
| Format          | Lowercase, alphanumeric with hyphens: `^[a-z0-9]+(-[a-z0-9]+)*$` |
| Length          | 3-100 characters                                                 |
| Uniqueness      | Unique within a pack (can duplicate across packs)                |
| Qualified Slug  | Must be unique globally (enforced by DB constraint)              |
| Reserved        | Cannot use: `custom`, `legacy`, `null`, `undefined`              |

### Reference Validation

| Rule                      | Description                                      |
| ------------------------- | ------------------------------------------------ |
| Threat refs               | Must exist in this pack or declared dependencies |
| Countermeasure refs       | Must exist in this pack or declared dependencies |
| Standard requirement refs | Must exist in installed compliance packs         |
| Template component refs   | Must exist in this pack or declared dependencies |

---

## Error Handling

### Import Errors

| Error                    | Cause                                | Resolution                            |
| ------------------------ | ------------------------------------ | ------------------------------------- |
| `DependencyNotInstalled` | Pack depends on uninstalled pack     | Install dependency first              |
| `DuplicateSlug`          | Slug already exists in org's library | Rename slug or skip item              |
| `InvalidReference`       | Referenced slug doesn't exist        | Fix reference or install missing pack |
| `SchemaValidationError`  | YAML doesn't match expected schema   | Fix YAML structure                    |
| `VersionConflict`        | Pack version already installed       | Use --force to reinstall              |

### Error Response Format

```json
{
  "success": false,
  "error": "DependencyNotInstalled",
  "message": "Pack 'banking-technologies' requires 'base-stride' to be installed first",
  "details": {
    "pack": "banking-technologies",
    "missing_dependency": "base-stride"
  },
  "resolution": "Install the 'base-stride' pack before installing 'banking-technologies'"
}
```

### Pack Uninstall Behavior

> **Note:** See [Soft Delete & Deletion Cascades](#soft-delete--deletion-cascades) for detailed uninstall behavior.

When a pack is uninstalled:

1. Check for dependent packs (prevent uninstall if others depend on it)
2. Check for references in org's threat models (warn user)
3. **Soft delete** all library items with `source_pack = this_pack`:
   - Set `is_deleted = True`
   - Set `deleted_at = now()`
4. Delete `OrganizationPackInstallation` record
5. Decrement pack's `install_count`

Soft-deleted items:
- Are excluded from normal queries
- Preserve DFD references (displayed as "archived")
- Can be restored if pack is reinstalled

---

## Workflow: GitHub to Production

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   GitHub     │     │   Precogly   │     │    Org's     │
│  Pack Repo   │────▶│   Registry   │────▶│   Instance   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │ Community          │ Sync/Index         │ Install
       │ PRs & Reviews      │ Packs              │ Pack
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   packs/     │     │ Browse Packs │     │  Org Library │
│ ├─ banking/  │     │ by Industry  │     │  (imported   │
│ ├─ healthcare│     │   & Type     │     │   items)     │
│ └─ ai-agents/│     └──────────────┘     └──────────────┘
└──────────────┘
```

---

## Next Steps

1. **Implement Pack Import Service** - Parse YAML, create records
2. **Build Pack Registry API** - List, search, install packs
3. **Create Onboarding UI** - Industry selection, pack browser
4. **Seed Official Packs** - Base STRIDE, OWASP, AWS, PCI-DSS
5. **Build Pack Authoring Tool** - Validate and publish packs
