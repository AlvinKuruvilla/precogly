# Precogly – Packs Redesign

## 1. Goal

Enable design-time threat modeling that links countermeasures to security requirements from various standards via a system of community-created packs that can be imported into an org:

- AWS / Azure / others
- Regulated (PCI-DSS, DORA, CRA) and non-regulated orgs
- Clean traceability without forcing any framework

## 2. Core Design Principles

**Normalize the domain**

- Components, threats, countermeasures, frameworks are separate primitives.
- Many-to-many via join files
- No inline framework references.

**Provider-scoped packs**

- AWS orgs never import Azure/GCP data.

**Frameworks are optional overlays**

- Threat modeling must work without ASVS or PCI-DSS.

## 3. Pack Structure (AWS example)

```
aws/
├── components.yaml
├── threats.yaml
├── countermeasures.yaml
├── joins/
│   ├── components-threats.yaml
│   ├── threats-countermeasures.yaml
│   ├── countermeasures-asvs.yaml      # optional
│   └── countermeasures-pci-dss.yaml   # optional
└── templates/
    ├── serverless-api.yaml
    └── three-tier-webapp.yaml
```

## 4. Base Files (Facts)

### components.yaml

```yaml
components:
  - id: aws_rds_postgres
    name: Amazon RDS for PostgreSQL
    type: database
```

### threats.yaml

```yaml
threats:
  - id: data_exfiltration
    name: Data exfiltration from datastore

  - id: insecure_transport
    name: Insecure transport to datastore
```

### countermeasures.yaml

```yaml
countermeasures:
  - id: encrypt_data_at_rest
    name: Encrypt sensitive data at rest

  - id: enforce_tls
    name: Enforce TLS for client connectivity
```

## 5. Join Files (Reasoning)

### joins/components-threats.yaml

```yaml
mappings:
  - component: aws_rds_postgres
    threats:
      - data_exfiltration
      - insecure_transport
```

### joins/threats-countermeasures.yaml

```yaml
mappings:
  - threat: data_exfiltration
    countermeasures:
      - encrypt_data_at_rest

  - threat: insecure_transport
    countermeasures:
      - enforce_tls
```

## 6. Framework Overlays (Optional)

### joins/countermeasures-asvs.yaml

_(Default for non-regulated orgs)_

```yaml
framework: asvs_4_0_3

mappings:
  - countermeasure: encrypt_data_at_rest
    requirements: [V6.1.1]

  - countermeasure: enforce_tls
    requirements: [V9.1.1]
```

### joins/countermeasures-pci-dss.yaml

_(Regulated orgs)_

```yaml
framework: pci_dss_4_0_1

mappings:
  - countermeasure: encrypt_data_at_rest
    requirements: ["3.5.1"]

  - countermeasure: enforce_tls
    requirements: ["4.2.1"]
```

## 7. DFD Templates

Templates are pre-built diagram starting points that reference components from the same pack.

### templates/serverless-api.yaml

```yaml
template:
  id: serverless_api
  name: AWS Serverless API
  description: REST API with Lambda, API Gateway, and DynamoDB
  category: api
  diagram_type: level1

canvas_data:
  nodes:
    - id: client
      type: actor
      position: { x: 50, y: 200 }
      data:
        label: Client Application
        actor_type: external

    - id: api_gateway
      type: process
      position: { x: 200, y: 200 }
      data:
        label: API Gateway
        component_ref: aws_api_gateway # References components.yaml

    - id: lambda
      type: process
      position: { x: 400, y: 200 }
      data:
        label: Lambda Function
        component_ref: aws_lambda # References components.yaml

    - id: dynamodb
      type: datastore
      position: { x: 600, y: 200 }
      data:
        label: DynamoDB
        component_ref: aws_dynamodb # References components.yaml

  edges:
    - id: edge_1
      source: client
      target: api_gateway
      data:
        label: HTTPS Request
        protocol: HTTPS

    - id: edge_2
      source: api_gateway
      target: lambda
      data:
        label: Invoke

    - id: edge_3
      source: lambda
      target: dynamodb
      data:
        label: Query/Write
```

### Key properties

- **Provider-scoped** — Templates live with their provider pack (AWS templates in `aws/templates/`)
- **Component references** — Nodes use `component_ref` to link to `components.yaml` entries
- **Validation** — Import can verify that referenced components exist
- **Org customization** — Orgs mix packs and create their own templates; users can also add custom components directly on the canvas

### Generic templates

Provider-agnostic architectural patterns (3-tier web app, microservices) belong in `generic/templates/`. These use abstract components like `database`, `api_server`, `load_balancer` that orgs can swap for provider-specific components.

