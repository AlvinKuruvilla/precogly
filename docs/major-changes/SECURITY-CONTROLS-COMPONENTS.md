# Feature Spec: Security Controls as First-Class Components

## 1. Objective

Enhance the DFD editor and Library Packs system to support **Security Control Components** - components that provide protective countermeasures to downstream components in the data flow path.

**Goal:** When a user places a security control (e.g., WAF, API Gateway) in a data flow path, the system automatically marks relevant countermeasures on downstream components as "Platform (provided by {control})".

## 2. Core Concept

Security controls are **Process nodes** that traffic flows through. Protection is determined by **flow topology**, not boundary properties.

### Mental Model

```
┌─────────────────────────────────────────────────────────────────┐
│  INTERNET ZONE (Trust Boundary)                                 │
│    [External User]                                              │
└────────────┬────────────────────────────────────────────────────┘
             │ flow
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  DMZ ZONE (Trust Boundary)                                      │
│    ┌─────────┐         ┌─────────────┐                          │
│    │   WAF   │ ─────── │ API Gateway │                          │
│    │(Process)│  flow   │  (Process)  │                          │
│    └─────────┘         └─────────────┘                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ flow
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  INTERNAL ZONE (Trust Boundary)                                 │
│    ┌────────────┐         ┌──────────┐                          │
│    │ API Server │ ─────── │ Database │                          │
│    │ (Process)  │  flow   │(Datastore)│                          │
│    └────────────┘         └──────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

**Key distinctions:**
- **Trust Boundaries** = Zones (VPC, subnet, network segment) - containers defining "where"
- **Security Controls** = Process nodes (WAF, API Gateway, Load Balancer) - components that traffic flows THROUGH
- **Protection** = Determined by flow topology - downstream components inherit countermeasures

### Protection Flow

```
External User → WAF → API Gateway → API Server → Database
```

- **WAF protects**: API Gateway, API Server, Database (everything downstream)
- **API Gateway protects**: API Server, Database (everything downstream)

If a flow bypasses the WAF:
```
External User → API Server (direct)
```
Then API Server is NOT protected by WAF for that specific flow path.

## 3. Architecture

### Hybrid Frontend + Backend Approach

| Layer | Responsibility |
|-------|----------------|
| **Frontend** | Fast UX - instantly shows inherited countermeasures when topology changes |
| **Backend** | Validates capability mappings, persists state, provides audit trail |

### Existing Files Reference

| File | Purpose |
|------|---------|
| `backend/apps/systems/models.py` | `ComponentLibrary` model |
| `backend/apps/threats/models.py` | `ThreatLibrary`, `CountermeasureLibrary`, instance models |
| `backend/apps/packs/models.py` | `LibraryPack` model |
| `frontend/src/features/dfd-editor/lib/threat-registry.ts` | Frontend threat definitions |
| `frontend/src/features/dfd-editor/lib/countermeasure-registry.ts` | Frontend countermeasure definitions |
| `frontend/src/features/dfd-editor/types/diagram.ts` | Node and edge type definitions |

## 4. Data Model Changes

### 4.1. Update ComponentLibrary Category

**File:** `backend/apps/systems/models.py`

Add `security_control` to the Category choices:

```python
class ComponentLibrary(TimestampedModel):
    class Category(models.TextChoices):
        PROCESS = "process", "Process"
        DATASTORE = "datastore", "Data Store"
        EXTERNAL = "external", "External Entity"
        SECURITY_CONTROL = "security_control", "Security Control"  # NEW
