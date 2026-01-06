/**
 * Converts our ArchitectureModel to a LikeC4 layouted model
 * for rendering with LikeC4View
 */
import { Builder } from '@likec4/core/builder'
import { layoutLikeC4Model } from '@likec4/layouts'
import type { ArchitectureModel, Element } from '../../types/model'

// Map our element kinds to LikeC4 shapes
const KIND_TO_SHAPE: Record<string, string> = {
  actor: 'person',
  external: 'rectangle',
  system: 'rectangle',
  service: 'rectangle',
  datastore: 'storage',
  component: 'rectangle',
  trustBoundary: 'rectangle',
  boundary: 'rectangle',
  process: 'rectangle',
  store: 'storage',
}

// Map our element kinds to LikeC4 colors
const KIND_TO_COLOR: Record<string, string> = {
  actor: 'blue',
  external: 'slate',
  system: 'indigo',
  service: 'green',
  datastore: 'amber',
  component: 'violet',
  trustBoundary: 'red',
  boundary: 'red',
  process: 'indigo',
  store: 'amber',
}

/**
 * Convert ArchitectureModel to LikeC4 layouted model
 */
export async function architectureToLikeC4(model: ArchitectureModel): Promise<any> {
  // Build specification from model
  const elementKinds: Record<string, any> = {}
  const relationshipKinds: Record<string, any> = {}
  const tags: string[] = []

  // Add element kinds
  for (const kindName of Object.keys(model.specification.elements)) {
    elementKinds[kindName] = {
      style: {
        shape: KIND_TO_SHAPE[kindName] || 'rectangle',
        color: KIND_TO_COLOR[kindName] || 'slate',
      },
    }
  }

  // Add default kinds if not present
  if (Object.keys(elementKinds).length === 0) {
    elementKinds.actor = { style: { shape: 'person', color: 'blue' } }
    elementKinds.system = { style: { shape: 'rectangle', color: 'indigo' } }
    elementKinds.service = { style: { shape: 'rectangle', color: 'green' } }
    elementKinds.datastore = { style: { shape: 'storage', color: 'amber' } }
    elementKinds.component = { style: { shape: 'rectangle', color: 'violet' } }
    elementKinds.external = { style: { shape: 'rectangle', color: 'slate' } }
  }

  // Add relationship kinds
  for (const relName of Object.keys(model.specification.relationships)) {
    relationshipKinds[relName] = {}
  }

  // Add default relationship if not present
  if (Object.keys(relationshipKinds).length === 0) {
    relationshipKinds.uses = {}
  }

  // Collect tags
  for (const tag of model.specification.tags) {
    tags.push(tag.replace('#', ''))
  }

  // Start building the model
  let builder = Builder.specification({
    elements: elementKinds,
    relationships: relationshipKinds,
    tags: tags.length > 0 ? tags : undefined,
  } as any)

  // Build model with elements and relationships
  builder = builder.model((helpers: any, _: any) => {
    const operations: any[] = []

    // Process top-level elements
    for (const element of model.model.elements) {
      const op = buildElement(element, helpers, model)
      if (op) operations.push(op)
    }

    // Process relationships (top-level only, not nested in elements)
    for (const rel of model.model.relationships) {
      const relOp = helpers.rel(rel.source, rel.target, rel.label || '')
      operations.push(relOp)
    }

    return _(...operations)
  })

  // Build views
  builder = builder.views((helpers: any, _: any) => {
    const viewOps: any[] = []

    for (const view of model.views) {
      // Build include predicates
      const includeOps: any[] = []
      for (const inc of view.includes) {
        includeOps.push(helpers.$include(inc))
      }

      // Build exclude predicates
      if (view.excludes) {
        for (const exc of view.excludes) {
          includeOps.push(helpers.$exclude(exc))
        }
      }

      const viewOp = helpers.view(view.id, view.title || view.id)
      if (includeOps.length > 0) {
        viewOps.push(viewOp.with(...includeOps))
      } else {
        // Default to include all
        viewOps.push(viewOp.with(helpers.$include('*')))
      }
    }

    // Add a default view if none defined
    if (viewOps.length === 0) {
      viewOps.push(
        helpers.view('default', 'Default View').with(helpers.$include('*'))
      )
    }

    return _(...viewOps)
  })

  // Get computed model
  const computedModel = builder.toLikeC4Model()

  // Layout the model using GraphViz WASM
  const layoutedModel = await layoutLikeC4Model(computedModel)

  return layoutedModel
}

/**
 * Get the local ID from a qualified ID (e.g., "parent.child" -> "child")
 */
function getLocalId(qualifiedId: string): string {
  const parts = qualifiedId.split('.')
  return parts[parts.length - 1]
}

/**
 * Build a single element with its children
 */
function buildElement(
  element: Element,
  helpers: any,
  model: ArchitectureModel
): any {
  // Get the element builder function for this kind
  const kindBuilder = helpers[element.kind]
  if (!kindBuilder) {
    console.warn(`Unknown element kind: ${element.kind}, using 'component'`)
    // Use local ID for LikeC4 Builder (it builds hierarchy from nesting)
    return helpers.component(getLocalId(element.id), element.name)
  }

  // Use local ID for LikeC4 Builder - the hierarchy is built from nesting, not from dots in IDs
  const localId = getLocalId(element.id)
  let elementOp = kindBuilder(localId, element.name)

  // If element has children or relationships, use .with()
  const childOps: any[] = []

  // Add child elements
  if (element.children && element.children.length > 0) {
    for (const child of element.children) {
      const childOp = buildElement(child, helpers, model)
      if (childOp) childOps.push(childOp)
    }
  }

  // Add relationships that originate from this element
  // (These are typically defined inline in nested elements)

  if (childOps.length > 0) {
    elementOp = elementOp.with(...childOps)
  }

  return elementOp
}

/**
 * Get the default view ID from a model
 */
export function getDefaultViewId(model: ArchitectureModel): string {
  if (model.views.length > 0) {
    return model.views[0].id
  }
  return 'default'
}