```
generic/
├── components.yaml          # Abstract: database, api_server, etc.
├── threats.yaml
├── countermeasures.yaml
├── joins/
└── templates/
    ├── three-tier-webapp.yaml
    └── microservices.yaml
```

## 8. Import Scenarios (Behavior)

### AWS + PCI-DSS org

**Imports:**

- `generic/`
- `aws/`
- `aws/joins/countermeasures-pci-dss.yaml`

**Result:**

- Requirements column shows PCI-DSS only
- ASVS never appears

### AWS + no regulation

**Imports:**

- `generic/`
- `aws/`
- `aws/joins/countermeasures-asvs.yaml`

**Result:**

- ASVS used as default technical grounding

## 9. Non-Goals

- No global mega-threat library
- No mandatory framework
- No inline framework IDs in base YAML

## 10. Key Invariant (Do Not Break)

> **Threat → Countermeasure modeling must work even if ZERO frameworks are installed.**

## 11. Outcome

This design gives Precogly:

- Clean authoring
- Enterprise-grade traceability
- Compliance flexibility
- Zero framework lock-in

This is a sound, defensible architecture.

---

## FAQ

### What if an org has to comply with two separate frameworks (ex: PCI-DSS and DORA)?

This works cleanly by design. Nothing special is required.

**Scenario:** Org must comply with PCI DSS and DORA.

**Imports:**

- `aws/`
- `aws/joins/countermeasures-pci-dss.yaml`
- `aws/joins/countermeasures-dora.yaml`

**What Precogly does:**

- Threat → Countermeasure stays the same
- Each countermeasure now has multiple requirement mappings
- The traceability matrix has two columns: PCI-DSS and DORA

**Example (conceptual):**

```
Encrypt data at rest
  → PCI-DSS 3.5.1
  → DORA Art. 9 (ICT risk protection)
```

**Key properties:**

- No duplication of threats or countermeasures
- Frameworks are additive
- Auditors see both mappings
- Engineers still reason in countermeasures

**Invariant (important):**

> One countermeasure can satisfy many frameworks simultaneously.
> That's exactly why frameworks must be overlays, not embedded.

---

### Will it support industry-specific packs like 'Banking', 'Healthcare' etc.? How will those packs look?

Yes — and they fit naturally into the same model.

**Industry packs are horizontal overlays, not replacements for cloud packs.**

#### How industry packs work

- They do not redefine tech.
- They add industry-specific threats, countermeasures, and framework mappings.

#### Example structure

```
banking/
├── threats.yaml
├── countermeasures.yaml
├── joins/
│   ├── threats-countermeasures.yaml
│   ├── countermeasures-pci-dss.yaml
│   └── countermeasures-dora.yaml
└── templates/
    ├── card-payment-processing.yaml
    ├── mobile-banking.yaml
    └── open-banking-api.yaml
```

#### What's inside (example: Banking)

**threats.yaml**

```yaml
threats:
  - id: transaction_fraud
    name: Unauthorized or fraudulent financial transactions
```

**countermeasures.yaml**

```yaml
countermeasures:
  - id: transaction_anomaly_detection
    name: Detect anomalous transactions
```

**joins/threats-countermeasures.yaml**

```yaml
mappings:
  - threat: transaction_fraud
    countermeasures: [transaction_anomaly_detection]
```

**joins/countermeasures-pci-dss.yaml**

```yaml
framework: pci_dss_4_0_1
mappings:
  - countermeasure: transaction_anomaly_detection
    requirements: ["10.4.1"]
```

**templates/card-payment-processing.yaml**

```yaml
template:
  id: card_payment_processing
  name: Card Payment Processing
  description: PCI-DSS compliant card payment flow
  category: api
  diagram_type: level1

canvas_data:
  nodes:
    - id: merchant_app
      type: actor
      data:
        label: Merchant Application
        actor_type: external

    - id: payment_gateway
      type: process
      data:
        label: Payment Gateway
        component_ref: generic/payment_gateway # Can reference generic pack

    - id: card_vault
      type: datastore
      data:
        label: Card Data Vault
        component_ref: banking/card_vault # Or same-pack component

  edges:
    - id: edge_1
      source: merchant_app
      target: payment_gateway
      data:
        label: Payment Request
        protocol: HTTPS
        encrypted: true
```

#### How orgs use this

**A bank on AWS imports:**

- `generic/`
- `aws/`
- `banking/`
- compliance joins (PCI-DSS, DORA)

**A tech startup imports:**

- `generic/`
- `aws/`
- no industry pack

#### Key rule

| Pack Type        | Purpose                            |
| ---------------- | ---------------------------------- |
| Cloud packs      | How it's built                     |
| Industry packs   | What can go wrong in that business |
| Compliance packs | Who you must answer to             |