```

### 4.2. New Table: ComponentLibraryCapability

**File:** `backend/apps/threats/models.py`

Stores which countermeasures a component (specifically security controls) provides to downstream components.

```python
class ComponentLibraryCapability(TimestampedModel):
    """
    Maps security control components to the countermeasures they provide.
    When traffic flows through a security control, downstream components
    inherit these countermeasures as "Platform" level protections.
    """

    class Condition(models.TextChoices):
        INGRESS = "ingress", "Ingress"      # Protects traffic entering through this control
        EGRESS = "egress", "Egress"         # Protects traffic leaving through this control
        ALWAYS = "always", "Always"         # Always provides this countermeasure

    class Confidence(models.TextChoices):
        HIGH = "high", "High"               # Well-established protection
        MEDIUM = "medium", "Medium"         # Typical configuration provides this
        LOW = "low", "Low"                  # Depends heavily on configuration

    # The security control component (e.g., AWS WAF)
    component_library = models.ForeignKey(
        'systems.ComponentLibrary',
        on_delete=models.CASCADE,
        related_name='capabilities',
        limit_choices_to={'category': 'security_control'},
    )

    # The countermeasure this component provides (e.g., Input Validation)
    countermeasure_library = models.ForeignKey(
        'CountermeasureLibrary',
        on_delete=models.CASCADE,
        related_name='provided_by_components',
    )

    # When does this protection apply?
    condition = models.CharField(
        max_length=20,
        choices=Condition.choices,
        default=Condition.INGRESS,
    )

    # How confident are we this is provided?
    confidence = models.CharField(
        max_length=20,
        choices=Confidence.choices,
        default=Confidence.HIGH,
    )

    # Configuration notes (what config is needed for this to apply)
    configuration_notes = models.TextField(
        blank=True,
        help_text="Configuration requirements for this capability to be active",
    )

    # Source tracking
    source_pack = models.ForeignKey(
        'packs.LibraryPack',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='capabilities',
    )

    class Meta:
        unique_together = ['component_library', 'countermeasure_library']
        verbose_name = "Component Capability"
        verbose_name_plural = "Component Capabilities"

    def __str__(self):
        return f"{self.component_library.name} provides {self.countermeasure_library.name}"
```

### 4.3. Frontend Type Updates

**File:** `frontend/src/features/dfd-editor/types/diagram.ts`

Add security control indicator to ProcessNodeData:

```typescript
export interface ProcessNodeData extends BaseNodeData {
  technology?: string
  dataSensitivity?: DataSensitivity
  isSecurityControl?: boolean  // NEW: marks this as a security control
}
```

### 4.4. Update Domain Types

**File:** `frontend/src/types/domain.ts`

No changes needed - security controls are processes, not a new node type.

## 5. Library Pack Schema Extension

**File:** Pack JSON files (e.g., `backend/sample_packs/aws-technologies/pack.yaml`)

Add `capabilities` array to security control components:

```yaml
components:
  - slug: aws-waf
    name: AWS WAF
    category: security_control
    description: Web Application Firewall for filtering malicious web traffic
    vendor: aws
    capabilities:
      - countermeasure_slug: cm-input-validation
        confidence: high
        condition: ingress
        configuration_notes: "Requires OWASP managed rule set enabled"
      - countermeasure_slug: cm-rate-limiting
        confidence: medium
        condition: ingress
        configuration_notes: "Requires rate-based rules configured"
      - countermeasure_slug: cm-sql-injection-prevention
        confidence: high
        condition: ingress
        configuration_notes: "Requires SQL injection rule group enabled"

  - slug: aws-api-gateway
    name: AWS API Gateway
    category: security_control
    description: Managed API gateway with authentication and throttling
    vendor: aws
    capabilities:
      - countermeasure_slug: cm-api-authentication
        confidence: high
        condition: ingress
      - countermeasure_slug: cm-rate-limiting
        confidence: high
        condition: ingress
      - countermeasure_slug: cm-request-validation
        confidence: medium
        condition: ingress
        configuration_notes: "Requires request validators configured"

  - slug: aws-alb
    name: AWS Application Load Balancer
    category: security_control
    description: Layer 7 load balancer with TLS termination
    vendor: aws
    capabilities:
      - countermeasure_slug: cm-tls-encryption
        confidence: high
        condition: ingress
        configuration_notes: "Requires HTTPS listener configured"
      - countermeasure_slug: cm-ddos-protection
        confidence: medium
        condition: ingress
        configuration_notes: "Basic protection; use AWS Shield for advanced"
```

## 6. The Reconciliation Engine

### 6.1. When Reconciliation Runs

| Trigger | Location | Action |
|---------|----------|--------|
| Diagram loads | Frontend | Build protection graph, compute all inherited countermeasures |
| Flow created/modified | Frontend | Recompute protection for affected components |
| Component analyzed | Frontend | Trace upstream to find protecting security controls |
| Diagram saved | Backend | Validate capability mappings, persist audit log |

### 6.2. Frontend Reconciliation Logic

**New File:** `frontend/src/features/dfd-editor/lib/protection-resolver.ts`

```typescript
import type { DiagramNode, DataFlowEdge } from '../types'

