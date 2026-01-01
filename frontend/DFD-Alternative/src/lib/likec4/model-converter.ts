/**
 * Converts our ArchitectureModel to LikeC4 model data structures
 * This allows us to use the LikeC4 diagram components for rendering
 */
import type { ArchitectureModel, Element, View } from '../../types/model'

// LikeC4 core types - we construct the data manually
// Using 'any' for complex internal types since we're building raw data
type Fqn = string
type ViewId = string
type RelationId = string
type ElementKind = string
type Tag = string

interface LikeC4Element {
  id: Fqn
  kind: ElementKind
  title: string
  description?: string
  technology?: string
  tags?: Tag[]
  links?: Array<{ url: string; title?: string }>
  style?: {
    shape?: string
    color?: string
    icon?: string
  }
}

interface LikeC4Relation {
  id: RelationId
  source: Fqn
  target: Fqn
  title?: string
  description?: string
  technology?: string
  tags?: Tag[]
}

interface LikeC4ViewRule {
  include?: Array<{ expr: string }>
  exclude?: Array<{ expr: string }>
  style?: Record<string, unknown>
}

interface LikeC4View {
  id: ViewId
  title?: string
  description?: string
  viewOf?: Fqn
  rules: LikeC4ViewRule[]
  autoLayout?: {
    direction: 'TB' | 'BT' | 'LR' | 'RL'
  }
}

interface LikeC4Specification {
  elements: Record<string, { style?: { shape?: string; color?: string } }>
  relationships: Record<string, Record<string, unknown>>
  tags: Record<string, { color?: string }>
}

interface LikeC4ModelData {
  specification: LikeC4Specification
  elements: Record<Fqn, LikeC4Element>
  relations: Record<RelationId, LikeC4Relation>
  views: Record<ViewId, LikeC4View>
}

// Map our element kinds to LikeC4 shapes
const KIND_TO_SHAPE: Record<string, string> = {
  actor: 'person',
  external: 'rectangle',
  system: 'rectangle',
  service: 'rectangle',
  datastore: 'storage',
  component: 'rectangle',
  trustBoundary: 'rectangle',
}

// Map our element kinds to LikeC4 colors
const KIND_TO_COLOR: Record<string, string> = {
  actor: 'blue',
  external: 'gray',
  system: 'indigo',
  service: 'green',
  datastore: 'amber',
  component: 'purple',
  trustBoundary: 'red',
}

/**
 * Convert our ArchitectureModel to LikeC4 model data
 */
export function convertToLikeC4Model(model: ArchitectureModel): LikeC4ModelData {
  const elements: Record<Fqn, LikeC4Element> = {}
  const relations: Record<RelationId, LikeC4Relation> = {}
  const views: Record<ViewId, LikeC4View> = {}

  // Build specification from model's specification block
  const specification: LikeC4Specification = {
    elements: {},
    relationships: {},
    tags: {},
  }

  // Add element kinds from specification
  for (const [kindName] of Object.entries(model.specification.elements)) {
    specification.elements[kindName] = {
      style: {
        shape: KIND_TO_SHAPE[kindName] || 'rectangle',
        color: KIND_TO_COLOR[kindName] || 'gray',
      },
    }
  }

  // Add relationship kinds from specification
  for (const [relName] of Object.entries(model.specification.relationships)) {
    specification.relationships[relName] = {}
  }

  // Add tags from specification
  for (const tag of model.specification.tags) {
    specification.tags[tag] = {
      color: 'gray',
    }
  }

  // Helper to process elements recursively
  function processElement(el: Element, parentFqn?: string) {
    const fqn = parentFqn ? `${parentFqn}.${el.id}` : el.id

    elements[fqn] = {
      id: fqn,
      kind: el.kind,
      title: el.name,
      description: el.description,
      technology: el.technology,
      tags: el.tags.map((t) => t.replace('#', '')),
      style: {
        shape: KIND_TO_SHAPE[el.kind] || 'rectangle',
        color: KIND_TO_COLOR[el.kind] || 'gray',
      },
    }

    // Process children
    if (el.children) {
      for (const child of el.children) {
        processElement(child, fqn)
      }
    }
  }

  // Process all elements
  for (const el of model.model.elements) {
    processElement(el)
  }

  // Process relationships
  model.model.relationships.forEach((rel, idx) => {
    const id = rel.id || `rel-${idx}`
    relations[id] = {
      id,
      source: rel.source,
      target: rel.target,
      title: rel.label,
      technology: rel.protocol,
      tags: rel.tags.map((t) => t.replace('#', '')),
    }
  })

  // Process views
  for (const view of model.views) {
    views[view.id] = convertView(view)
  }

  return {
    specification,
    elements,
    relations,
    views,
  }
}

function convertView(view: View): LikeC4View {
  const rules: LikeC4ViewRule[] = []

  // Convert includes to rules
  if (view.includes.length > 0) {
    rules.push({
      include: view.includes.map((inc) => ({ expr: inc })),
    })
  }

  // Convert excludes to rules
  if (view.excludes && view.excludes.length > 0) {
    rules.push({
      exclude: view.excludes.map((exc) => ({ expr: exc })),
    })
  }

  return {
    id: view.id,
    title: view.title,
    viewOf: view.scope,
    rules,
    autoLayout: {
      direction: 'TB',
    },
  }
}

/**
 * Get element IDs visible in a view
 */
export function getVisibleElements(
  model: LikeC4ModelData,
  viewId: string
): Set<string> {
  const view = model.views[viewId]
  if (!view) return new Set(Object.keys(model.elements))

  const visible = new Set<string>()

  for (const rule of view.rules) {
    if (rule.include) {
      for (const inc of rule.include) {
        const expr = inc.expr

        if (expr === '*') {
          // Include all elements
          Object.keys(model.elements).forEach((id) => visible.add(id))
        } else if (expr.endsWith('.*')) {
          // Include direct children
          const parent = expr.slice(0, -2)
          Object.keys(model.elements).forEach((id) => {
            if (id.startsWith(`${parent}.`) && !id.slice(parent.length + 1).includes('.')) {
              visible.add(id)
            }
          })
        } else if (expr.endsWith('.**')) {
          // Include all descendants
          const parent = expr.slice(0, -3)
          Object.keys(model.elements).forEach((id) => {
            if (id.startsWith(`${parent}.`)) {
              visible.add(id)
            }
          })
        } else {
          // Include specific element
          if (model.elements[expr]) {
            visible.add(expr)
          }
        }
      }
    }
  }

  // Apply excludes
  for (const rule of view.rules) {
    if (rule.exclude) {
      for (const exc of rule.exclude) {
        visible.delete(exc.expr)
      }
    }
  }

  return visible
}

/**
 * Get relationships visible in a view
 */
export function getVisibleRelationships(
  model: LikeC4ModelData,
  visibleElements: Set<string>
): LikeC4Relation[] {
  return Object.values(model.relations).filter(
    (rel) => visibleElements.has(rel.source) && visibleElements.has(rel.target)
  )
}