This keeps Precogly modular, scalable, and realistic.

# TECHNICAL IMPLEMENTATION (FOR AI CODING AGENTS)

This section provides implementation details for AI coding agents. Breaking changes are acceptable as there is no production data yet.

## Overview of Changes

| Area | Current | Target |
|------|---------|--------|
| Pack format | Single `pack.yaml` | Multiple files (`components.yaml`, `threats.yaml`, etc.) |
| Relationships | Nested YAML or M2M fields | Explicit `joins/*.yaml` files |
| Framework mapping | Separate compliance packs | Optional overlay join files |
| Templates | `DFDTemplates/*.yaml` with free-text `technology` | `templates/*.yaml` with `component_ref` |

## Backend Changes

### 1. Pack Discovery (`backend/apps/packs/services.py`)

**Current behavior:**
- Scans for `pack.yaml` files in `libraries/packs/{category}/{pack-name}/`

**Target behavior:**
- Scan for pack directories containing `components.yaml` OR `threats.yaml` OR `countermeasures.yaml`
- A valid pack is a directory with at least one base file
- Pack metadata moves to `pack.yaml` (minimal: slug, name, version, description, pack_type)

```python
# New pack detection logic
def discover_packs(base_path: Path) -> list[PackInfo]:
    packs = []
    for pack_dir in base_path.iterdir():
        if not pack_dir.is_dir():
            continue

        # Check for any base file
        has_components = (pack_dir / "components.yaml").exists()
        has_threats = (pack_dir / "threats.yaml").exists()
        has_countermeasures = (pack_dir / "countermeasures.yaml").exists()
        has_metadata = (pack_dir / "pack.yaml").exists()

        if has_metadata and (has_components or has_threats or has_countermeasures):
            packs.append(PackInfo(path=pack_dir))

    return packs
```

### 2. Import Command (`backend/apps/packs/management/commands/import_pack.py`)

**Current phases:**
1. Validate pack.yaml
2. Create/update LibraryPack
3. Process dependencies
4. Create components (with nested threats/countermeasures)
5. Create standalone threats/countermeasures
6. Create frameworks
7. Load DFD templates

**Target phases:**
1. Validate pack structure (all files exist, YAML is valid)
2. Create/update LibraryPack from `pack.yaml`
3. Process dependencies
4. **Load base files** — `components.yaml`, `threats.yaml`, `countermeasures.yaml`
5. **Load join files** — `joins/*.yaml` (create relationships)
6. **Load framework overlays** — `joins/countermeasures-{framework}.yaml`
7. Load templates from `templates/*.yaml`

```python
def _import_pack_v2(self, pack_path: Path, organization, force: bool):
    """New import logic for multi-file pack structure."""

    # Phase 1: Validate
    self._validate_pack_structure(pack_path)

    # Phase 2: Create LibraryPack
    pack_metadata = self._load_yaml(pack_path / "pack.yaml")
    library_pack = self._create_or_update_pack(pack_metadata, force)

    # Phase 3: Dependencies
    self._process_dependencies(library_pack, pack_metadata)

    # Phase 4: Base files (order matters: components first, then threats, then countermeasures)
    self._load_components(library_pack, pack_path / "components.yaml")
    self._load_threats(library_pack, pack_path / "threats.yaml")
    self._load_countermeasures(library_pack, pack_path / "countermeasures.yaml")

    # Phase 5: Join files
    joins_dir = pack_path / "joins"
    if joins_dir.exists():
        self._load_component_threat_joins(library_pack, joins_dir / "components-threats.yaml")
        self._load_threat_countermeasure_joins(library_pack, joins_dir / "threats-countermeasures.yaml")

        # Phase 6: Framework overlays
        for join_file in joins_dir.glob("countermeasures-*.yaml"):
            if join_file.name not in ["countermeasures-threats.yaml"]:  # Skip non-framework files
                self._load_framework_overlay(library_pack, join_file)

    # Phase 7: Templates
    self._load_templates_v2(library_pack, pack_path / "templates")

    return library_pack
```

### 3. New Import Methods

#### Loading base files