interface ProtectionSource {
  controlNodeId: string
  controlLabel: string
  controlTechnology: string
  countermeasureIds: string[]
  confidence: 'high' | 'medium' | 'low'
}

interface ComponentProtection {
  nodeId: string
  protectedBy: ProtectionSource[]
  inheritedCountermeasures: Map<string, ProtectionSource> // countermeasureId -> source
}

/**
 * Build a directed graph of data flows and compute which components
 * are protected by which security controls.
 */
export function computeProtectionGraph(
  nodes: DiagramNode[],
  edges: DataFlowEdge[]
): Map<string, ComponentProtection> {
  const protectionMap = new Map<string, ComponentProtection>()

  // Initialize all nodes
  nodes.forEach(node => {
    protectionMap.set(node.id, {
      nodeId: node.id,
      protectedBy: [],
      inheritedCountermeasures: new Map(),
    })
  })

  // Find all security control nodes
  const securityControls = nodes.filter(
    n => n.type === 'process' && n.data.isSecurityControl
  )

  // For each security control, find all downstream nodes (BFS)
  securityControls.forEach(control => {
    const downstreamNodes = findDownstreamNodes(control.id, edges)
    const capabilities = getCapabilitiesForTechnology(control.data.technology)

    downstreamNodes.forEach(nodeId => {
      const protection = protectionMap.get(nodeId)
      if (protection) {
        const source: ProtectionSource = {
          controlNodeId: control.id,
          controlLabel: control.data.label,
          controlTechnology: control.data.technology || 'Unknown',
          countermeasureIds: capabilities.map(c => c.countermeasureId),
          confidence: 'high', // Could be refined based on capability confidence
        }

        protection.protectedBy.push(source)

        capabilities.forEach(cap => {
          // If multiple controls provide same countermeasure, keep highest confidence
          const existing = protection.inheritedCountermeasures.get(cap.countermeasureId)
          if (!existing || cap.confidence > existing.confidence) {
            protection.inheritedCountermeasures.set(cap.countermeasureId, source)
          }
        })
      }
    })
  })

  return protectionMap
}

/**
 * Find all nodes downstream of a given node (BFS traversal)
 */
function findDownstreamNodes(sourceId: string, edges: DataFlowEdge[]): string[] {
  const downstream: string[] = []
  const visited = new Set<string>()
  const queue = [sourceId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)

    // Find all edges where current is the source
    edges
      .filter(e => e.source === current)
      .forEach(e => {
        if (!visited.has(e.target)) {
          downstream.push(e.target)
          queue.push(e.target)
        }
      })
  }

  return downstream
}

/**
 * Get capabilities for a technology from the registry
 */
function getCapabilitiesForTechnology(technology: string | undefined): Array<{
  countermeasureId: string
  confidence: 'high' | 'medium' | 'low'
}> {
  if (!technology) return []
  return SECURITY_CONTROL_CAPABILITIES[technology] || []
}

/**
 * Registry of security control capabilities (frontend cache of backend data)
 */
export const SECURITY_CONTROL_CAPABILITIES: Record<string, Array<{
  countermeasureId: string
  confidence: 'high' | 'medium' | 'low'
  condition: 'ingress' | 'egress' | 'always'
}>> = {
  'aws-waf': [
    { countermeasureId: 'cm-input-validation', confidence: 'high', condition: 'ingress' },
    { countermeasureId: 'cm-rate-limiting', confidence: 'medium', condition: 'ingress' },
    { countermeasureId: 'cm-sql-injection-prevention', confidence: 'high', condition: 'ingress' },
  ],
  'aws-api-gateway': [
    { countermeasureId: 'cm-api-authentication', confidence: 'high', condition: 'ingress' },
    { countermeasureId: 'cm-rate-limiting', confidence: 'high', condition: 'ingress' },
    { countermeasureId: 'cm-request-validation', confidence: 'medium', condition: 'ingress' },
  ],
  'aws-alb': [
    { countermeasureId: 'cm-tls-encryption', confidence: 'high', condition: 'ingress' },
    { countermeasureId: 'cm-ddos-protection', confidence: 'medium', condition: 'ingress' },
  ],
  // Add more as needed...
}
```

### 6.3. Integration with Threat Analysis

**File:** `frontend/src/features/dfd-editor/lib/threat-registry.ts`

Update threat analysis to use protection graph:

```typescript
/**
 * Get countermeasures for a threat, marking inherited ones as "platform"
 */
