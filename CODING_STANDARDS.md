# Coding Standards

Quick reference for naming conventions across the codebase.

## Naming Conventions by Layer

| Context | Convention | Example |
|---------|------------|---------|
| **Python variables/functions** | `snake_case` | `threat_model`, `get_user_by_id()` |
| **Python classes** | `PascalCase` | `ThreatLibrary`, `ComponentInstance` |
| **Django model fields** | `snake_case` | `created_at`, `source_pack` |
| **Django TextChoices values** | `camelCase` | `'inProgress'`, `'pendingReview'` |
| **TypeScript variables/functions** | `camelCase` | `threatModel`, `getUserById()` |
| **TypeScript types/interfaces** | `PascalCase` | `ThreatModel`, `DashboardStats` |
| **TypeScript interface fields** | `camelCase` | `createdAt`, `sourcePack` |
| **React components** | `PascalCase` | `NodeEditPanel`, `ThreatAnalysisView` |
| **API URL paths** | `kebab-case` | `/api/threat-models/`, `/api/data-flows/` |
| **API query parameters** | `snake_case` | `?pack_type=technology&source_pack=1` |

## Files and Directories

| Type | Convention | Example |
|------|------------|---------|
| Python modules | `snake_case` | `threat_models.py`, `seed_registries.py` |
| React components | `PascalCase` | `NodeEditPanel.tsx`, `ThreatAnalysisView.tsx` |
| Directories | `kebab-case` | `dfd-editor/`, `threat-analysis/` |
| Type definition files | `camelCase` or `kebab-case` | `diagram.ts`, `threat-analysis.ts` |

## API Transformation (Automatic)

This project uses `djangorestframework-camel-case` for automatic case conversion at the API boundary:

```
┌─────────────────┐     Middleware      ┌─────────────────┐
│  Django/Python  │ ←────────────────→  │  React/TypeScript│
│   snake_case    │   auto-converts     │    camelCase     │
└─────────────────┘                     └─────────────────┘
```

**What this means:**
- Python code uses `snake_case` for all variables, fields, and dict keys
- TypeScript code uses `camelCase` for all properties
- The middleware handles conversion automatically - **never manually convert**

### Example: API Request/Response

```python
# Backend serializer (Python - snake_case)
class ThreatModelSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField()
    source_pack = serializers.PrimaryKeyRelatedField()
    workspace_data = serializers.JSONField()
```

```typescript
// Frontend type (TypeScript - camelCase)
interface ThreatModel {
  id: string
  name: string
  createdAt: string       // auto-converted from created_at
  sourcePack: number      // auto-converted from source_pack
  workspaceData: object   // auto-converted from workspace_data
}
```

### What Gets Converted (and What Doesn't)

| Data Type | Converted? | Example |
|-----------|------------|---------|
| JSON response body keys | Yes | `created_at` → `createdAt` |
| JSON request body keys | Yes | `sourcePack` → `source_pack` |
| URL paths | No | `/threat-models/` stays as-is |
| Query parameters | No | `?pack_type=x` stays as-is |
| Enum/choice values | No | `'inProgress'` stored as-is |

## Database Enum Values (TextChoices)

Store enum values in `camelCase` so they match frontend expectations without transformation:

```python
# Backend model (Python)
class ThreatModel(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        IN_PROGRESS = 'inProgress', 'In Progress'      # camelCase value
        PENDING_REVIEW = 'pendingReview', 'Pending Review'
        APPROVED = 'approved', 'Approved'
```

```typescript
// Frontend type (TypeScript) - values match exactly
type ThreatModelStatus = 'draft' | 'inProgress' | 'pendingReview' | 'approved'
```

**Why?** Enum values are data, not keys. The middleware only converts keys, so enum values pass through unchanged. Storing them in camelCase means `what's in DB = what's in React props`.

## Shared Types (Single Source of Truth)

Domain types shared between features should be defined in `frontend/src/types/domain.ts`:

```typescript
// frontend/src/types/domain.ts
export type STRIDECategory =
  | 'spoofing'
  | 'tampering'
  | 'repudiation'
  | 'informationDisclosure'
  | 'denialOfService'
  | 'elevationOfPrivilege'

export type ThreatModelStatus = 'draft' | 'inProgress' | 'pendingReview' | 'approved'
export type TrustLevel = 'internet' | 'trustedPartner' | 'privateSecured' | 'internal'
```

Import from `domain.ts` rather than redefining:

```typescript
// Good
import type { STRIDECategory } from '@/types/domain'

// Bad - creates duplicate that can drift
type STRIDECategory = 'spoofing' | 'tampering' | ...
```

## Quick Rules

1. **Python code**: Always `snake_case` for variables, functions, and dict keys
2. **TypeScript code**: Always `camelCase` for variables, functions, and interface fields
3. **Database enums**: Store `camelCase` values (e.g., `'inProgress'` not `'in_progress'`)
4. **API URLs**: Always `kebab-case` for paths
5. **Query params**: Keep `snake_case` (backend convention, not auto-converted)
6. **Never manually convert**: The middleware handles all JSON key conversion
7. **Shared types**: Define once in `domain.ts`, import everywhere

## Common Mistakes to Avoid

```typescript
// WRONG: Using snake_case in TypeScript
interface ThreatModel {
  created_at: string      // Should be: createdAt
  source_pack: number     // Should be: sourcePack
}

// WRONG: Manually converting in API calls
const response = await api.get('/threat-models/')
const data = convertKeysToCamelCase(response)  // Unnecessary! Middleware does this

// WRONG: Snake_case enum values in frontend
type Status = 'in_progress' | 'pending_review'  // Should be: 'inProgress' | 'pendingReview'

// WRONG: camelCase in Python dict keys
validated_data["workspaceData"] = {}  # Should be: validated_data["workspace_data"] = {}
```