```python
def _load_components(self, library_pack: LibraryPack, file_path: Path):
    """Load components from components.yaml."""
    if not file_path.exists():
        return

    data = self._load_yaml(file_path)
    for comp in data.get("components", []):
        ComponentLibrary.objects.update_or_create(
            qualified_slug=f"{library_pack.slug}/{comp['id']}",
            defaults={
                "source_pack": library_pack,
                "slug": comp["id"],
                "name": comp["name"],
                "category": comp.get("category", "process"),
                "component_type": comp.get("type"),
                "description": comp.get("description", ""),
                "provider": self._infer_provider(library_pack.slug),
                "customization_status": "original",
                "is_deleted": False,
            }
        )

def _load_threats(self, library_pack: LibraryPack, file_path: Path):
    """Load threats from threats.yaml."""
    if not file_path.exists():
        return

    data = self._load_yaml(file_path)
    for threat in data.get("threats", []):
        ThreatLibrary.objects.update_or_create(
            qualified_slug=f"{library_pack.slug}/{threat['id']}",
            defaults={
                "source_pack": library_pack,
                "slug": threat["id"],
                "name": threat["name"],
                "description": threat.get("description", ""),
                "stride_category": threat.get("stride_category"),
                "customization_status": "original",
                "is_deleted": False,
            }
        )

def _load_countermeasures(self, library_pack: LibraryPack, file_path: Path):
    """Load countermeasures from countermeasures.yaml."""
    if not file_path.exists():
        return

    data = self._load_yaml(file_path)
    for cm in data.get("countermeasures", []):
        CountermeasureLibrary.objects.update_or_create(
            qualified_slug=f"{library_pack.slug}/{cm['id']}",
            defaults={
                "source_pack": library_pack,
                "slug": cm["id"],
                "name": cm["name"],
                "description": cm.get("description", ""),
                "control_type": cm.get("control_type", "technical"),
                "cost": cm.get("cost", "medium"),
                "customization_status": "original",
                "is_deleted": False,
            }
        )
```

#### Loading join files

```python
def _load_component_threat_joins(self, library_pack: LibraryPack, file_path: Path):
    """Load component-threat mappings from joins/components-threats.yaml."""
    if not file_path.exists():
        return

    data = self._load_yaml(file_path)
    for mapping in data.get("mappings", []):
        component_slug = mapping["component"]
        component = self._resolve_component(library_pack, component_slug)

        for threat_id in mapping.get("threats", []):
            threat = self._resolve_threat(library_pack, threat_id)
            ComponentLibraryThreat.objects.update_or_create(
                component_library=component,
                threat_library=threat,
                defaults={
                    "default_severity": mapping.get("severity", "medium"),
                    "applies_to": mapping.get("applies_to", "component"),
                }
            )

def _load_threat_countermeasure_joins(self, library_pack: LibraryPack, file_path: Path):
    """Load threat-countermeasure mappings from joins/threats-countermeasures.yaml."""
    if not file_path.exists():
        return

    data = self._load_yaml(file_path)
    for mapping in data.get("mappings", []):
        threat_slug = mapping["threat"]
        threat = self._resolve_threat(library_pack, threat_slug)

        for cm_id in mapping.get("countermeasures", []):
            countermeasure = self._resolve_countermeasure(library_pack, cm_id)
            countermeasure.applicable_threats.add(threat)

def _load_framework_overlay(self, library_pack: LibraryPack, file_path: Path):
    """Load framework overlay from joins/countermeasures-{framework}.yaml."""
    data = self._load_yaml(file_path)
    framework_id = data.get("framework")

    # Get or create the framework (may come from a separate compliance pack)
    framework = StandardFramework.objects.filter(slug=framework_id).first()
    if not framework:
        self.stderr.write(f"Warning: Framework {framework_id} not found, skipping overlay")
        return

    for mapping in data.get("mappings", []):
        cm_slug = mapping["countermeasure"]
        countermeasure = self._resolve_countermeasure(library_pack, cm_slug)

        for req_code in mapping.get("requirements", []):
            requirement = StandardRequirement.objects.filter(
                framework=framework,
                section_code=req_code
            ).first()

            if requirement:
                CountermeasureLibraryStandard.objects.update_or_create(
                    countermeasure_library=countermeasure,
                    requirement=requirement,
                    defaults={"sufficiency": mapping.get("sufficiency", "full")}
                )
```

#### Resolving cross-pack references

```python
def _resolve_component(self, current_pack: LibraryPack, ref: str) -> ComponentLibrary:
    """
    Resolve component reference. Supports:
    - 'aws_lambda' → looks in current pack
    - 'generic/database' → looks in generic pack
    """
    if "/" in ref:
        pack_slug, item_slug = ref.split("/", 1)
        qualified_slug = f"{pack_slug}/{item_slug}"
    else:
        qualified_slug = f"{current_pack.slug}/{ref}"

    component = ComponentLibrary.objects.filter(
        qualified_slug=qualified_slug,
        is_deleted=False
    ).first()

    if not component:
        raise ValidationError(f"Component not found: {ref}")

    return component

# Similar methods for _resolve_threat() and _resolve_countermeasure()
```

#### Loading templates with component_ref validation