export function getCountermeasuresForThreat(
  threatId: string,
  nodeId: string,
  protectionMap: Map<string, ComponentProtection>
): CountermeasureInstance[] {
  const countermeasureDefs = getCountermeasureDefinitionsForThreat(threatId)
  const nodeProtection = protectionMap.get(nodeId)

  return countermeasureDefs.map(cmDef => {
    const inheritedFrom = nodeProtection?.inheritedCountermeasures.get(cmDef.id)

    return {
      id: cmDef.id,
      name: cmDef.name,
      description: cmDef.description,
      status: inheritedFrom ? 'platform' : 'gap',
      providedBy: inheritedFrom ? {
        controlId: inheritedFrom.controlNodeId,
        controlLabel: inheritedFrom.controlLabel,
        confidence: inheritedFrom.confidence,
      } : undefined,
      isLocked: !!inheritedFrom, // Can't change status if platform-provided
    }
  })
}
```

### 6.4. Backend Validation

**File:** `backend/apps/diagrams/services.py`

Add validation when diagram is saved:

```python
def validate_protection_claims(canvas_data: dict) -> list[str]:
    """
    Validate that claimed protections are legitimate.
    Returns list of warning messages.
    """
    warnings = []
    nodes = canvas_data.get('nodes', [])
    edges = canvas_data.get('edges', [])

    # Find security controls and their claimed capabilities
    security_controls = [
        n for n in nodes
        if n.get('type') == 'process' and n.get('data', {}).get('isSecurityControl')
    ]

    for control in security_controls:
        technology = control.get('data', {}).get('technology')
        if not technology:
            warnings.append(
                f"Security control '{control.get('data', {}).get('label')}' "
                f"has no technology specified"
            )
            continue

        # Verify technology exists in library
        component = ComponentLibrary.objects.filter(
            slug=technology,
            category='security_control'
        ).first()

        if not component:
            warnings.append(
                f"Technology '{technology}' is not a recognized security control"
            )

    return warnings
```

## 7. Frontend UI Changes

### 7.1. Component Palette

**File:** `frontend/src/features/dfd-editor/components/DiagramToolbar.tsx`

Add Security Controls section to the toolbar:

```typescript
// Add new section after Process button
<div className="flex flex-col gap-1">
  <span className="text-xs text-muted-foreground px-2">Security Controls</span>
  <Button variant="ghost" size="sm" onClick={() => addSecurityControl('aws-waf')}>
    <Shield className="h-4 w-4 mr-2" />
    WAF
  </Button>
  <Button variant="ghost" size="sm" onClick={() => addSecurityControl('aws-api-gateway')}>
    <DoorOpen className="h-4 w-4 mr-2" />
    API Gateway
  </Button>
  <Button variant="ghost" size="sm" onClick={() => addSecurityControl('aws-alb')}>
    <Scale className="h-4 w-4 mr-2" />
    Load Balancer
  </Button>
