# Threat Model DSL - Specification

## Problem Statement

Define system architecture from high-level to granular detail, with:
- Links to technology libraries (for threat inference by existing threat analysis system)
- Trust boundaries and security properties
- Multiple views at different abstraction levels

**Note:** Threat generation, triage, and countermeasure tracking are handled by the existing Threat Analysis Workspace, not this DSL.

## Approach

Extend LikeC4's DSL with threat-modeling-specific constructs. Code-first, like LikeC4.

---

## DSL Structure

```
specification { }   // Define element kinds, relationship kinds, security tags
model { }           // Define architecture: elements, relationships, boundaries
views { }           // Define diagram views at different levels
```

The DSL defines **architecture**. The threat analysis system reads the model and generates/manages threats separately.

---

## 1. Specification Block

Define the vocabulary for this threat model.

```likec4
specification {

  // ═══════════════════════════════════════════════════════════════
  // ELEMENT KINDS
  // ═══════════════════════════════════════════════════════════════

  element actor {
    notation "Person"
    style { shape person }
  }

  element external {
    notation "External System"
    style { color muted }
  }

  element system {
    notation "Software System"
    style { opacity 25% }
  }

  element service {
    notation "Service / Process"
    style { color primary }
  }

  element datastore {
    notation "Data Store"
    style { shape storage }
  }

  element component {
    notation "Component"
  }

  // ═══════════════════════════════════════════════════════════════
  // TRUST BOUNDARY
  // ═══════════════════════════════════════════════════════════════

  element trustBoundary {
    style {
      border dashed
      opacity 10%
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RELATIONSHIP KINDS (security-relevant semantics)
  // ═══════════════════════════════════════════════════════════════

  relationship calls { }
  relationship stores { }
  relationship reads { }
  relationship publishes { }
  relationship subscribes { }
  relationship authenticates { }

  // ═══════════════════════════════════════════════════════════════
  // SECURITY TAGS (for threat inference by analysis system)
  // ═══════════════════════════════════════════════════════════════

  tag #pii                    // Handles personally identifiable information
  tag #pci                    // Handles payment card data
  tag #phi                    // Handles protected health information
  tag #public                 // Internet-accessible
  tag #internal               // Internal network only
  tag #privileged             // Runs with elevated permissions
  tag #encrypted_at_rest      // Data encrypted at rest
  tag #encrypted_in_transit   // Data encrypted in transit
  tag #mfa                    // Requires multi-factor authentication

  // ═══════════════════════════════════════════════════════════════
  // DATA CLASSIFICATIONS (for flows)
  // ═══════════════════════════════════════════════════════════════

  dataClass credentials       // Passwords, tokens, keys
  dataClass userdata          // User profile information
  dataClass financial         // Financial transactions
  dataClass session           // Session tokens
  dataClass audit             // Audit logs
}
```

---

## 2. Model Block

Define the actual architecture with security annotations.