```python
def _load_templates_v2(self, library_pack: LibraryPack, templates_dir: Path):
    """Load templates from templates/ directory with component_ref validation."""
    if not templates_dir.exists():
        return

    for template_file in templates_dir.glob("*.yaml"):
        data = self._load_yaml(template_file)
        template = data.get("template", {})
        canvas_data = data.get("canvas_data", {})

        # Validate component_refs
        self._validate_template_refs(library_pack, canvas_data)

        slug = template.get("id", template_file.stem)
        DFDTemplatesLibrary.objects.update_or_create(
            qualified_slug=f"{library_pack.slug}/{slug}",
            defaults={
                "source_pack": library_pack,
                "slug": slug,
                "name": template.get("name", slug),
                "description": template.get("description", ""),
                "category": template.get("category", "webapp"),
                "diagram_type": template.get("diagram_type", "level1"),
                "canvas_data": canvas_data,
                "customization_status": "original",
                "is_deleted": False,
            }
        )

def _validate_template_refs(self, library_pack: LibraryPack, canvas_data: dict):
    """Validate that all component_refs in template nodes exist."""
    nodes = canvas_data.get("nodes", [])
    errors = []

    for node in nodes:
        component_ref = node.get("data", {}).get("component_ref")
        if component_ref:
            try:
                self._resolve_component(library_pack, component_ref)
            except ValidationError:
                errors.append(f"Node '{node.get('id')}' references unknown component: {component_ref}")

    if errors:
        raise ValidationError(f"Template validation failed:\n" + "\n".join(errors))
```

### 4. Model Changes

**No schema changes required.** The existing models support the new structure:

| Model | Usage |
|-------|-------|
| `LibraryPack` | Stores pack metadata from `pack.yaml` |
| `ComponentLibrary` | Populated from `components.yaml` |
| `ThreatLibrary` | Populated from `threats.yaml` |
| `CountermeasureLibrary` | Populated from `countermeasures.yaml` |
| `ComponentLibraryThreat` | Populated from `joins/components-threats.yaml` |
| `CountermeasureLibrary.applicable_threats` | Populated from `joins/threats-countermeasures.yaml` |
| `CountermeasureLibraryStandard` | Populated from `joins/countermeasures-{framework}.yaml` |
| `DFDTemplatesLibrary` | Populated from `templates/*.yaml` |

**Optional additions:**

```python
# Add to LibraryPack model to track pack format version
class LibraryPack(TimestampedModel):
    # ... existing fields ...

    pack_format_version = models.CharField(
        max_length=10,
        default="2.0",  # New multi-file format
        help_text="1.0 = single pack.yaml, 2.0 = multi-file"
    )
```

### 5. API Changes

**New endpoint for selective framework overlay import:**

```python
# backend/apps/packs/views.py

class LibraryPackViewSet(viewsets.ModelViewSet):
    # ... existing methods ...

    @action(detail=True, methods=["post"])
    def install_with_overlays(self, request, pk=None):
        """
        Install pack with selected framework overlays.

        POST /packs/{id}/install_with_overlays/
        {
            "framework_overlays": ["pci-dss", "dora"]  // optional
        }
        """
        pack = self.get_object()
        organization = request.user.get_current_organization()
        overlays = request.data.get("framework_overlays", [])

        # Install base pack
        installation = install_pack_for_org(pack, organization)

        # Apply selected overlays
        for overlay in overlays:
            apply_framework_overlay(pack, organization, overlay)

        return Response({"status": "installed", "overlays_applied": overlays})
```

---

## Frontend Changes

### 1. Pack Preview (`frontend/src/api/packs.ts`)

**Current:** Fetches single `pack.yaml` content

**Target:** Aggregate multiple files for preview

```typescript
// frontend/src/types/packs.ts

export interface PackPreview {
  metadata: PackMetadata
  components: Component[]
  threats: Threat[]
  countermeasures: Countermeasure[]
  joins: {
    componentThreats: ComponentThreatMapping[]
    threatCountermeasures: ThreatCountermeasureMapping[]
  }
  frameworkOverlays: FrameworkOverlay[]  // Available overlays
  templates: TemplatePreview[]
}

export interface FrameworkOverlay {
  framework: string      // e.g., "pci_dss_4_0_1"
  fileName: string       // e.g., "countermeasures-pci-dss.yaml"
  mappingCount: number   // Number of countermeasure mappings
}
```

### 2. Pack Installation UI (`frontend/src/features/packs/`)

**Add framework overlay selection during install:**