</div>
```

### 7.2. Security Control Node Visual

Security controls should be visually distinct from regular processes:

- **Shape**: Rounded rectangle (same as Process)
- **Border**: Double border or shield icon overlay
- **Color**: Blue with shield accent
- **Badge**: Shows number of capabilities provided

### 7.3. Node Edit Panel

**File:** `frontend/src/features/dfd-editor/components/panels/NodeEditPanel.tsx`

When a security control is selected, show its capabilities:

```typescript
{node.data.isSecurityControl && (
  <div className="space-y-2">
    <Label>Provides Protection</Label>
    <div className="text-sm text-muted-foreground">
      {getCapabilitiesForTechnology(node.data.technology).map(cap => (
        <div key={cap.countermeasureId} className="flex items-center gap-2">
          <ShieldCheck className="h-3 w-3 text-green-500" />
          <span>{getCountermeasureName(cap.countermeasureId)}</span>
          <Badge variant="outline" className="text-xs">
            {cap.confidence}
          </Badge>
        </div>
      ))}
    </div>
  </div>
)}
```

### 7.4. Threat Analysis View

**File:** `frontend/src/features/dfd-editor/components/threat-analysis/ComponentView.tsx`

Show inherited countermeasures with visual distinction:

```typescript
{countermeasure.status === 'platform' && countermeasure.providedBy && (
  <div className="flex items-center gap-1 text-xs text-green-600">
    <ShieldCheck className="h-3 w-3" />
    <span>Provided by {countermeasure.providedBy.controlLabel}</span>
    <Badge variant="outline" className="text-xs">
      {countermeasure.providedBy.confidence}
    </Badge>
  </div>
)}
```

## 8. Concrete Scenario (Test Case)

### Setup

1. **Components in diagram:**
   - External User (Actor)
   - AWS WAF (Process, isSecurityControl: true, technology: "aws-waf")
   - API Server (Process, technology: "nodejs")
   - Database (DataStore, technology: "aws-rds")

2. **Data flows:**
   - External User → AWS WAF
   - AWS WAF → API Server
   - API Server → Database

3. **Threats on API Server:**
   - SQL Injection (countermeasure: Input Validation)
   - Broken Authentication (countermeasure: API Authentication)

### Expected Behavior

1. **Protection graph computed:**
   - WAF protects: API Server, Database
   - WAF provides: Input Validation, Rate Limiting

2. **Threat analysis for API Server:**
   - SQL Injection threat:
     - Countermeasure: Input Validation
     - Status: **PLATFORM** (provided by AWS WAF)
     - Locked: Yes (can't change to Gap)
   - Broken Authentication threat:
     - Countermeasure: API Authentication
     - Status: **GAP** (WAF doesn't provide this)

3. **If user removes WAF → API Server flow:**
   - Recompute protection graph
   - API Server no longer downstream of WAF
   - Input Validation status: **GAP** (was Platform, now unprotected)

## 9. Migration Path

### Phase 1: Data Model
1. Add `security_control` to `ComponentLibrary.Category`
2. Create `ComponentLibraryCapability` model
3. Run migrations

### Phase 2: Library Packs
1. Update pack schema to support `capabilities`
2. Add capabilities to existing security control components (WAF, API Gateway, etc.)
3. Import updated packs

### Phase 3: Frontend
1. Add `isSecurityControl` to ProcessNodeData
2. Implement `protection-resolver.ts`
3. Update threat analysis to use protection graph
4. Add UI for security control capabilities

### Phase 4: Backend Validation
1. Add validation service for protection claims
2. Add audit logging for inherited countermeasures

## 10. Operational Workflow: Platform Standards & Customization

### 10.1. The Collaboration Model

Security controls and their capabilities are managed through a collaboration between three roles:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COLLABORATION MODEL                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  INFRASTRUCTURE/PLATFORM TEAM                                       │
│  ├── Defines standards: "Our WAF blocks SQLi by default"            │
│  ├── Manages central security controls                              │
│  └── Communicates requirements to Security Team                     │
│           │                                                         │
│           ▼                                                         │
│  SECURITY TEAM (Library Pack Editors)                               │
│  ├── Codifies standards into Library Packs                          │
│  ├── Customizes capabilities and confidence levels                  │
│  ├── Creates "Golden Components" for org-specific controls          │
│  └── Acts as bridge between Platform and Development                │
│           │                                                         │
│           ▼                                                         │
│  DEVELOPERS (Regular Users)                                         │
│  ├── Consume components from the library                            │
│  ├── Inherit protection automatically via flow topology             │
│  └── Cannot modify library capabilities (view only)                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key principle:** Only Security Team members have edit access to Library Packs. They translate platform standards into codified security capabilities.

### 10.2. Workflow: Customizing Standard Packs ("The Hardening Process")

This workflow allows the Security Team to reflect the organization's specific "Golden Paths" by overriding default pack values.

**Scenario:** The official "AWS Technologies" pack lists AWS WAF with `Medium` confidence for SQL Injection protection (because it requires configuration). However, the organization's Infrastructure team manages a centralized WAF that enforces strict rules on all traffic.

**Steps:**

1. **Import:** Security Team imports the AWS Technologies pack.

2. **Navigate:** Security Team goes to Library → Components → AWS WAF.

3. **Override Capability:**
   - Selects the "SQL Injection Prevention" capability
   - Updates **Confidence**: `Medium` → `High`
   - Updates **Configuration Notes**:
     ```
     "Managed by Platform Team. Ruleset corp-strict-v1 is enforced
     automatically on all traffic through the corporate WAF."
     ```

4. **Save:** The system updates `ComponentLibrary.customization_status` to `customized`.

5. **Effect:** When a Developer uses this WAF in a diagram:
   - SQL Injection threats on downstream components show: **"Platform (High Confidence)"**
   - Tooltip displays: *"Managed by Platform Team. Ruleset corp-strict-v1 is enforced automatically."*

**Data Model Impact:**

```python
# ComponentLibrary after customization
{
    "slug": "aws-waf",
    "name": "AWS WAF",
    "customization_status": "customized",  # Changed from "original"
    "base_item_qualified_slug": "aws-technologies/aws-waf",  # Link to original
}

