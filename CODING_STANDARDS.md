# Coding Standards

Quick reference for naming conventions across the codebase.

## Naming Conventions by Layer

| Context | Convention | Example |
|---------|------------|---------|
| **Python variables/functions** | `snake_case` | `threat_model`, `get_user_by_id()` |
| **Python classes** | `PascalCase` | `ThreatLibrary`, `ComponentInstance` |
| **TypeScript variables/functions** | `camelCase` | `threatModel`, `getUserById()` |
| **TypeScript types/interfaces** | `PascalCase` | `ThreatModel`, `DashboardStats` |
| **React components** | `PascalCase` | `NodeEditPanel`, `ThreatAnalysisView` |
| **API URL paths** | `kebab-case` | `/api/threat-models/`, `/api/data-flows/` |
| **Database fields** | `snake_case` | `created_at`, `source_pack` |
| **JSON keys (API responses)** | `snake_case` | `{ "threat_model_id": 1 }` |

## Files and Directories

| Type | Convention | Example |
|------|------------|---------|
| Python modules | `snake_case` | `threat_models.py`, `seed_registries.py` |
| React components | `PascalCase` | `NodeEditPanel.tsx`, `ThreatAnalysisView.tsx` |
| Directories | `kebab-case` | `dfd-editor/`, `threat-analysis/` |
| Type definition files | `camelCase` or `kebab-case` | `diagram.ts`, `threat-analysis.ts` |

## API Boundary (Frontend ↔ Backend)

The frontend receives `snake_case` from the API and uses it directly in types:

```typescript
// Types match API response (snake_case)
interface ThreatModel {
  id: string
  name: string
  created_at: string      // from API
  system_ids: string[]    // from API
}
```

For computed/derived properties in the frontend, use `camelCase`:

```typescript
interface DashboardStats {
  total: number
  inProgress: number      // computed in frontend
  pendingReview: number   // computed in frontend
}
```

## Quick Rules

1. **When in doubt**: Follow the language's convention (Python = `snake_case`, TypeScript = `camelCase`)
2. **API data**: Keep `snake_case` as received from backend
3. **URLs**: Always `kebab-case`
4. **Components**: Always `PascalCase`
5. **Be consistent**: Match existing patterns in the file you're editing