```typescript
// frontend/src/features/packs/components/InstallPackDialog.tsx

export function InstallPackDialog({ pack, onInstall }: Props) {
  const [selectedOverlays, setSelectedOverlays] = useState<string[]>([])
  const { data: preview } = usePackPreview(pack.id)

  const handleInstall = () => {
    onInstall({
      packId: pack.id,
      frameworkOverlays: selectedOverlays,
    })
  }

  return (
    <Dialog>
      <DialogTitle>Install {pack.name}</DialogTitle>
      <DialogContent>
        <Typography>This pack includes:</Typography>
        <List>
          <ListItem>{preview?.components.length} components</ListItem>
          <ListItem>{preview?.threats.length} threats</ListItem>
          <ListItem>{preview?.countermeasures.length} countermeasures</ListItem>
          <ListItem>{preview?.templates.length} templates</ListItem>
        </List>

        {preview?.frameworkOverlays.length > 0 && (
          <>
            <Typography>Select compliance framework mappings:</Typography>
            <FormGroup>
              {preview.frameworkOverlays.map((overlay) => (
                <FormControlLabel
                  key={overlay.framework}
                  control={
                    <Checkbox
                      checked={selectedOverlays.includes(overlay.framework)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverlays([...selectedOverlays, overlay.framework])
                        } else {
                          setSelectedOverlays(selectedOverlays.filter(o => o !== overlay.framework))
                        }
                      }}
                    />
                  }
                  label={`${overlay.framework} (${overlay.mappingCount} mappings)`}
                />
              ))}
            </FormGroup>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleInstall}>Install</Button>
      </DialogActions>
    </Dialog>
  )
}
```

### 3. Template Browser (`frontend/src/features/dfd-editor/components/TemplateBrowser.tsx`)

**Update to handle component_ref:**

```typescript
// When inserting template, resolve component_refs to actual component data

const handleInsert = (template: DFDTemplate) => {
  const canvasData = template.canvasData as CanvasData

  // Resolve component_refs to full component data
  const resolvedNodes = canvasData.nodes.map((node) => {
    const componentRef = node.data?.component_ref
    if (componentRef) {
      const component = resolveComponentRef(componentRef)
      return {
        ...node,
        data: {
          ...node.data,
          // Merge component library data
          technology: component?.name,
          componentType: component?.componentType,
          componentLibraryId: component?.id,
        },
      }
    }
    return node
  })

  onInsert(resolvedNodes, canvasData.edges)
}

// Helper to resolve component reference
function resolveComponentRef(ref: string): ComponentLibrary | undefined {
  // ref could be "aws_lambda" (same pack) or "generic/database" (cross-pack)
  const { data: components } = useComponentLibrary()

  if (ref.includes("/")) {
    return components?.find((c) => c.qualifiedSlug === ref)
  } else {
    // Match by slug suffix
    return components?.find((c) => c.slug === ref)
  }
}
```

### 4. DFD Editor Component Library Panel

**No changes required** — components are already loaded from `ComponentLibrary` which will be populated from the new `components.yaml` files.

---

## Library YAML File Changes

### 1. Directory Restructure

**Current structure:**
```
libraries/packs/
├── technologies/
│   ├── aws/pack.yaml
│   ├── azure/pack.yaml
│   └── generic/pack.yaml
├── threats/
│   └── base-stride/pack.yaml
└── compliance/
    ├── pci-dss/pack.yaml
    └── dora/pack.yaml
```

**Target structure:**
```
libraries/packs/
├── aws/
│   ├── pack.yaml              # Metadata only
│   ├── components.yaml
│   ├── threats.yaml
│   ├── countermeasures.yaml
│   ├── joins/
│   │   ├── components-threats.yaml
│   │   ├── threats-countermeasures.yaml
│   │   ├── countermeasures-asvs.yaml
│   │   └── countermeasures-pci-dss.yaml
│   └── templates/
│       ├── serverless-api.yaml
│       └── three-tier-webapp.yaml
├── azure/
│   └── ... (same structure)
├── generic/
│   └── ... (same structure)
├── banking/
│   ├── pack.yaml
│   ├── threats.yaml           # Industry-specific threats
│   ├── countermeasures.yaml   # Industry-specific countermeasures
│   ├── joins/
│   │   ├── threats-countermeasures.yaml
│   │   └── countermeasures-pci-dss.yaml
│   └── templates/
│       └── card-payment-processing.yaml
└── frameworks/                 # Framework definitions (separate from provider packs)
    ├── asvs/
    │   └── framework.yaml      # Framework + requirements only
    ├── pci-dss/
    │   └── framework.yaml
    └── dora/
        └── framework.yaml
```

### 2. Migration Script