```likec4
model {

  // ═══════════════════════════════════════════════════════════════
  // ACTORS (who interacts with the system)
  // ═══════════════════════════════════════════════════════════════

  customer = actor "Customer" {
    description "End user accessing via browser or mobile app"
  }

  admin = actor "Administrator" {
    description "Internal staff with elevated privileges"
    #privileged
  }

  paymentGateway = external "Payment Gateway" {
    description "Third-party payment processor"
    technology external:stripe
  }

  // ═══════════════════════════════════════════════════════════════
  // TRUST BOUNDARIES
  // ═══════════════════════════════════════════════════════════════

  internet = trustBoundary "Internet" {
    level untrusted
  }

  dmz = trustBoundary "DMZ" {
    level semi-trusted
  }

  internal = trustBoundary "Internal Network" {
    level trusted
  }

  database_zone = trustBoundary "Database Zone" {
    level restricted
    parent internal
  }

  // ═══════════════════════════════════════════════════════════════
  // SYSTEM ARCHITECTURE
  // ═══════════════════════════════════════════════════════════════

  platform = system "E-Commerce Platform" {
    description "Online shopping platform"

    // ─────────────────────────────────────────────────────────────
    // Web tier (in DMZ)
    // ─────────────────────────────────────────────────────────────

    webapp = service "Web Application" {
      description "React SPA served to customers"
      technology tech:react
      boundary dmz
      #public

      style { shape browser }
    }

    // ─────────────────────────────────────────────────────────────
    // API tier (in internal network)
    // ─────────────────────────────────────────────────────────────

    api = service "API Server" {
      description "REST API handling business logic"
      technology tech:nodejs
      boundary internal

      authController = component "Auth Controller" {
        technology tech:passport
      }

      userController = component "User Controller" {
        #pii
      }

      paymentController = component "Payment Controller" {
        #pci
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Data tier (in database zone)
    // ─────────────────────────────────────────────────────────────

    userDb = datastore "User Database" {
      description "Stores user accounts and profiles"
      technology aws:rds:postgresql
      boundary database_zone
      #pii
      #encrypted_at_rest
    }

    cache = datastore "Session Cache" {
      description "Stores active sessions"
      technology aws:elasticache:redis
      boundary internal
    }

    files = datastore "Document Storage" {
      description "User uploaded files"
      technology aws:s3
      boundary internal
      #encrypted_at_rest
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RELATIONSHIPS (data flows with security properties)
  // ═══════════════════════════════════════════════════════════════

  customer -> webapp "browses products" {
    protocol HTTPS
    data [session, userdata]
    #encrypted_in_transit
    crosses [internet, dmz]
  }

  webapp -> api "requests data" {
    protocol HTTPS
    data [session, userdata]
    #encrypted_in_transit
    crosses [dmz, internal]
  }

  api -> userDb "queries users" {
    protocol TLS
    data [credentials, userdata]
    #encrypted_in_transit
    crosses [internal, database_zone]
  }

  api -> cache "manages sessions" {
    protocol TCP
    data [session]
    // Note: not encrypted - threat analysis will flag this
  }

  api -> files "stores documents" {
    protocol HTTPS
    data [userdata]
    #encrypted_in_transit
  }

  api -> paymentGateway "processes payment" {
    protocol HTTPS
    data [financial]
    #encrypted_in_transit
  }
}
```

---

## 3. Views Block

Define different diagram perspectives.

```likec4
views {

  // System Context - highest level
  view context of platform {
    title "System Context"
    include
      customer,
      admin,
      platform,
      paymentGateway

    style platform {
      color primary
    }
  }

  // Container view - inside the platform
  view containers of platform {
    title "Container Diagram"
    include
      platform.*,
      -> customer,
      -> paymentGateway

    // Show trust boundaries
    include dmz, internal, database_zone
  }

  // Component view - inside the API
  view apiComponents of platform.api {
    title "API Components"
    include
      api.*,
      api.* -> *
  }

  // Security-focused view - highlight boundaries
  view securityZones {
    title "Security Zones"
    include *

    style internet { color red, opacity 20% }
    style dmz { color amber, opacity 20% }
    style internal { color green, opacity 20% }
    style database_zone { color blue, opacity 20% }
  }

  // Data flow view - trace PII
  view piiFlows {
    title "PII Data Flows"
    include
      element.tag = #pii,
      -> element.tag = #pii,
      element.tag = #pii ->

    style element.tag = #pii {
      color red
    }
  }
}
```

---

## 4. Technology Registry

Technologies use namespaced references that link to the registry.

### Namespace Format

```
<provider>:<service>:<variant>
```

| Namespace | Meaning | Example |
|-----------|---------|---------|
| `tech:*` | Self-hosted / generic | `tech:postgresql`, `tech:nodejs` |
| `aws:*` | AWS managed service | `aws:rds:postgresql`, `aws:s3` |
| `azure:*` | Azure managed service | `azure:cosmos-db`, `azure:blob` |
| `gcp:*` | GCP managed service | `gcp:cloud-sql:postgresql` |
| `external:*` | Third-party SaaS | `external:stripe`, `external:auth0` |

### Registry Lookup

When the model specifies:
```likec4
technology aws:rds:postgresql
```

The threat analysis system looks up in the registry:
```javascript
registry["aws:rds:postgresql"] = {
  displayName: "Amazon RDS for PostgreSQL",
  category: "datastore",

  // Inherited from aws:rds
  inherentThreats: [
    { id: "sql-injection", severity: "high" },
    { id: "privilege-escalation", severity: "medium" }
  ],

  // Auto-mitigations provided by AWS
  providedControls: [
    { id: "encryption-at-rest", when: "#encrypted_at_rest" },
    { id: "encryption-in-transit", when: "#encrypted_in_transit" },
    { id: "automated-backups", default: true }
  ],

  // What user should verify
  recommendedControls: [
    { id: "parameterized-queries", mitigates: "sql-injection" },
    { id: "least-privilege-accounts", mitigates: "privilege-escalation" }
  ]
}
```

### Editor Autocomplete

When typing `technology `, the editor shows autocomplete from registry:

```
┌─────────────────────────────────────────────────────────────┐
│  userDb = datastore "User Database" {                       │
│    technology |                                             │
│               ├─────────────────────────────────────────┐   │
│               │ ★ Recently Used                         │   │
│               │   aws:rds:postgresql                    │   │
│               │   aws:s3                                │   │
│               │ ─────────────────────────────────────── │   │
│               │ AWS                                     │   │
│               │   aws:rds:postgresql   RDS PostgreSQL   │   │
│               │   aws:rds:mysql        RDS MySQL        │   │
│               │   aws:dynamodb         DynamoDB         │   │
│               │   aws:s3               S3 Storage       │   │
│               │   aws:elasticache:redis ElastiCache     │   │
│               │ ─────────────────────────────────────── │   │
│               │ Azure                                   │   │
│               │   azure:sql            Azure SQL        │   │
│               │   azure:cosmos-db      Cosmos DB        │   │
│               │ ─────────────────────────────────────── │   │
│               │ Self-Hosted                             │   │
│               │   tech:postgresql      PostgreSQL       │   │
│               │   tech:mysql           MySQL            │   │
│               │   tech:mongodb         MongoDB          │   │
│               └─────────────────────────────────────────┘   │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Integration with Threat Analysis

The DSL model is **input** to the existing threat analysis system:

```
┌─────────────────────┐
│  DSL Model          │
│  (specification,    │
│   model, views)     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐      ┌─────────────────────┐
│  Parser             │      │  Technology         │
│  (DSL → TypeScript) │ ───► │  Registry           │
└─────────┬───────────┘      └──────────┬──────────┘
          │                             │
          ▼                             ▼
┌─────────────────────────────────────────────────┐
│  Threat Analysis System (existing)              │
│  ─────────────────────────────────────────────  │
│  • Reads model elements + technologies          │
│  • Applies threat inference rules               │
│  • Generates threats per element/flow           │
│  • Tracks countermeasures + assignments         │
│  • Shows in Threat Analysis Workspace           │
└─────────────────────────────────────────────────┘
```

---

## Key Concepts Summary

| Concept | Purpose |
|---------|---------|
| **specification** | Define vocabulary (element kinds, tags, data classes) |
| **model** | Define architecture with security annotations |
| **views** | Define diagram perspectives at different levels |
| **technology** | Namespaced reference to registry (`aws:s3`, `tech:postgresql`) |
| **trustBoundary** | Security perimeter with trust level |
| **tags** | Security properties (`#pii`, `#encrypted_at_rest`) |
| **dataClass** | Data classification for flows (`credentials`, `financial`) |

---

## Data Model (TypeScript)

```typescript
interface ArchitectureModel {
  id: string
  name: string
  version: string

  specification: Specification
  model: Model
  views: View[]
}

interface Specification {
  elements: Record<string, ElementKind>
  relationships: Record<string, RelationshipKind>
  tags: string[]
  dataClasses: string[]
}

interface Model {
  actors: Actor[]
  boundaries: TrustBoundary[]
  elements: Element[]
  relationships: Relationship[]
}

interface Element {
  id: string
  kind: string              // actor | external | system | service | datastore | component
  name: string
  description?: string
  technology?: string       // namespaced: aws:rds:postgresql, tech:nodejs
  boundary?: string         // which trust boundary
  tags: string[]            // #pii, #public, #encrypted_at_rest
  parent?: string           // for nesting (e.g., component inside service)
  children?: Element[]
}

interface TrustBoundary {
  id: string
  name: string
  level: 'untrusted' | 'semi-trusted' | 'trusted' | 'restricted'
  parent?: string           // for nested boundaries
}

interface Relationship {
  id: string
  kind?: string             // calls | stores | reads | publishes | subscribes
  source: string
  target: string
  label?: string
  protocol?: string
  data?: string[]           // data classifications flowing
  tags: string[]            // #encrypted_in_transit, etc.
  crossesBoundaries?: string[]
}

interface View {
  id: string
  title: string
  scope?: string            // element to scope to (e.g., "platform.api")
  includes: string[]        // predicates for what to include
  excludes?: string[]       // predicates for what to exclude
  styles?: ViewStyle[]      // style overrides
}
```

---

## Next Steps

1. Define formal DSL grammar (syntax rules)
2. Build parser (DSL text → TypeScript model)
3. Build serializer (TypeScript model → DSL text)
4. Integrate with LikeC4 Builder API for diagram rendering
5. Connect technology references to existing registry
6. Feed parsed model to existing threat analysis system
7. Build editor with autocomplete for technologies