# ComponentLibraryCapability after override
{
    "component_library": "aws-waf",
    "countermeasure_library": "cm-sql-injection-prevention",
    "confidence": "high",  # Changed from "medium"
    "configuration_notes": "Managed by Platform Team. Ruleset corp-strict-v1...",
}
```

### 10.3. Workflow: Creating "Golden Components"

For components that are heavily customized or built in-house (e.g., a corporate authentication gateway wrapping Keycloak).

**Scenario:** The organization has an internal "Acme Payment Gateway" that wraps AWS API Gateway with additional authentication and audit logging capabilities.

**Steps:**

1. **Clone:** Security Team selects "AWS API Gateway" and clicks **"Clone to Custom Component"**.

2. **Rename:**
   - Name: `Acme Payment Gateway`
   - Slug: `acme-payment-gateway`
   - Description: `Internal payment gateway with mandatory authentication and audit logging`

3. **Define Capabilities:**
   - **Add:** `cm-authentication` (High Confidence, Always)
   - **Add:** `cm-audit-logging` (High Confidence, Always)
   - **Add:** `cm-pci-compliance` (High Confidence, Ingress)
   - **Remove:** Capabilities that the internal implementation does NOT support

4. **Publish:** The component is added to the "Organization Shared" pack.

5. **Effect:**
   - Developers see "Acme Payment Gateway" in the Security Controls palette
   - Drag-and-drop adds it to diagrams like any other component
   - It carries the organization's specific security DNA
   - Downstream components automatically inherit its protections

**UI Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│  CLONE COMPONENT                                                │
├─────────────────────────────────────────────────────────────────┤
│  Source: AWS API Gateway (aws-technologies pack)                │
│                                                                 │
│  New Component Name: [Acme Payment Gateway          ]           │
│  Slug:               [acme-payment-gateway          ]           │
│  Description:        [Internal payment gateway...   ]           │
│                                                                 │
│  Target Pack: [Organization Shared    ▼]                        │
│                                                                 │
│  [ ] Copy all capabilities from source                          │
│  [x] Start with blank capabilities (define manually)            │
│                                                                 │
│                              [Cancel]  [Create Component]       │
└─────────────────────────────────────────────────────────────────┘
```

### 10.4. Role-Based Access Controls (UI Requirements)

The UI must differentiate between user roles to prevent unauthorized modifications to platform standards.

#### Regular Users (Developers)

| Feature | Access |
|---------|--------|
| View component capabilities | ✅ Read-only |
| See confidence levels | ✅ Read-only |
| See configuration notes | ✅ Read-only |
| Modify capabilities | ❌ Disabled |
| Change confidence levels | ❌ Disabled |
| Edit configuration notes | ❌ Disabled |
| Use components in diagrams | ✅ Full access |
| Change node technology (if locked) | ❌ Disabled |

**UI for Regular Users:**

```
┌─────────────────────────────────────────────────────────────────┐
│  AWS WAF                                        [🔒 Locked]     │
├─────────────────────────────────────────────────────────────────┤
│  Technology: AWS WAF (aws-waf)                                  │
│                                                                 │
│  PROVIDES PROTECTION                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Input Validation              [High]                   │   │
│  │   Managed by Platform Team. Ruleset corp-strict-v1...    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ✓ Rate Limiting                 [Medium]                 │   │
│  │   Requires rate-based rules to be configured             │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ✓ SQL Injection Prevention      [High]                   │   │
│  │   Managed by Platform Team. Ruleset corp-strict-v1...    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⓘ Capabilities are managed by your Security Team              │
└─────────────────────────────────────────────────────────────────┘
```