```python
# backend/apps/packs/management/commands/migrate_pack_format.py

"""
Migrate from single pack.yaml to multi-file format.

Usage:
    python manage.py migrate_pack_format libraries/packs/technologies/aws
"""

class Command(BaseCommand):
    def handle(self, pack_path: str, **options):
        pack_dir = Path(pack_path)
        pack_yaml = pack_dir / "pack.yaml"

        if not pack_yaml.exists():
            raise CommandError(f"No pack.yaml found in {pack_dir}")

        with open(pack_yaml) as f:
            data = yaml.safe_load(f)

        # Extract metadata
        metadata = data.get("pack", {})

        # Extract and write components
        components = data.get("components", [])
        if components:
            self._write_components(pack_dir, components)

        # Extract threats (from components and standalone)
        threats = self._extract_threats(data)
        if threats:
            self._write_threats(pack_dir, threats)

        # Extract countermeasures
        countermeasures = self._extract_countermeasures(data)
        if countermeasures:
            self._write_countermeasures(pack_dir, countermeasures)

        # Generate join files
        self._generate_joins(pack_dir, data)

        # Move templates
        self._migrate_templates(pack_dir)

        # Rewrite pack.yaml with metadata only
        self._write_metadata(pack_dir, metadata)

        self.stdout.write(f"Migrated {pack_dir}")

    def _write_components(self, pack_dir: Path, components: list):
        # Strip nested threats/countermeasures, keep only component data
        clean_components = []
        for comp in components:
            clean_comp = {
                "id": comp["slug"],
                "name": comp["name"],
                "type": comp.get("component_type"),
                "category": comp.get("category"),
                "description": comp.get("description"),
            }
            clean_components.append({k: v for k, v in clean_comp.items() if v})

        with open(pack_dir / "components.yaml", "w") as f:
            yaml.dump({"components": clean_components}, f, default_flow_style=False)

    def _generate_joins(self, pack_dir: Path, data: dict):
        joins_dir = pack_dir / "joins"
        joins_dir.mkdir(exist_ok=True)

        # Component-threat mappings
        component_threat_mappings = []
        for comp in data.get("components", []):
            threats = comp.get("threats", [])
            if threats:
                component_threat_mappings.append({
                    "component": comp["slug"],
                    "threats": [t["slug"] for t in threats]
                })

        if component_threat_mappings:
            with open(joins_dir / "components-threats.yaml", "w") as f:
                yaml.dump({"mappings": component_threat_mappings}, f)

        # Threat-countermeasure mappings (similar logic)
        # ...
```

### 3. Example Converted Files

**Before (`pack.yaml` - single file):**
```yaml
pack:
  slug: aws-technologies
  name: AWS Technologies
  version: "1.0.0"
  pack_type: technology

components:
  - slug: aws_lambda
    name: AWS Lambda
    category: process
    component_type: compute
    threats:
      - slug: code_injection
        name: Code injection
        stride_category: tampering
        countermeasures:
          - slug: input_validation
            name: Validate all inputs
            control_type: technical
```

**After (multi-file):**

`pack.yaml`:
```yaml
pack:
  slug: aws
  name: AWS
  version: "1.0.0"
  pack_type: technology
  description: AWS cloud components, threats, and countermeasures
```

`components.yaml`:
```yaml
components:
  - id: aws_lambda
    name: AWS Lambda
    category: process
    type: compute
```

`threats.yaml`:
```yaml
threats:
  - id: code_injection
    name: Code injection
    stride_category: tampering
```

`countermeasures.yaml`:
```yaml
countermeasures:
  - id: input_validation
    name: Validate all inputs
    control_type: technical
```

`joins/components-threats.yaml`:
```yaml
mappings:
  - component: aws_lambda
    threats:
      - code_injection
```

`joins/threats-countermeasures.yaml`:
```yaml
mappings:
  - threat: code_injection
    countermeasures:
      - input_validation
```

---

## Unintended Consequences & Mitigations

### 1. Orphaned References

**Risk:** Join file references a component/threat/countermeasure that doesn't exist.

**Mitigation:**
- Validate all references during import
- Fail fast with clear error messages
- Add a `--dry-run` flag to import command

```python
def _validate_all_references(self, pack_path: Path):
    """Pre-import validation of all cross-references."""
    errors = []

    # Load all IDs from base files
    component_ids = set(self._get_ids(pack_path / "components.yaml", "components"))
    threat_ids = set(self._get_ids(pack_path / "threats.yaml", "threats"))
    cm_ids = set(self._get_ids(pack_path / "countermeasures.yaml", "countermeasures"))

    # Check joins reference valid IDs
    for join_file in (pack_path / "joins").glob("*.yaml"):
        data = self._load_yaml(join_file)
        for mapping in data.get("mappings", []):
            if "component" in mapping and mapping["component"] not in component_ids:
                errors.append(f"{join_file.name}: Unknown component '{mapping['component']}'")
            # ... similar for threats, countermeasures

    if errors:
        raise ValidationError("Reference validation failed:\n" + "\n".join(errors))
```

### 2. Circular Dependencies Between Packs

**Risk:** Pack A depends on Pack B which depends on Pack A.

**Mitigation:**
- Detect cycles during dependency resolution
- Fail import with clear error

```python
def _check_circular_dependencies(self, pack_slug: str, visited: set = None):
    if visited is None:
        visited = set()

    if pack_slug in visited:
        raise ValidationError(f"Circular dependency detected: {' -> '.join(visited)} -> {pack_slug}")

    visited.add(pack_slug)
    pack = LibraryPack.objects.get(slug=pack_slug)

    for dep in pack.dependencies.all():
        self._check_circular_dependencies(dep.depends_on_pack.slug, visited.copy())
```

### 3. Framework Overlay Without Framework Definition

**Risk:** `countermeasures-pci-dss.yaml` references framework `pci_dss_4_0_1` but the framework isn't installed.

**Mitigation:**
- Warn but don't fail (overlay is stored but not active)
- Provide UI to show "pending" overlays that need framework packs

```python
def _load_framework_overlay(self, library_pack, file_path):
    data = self._load_yaml(file_path)
    framework_id = data.get("framework")

    framework = StandardFramework.objects.filter(slug=framework_id).first()

    if not framework:
        self.stdout.write(
            self.style.WARNING(
                f"Framework '{framework_id}' not found. "
                f"Overlay will activate when framework is installed."
            )
        )
        # Store overlay metadata for later activation
        PendingFrameworkOverlay.objects.update_or_create(
            pack=library_pack,
            framework_slug=framework_id,
            defaults={"overlay_data": data}
        )
        return

    # ... apply overlay
```

### 4. Template component_ref to Non-Installed Pack

**Risk:** Template references `generic/database` but org hasn't installed the generic pack.

**Mitigation:**
- Validate at template insertion time, not import time
- Show warning in UI: "This template requires the 'generic' pack"

```typescript
// Frontend validation
function validateTemplateForOrg(template: DFDTemplate, installedPacks: string[]): ValidationResult {
  const missingPacks: string[] = []

  for (const node of template.canvasData?.nodes ?? []) {
    const ref = node.data?.component_ref
    if (ref?.includes("/")) {
      const packSlug = ref.split("/")[0]
      if (!installedPacks.includes(packSlug)) {
        missingPacks.push(packSlug)
      }
    }
  }

  return {
    valid: missingPacks.length === 0,
    missingPacks: [...new Set(missingPacks)],
  }
}
```

### 5. Duplicate IDs Across Packs

**Risk:** Both `aws/threats.yaml` and `banking/threats.yaml` define `id: data_breach`.

**Mitigation:**
- Already handled by `qualified_slug` namespacing: `aws/data_breach` vs `banking/data_breach`
- No action needed — this is a feature, not a bug

### 6. Large Join Files Causing Slow Imports

**Risk:** `components-threats.yaml` with thousands of mappings.

**Mitigation:**
- Use bulk operations
- Show progress during import

```python
def _load_component_threat_joins_bulk(self, library_pack, file_path):
    data = self._load_yaml(file_path)
    mappings = data.get("mappings", [])

    # Batch into chunks
    chunk_size = 500
    for i in range(0, len(mappings), chunk_size):
        chunk = mappings[i:i + chunk_size]

        joins_to_create = []
        for mapping in chunk:
            component = self._resolve_component(library_pack, mapping["component"])
            for threat_id in mapping.get("threats", []):
                threat = self._resolve_threat(library_pack, threat_id)
                joins_to_create.append(
                    ComponentLibraryThreat(
                        component_library=component,
                        threat_library=threat,
                    )
                )

        ComponentLibraryThreat.objects.bulk_create(
            joins_to_create,
            ignore_conflicts=True
        )

        self.stdout.write(f"Processed {min(i + chunk_size, len(mappings))}/{len(mappings)} mappings")
```

---

## Testing Checklist

- [ ] Import pack with all file types (components, threats, countermeasures, joins, templates)
- [ ] Import pack with missing optional files (no threats.yaml)
- [ ] Import pack with framework overlay for non-existent framework
- [ ] Import pack with cross-pack component_ref in template
- [ ] Validate orphaned reference detection
- [ ] Validate circular dependency detection
- [ ] Test selective framework overlay installation via API
- [ ] Frontend: Install pack with overlay selection
- [ ] Frontend: Insert template with component_ref resolution
- [ ] Migration script: Convert existing pack.yaml to multi-file format

---

## Rollout Plan

1. **Phase 1:** Implement new import logic (supports both formats)
2. **Phase 2:** Migrate existing YAML files using migration script
3. **Phase 3:** Update frontend pack installation UI
4. **Phase 4:** Remove legacy single-file import support