#### Security Team Members

| Feature | Access |
|---------|--------|
| All Regular User features | ✅ |
| Edit component capabilities | ✅ "Edit Capabilities" button |
| Change confidence levels | ✅ Dropdown in edit mode |
| Edit configuration notes | ✅ Text field in edit mode |
| Clone components | ✅ "Clone to Custom" button |
| Lock/unlock components | ✅ Toggle switch |
| Create new capabilities | ✅ "Add Capability" button |
| Delete capabilities | ✅ Remove button per capability |

**UI for Security Team:**

```
┌─────────────────────────────────────────────────────────────────┐
│  AWS WAF                              [Edit Capabilities]       │
├─────────────────────────────────────────────────────────────────┤
│  Technology: AWS WAF (aws-waf)        [Clone to Custom]         │
│                                                                 │
│  🔒 Lock Configuration: [====○    ]  (prevents developer drift) │
│                                                                 │
│  PROVIDES PROTECTION                           [+ Add Capability]│
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Input Validation              [High ▼]           [✕]  │   │
│  │   [Managed by Platform Team...                      ]    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ✓ Rate Limiting                 [Medium ▼]         [✕]  │   │
│  │   [Requires rate-based rules...                     ]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Customization Status: Customized (from aws-technologies pack)  │
│                                       [Reset to Original]       │
└─────────────────────────────────────────────────────────────────┘
```

#### Lock Configuration Feature

When a Security Team member enables "Lock Configuration" on a component:

- **Regular users cannot change:**
  - Technology selection (dropdown disabled)
  - Data sensitivity level
  - Any custom properties defined by the Security Team

- **Purpose:** Prevents "drift" from platform standards where developers might accidentally select the wrong technology or configuration.

- **Visual indicator:** Locked components show a 🔒 icon in the diagram and edit panel.

**Data Model:**

```python
# Add to ComponentLibrary or ProcessNodeData
is_locked: bool = False  # When True, regular users can't modify key properties
locked_by: User = None   # Who locked it
locked_at: datetime = None
lock_reason: str = ""    # Optional explanation
```

### 10.5. Permissions Model

```python
# Backend permission checks

class ComponentLibraryPermissions:
    """
    Permission logic for component library operations.
    """

    @staticmethod
    def can_edit_capabilities(user, organization) -> bool:
        """Only Security Team can edit capabilities."""
        return user.has_role('security_team', organization)

    @staticmethod
    def can_lock_component(user, organization) -> bool:
        """Only Security Team can lock/unlock components."""
        return user.has_role('security_team', organization)

    @staticmethod
    def can_modify_node_technology(user, node, organization) -> bool:
        """
        Check if user can change the technology on a node.
        Regular users cannot if the component is locked.
        """
        if user.has_role('security_team', organization):
            return True

        # Regular user - check if component is locked
        component = ComponentLibrary.objects.filter(
            slug=node.data.technology
        ).first()

        return not (component and component.is_locked)
```

---

## 11. Files Summary

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/features/dfd-editor/lib/protection-resolver.ts` | Protection graph computation |
| `backend/apps/threats/migrations/XXXX_add_capability_model.py` | Database migration |

### Modified Files

| File | Changes |
|------|---------|
| `backend/apps/systems/models.py` | Add `security_control` category, `is_locked` field |
| `backend/apps/threats/models.py` | Add `ComponentLibraryCapability` model |
| `frontend/src/features/dfd-editor/types/diagram.ts` | Add `isSecurityControl` to ProcessNodeData |
| `frontend/src/features/dfd-editor/lib/threat-registry.ts` | Integrate protection graph |
| `frontend/src/features/dfd-editor/components/DiagramToolbar.tsx` | Add Security Controls section |
| `frontend/src/features/dfd-editor/components/panels/NodeEditPanel.tsx` | Show capabilities, role-based UI |
| `frontend/src/features/dfd-editor/components/threat-analysis/ComponentView.tsx` | Show inherited countermeasures |
| `backend/sample_packs/aws-technologies/pack.yaml` | Add capabilities to components |

---

## Revision History

| Date | Changes |
|------|---------|
| 2026-01-17 | Initial draft - Security Controls as Components architecture |
