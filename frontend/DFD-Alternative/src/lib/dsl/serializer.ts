/**
 * DSL Serializer
 *
 * Converts an ArchitectureModel back to DSL text.
 * Enables round-trip: DSL -> Model -> DSL
 */

import type {
  ArchitectureModel,
  Specification,
  Model,
  View,
  Element,
  TrustBoundary,
  Relationship,
  ElementStyle,
} from '../../types/model'

// ═══════════════════════════════════════════════════════════════════════════
// SERIALIZER OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface SerializerOptions {
  indent?: string          // Default: '  ' (2 spaces)
  includeComments?: boolean
}

const DEFAULT_OPTIONS: Required<SerializerOptions> = {
  indent: '  ',
  includeComments: true,
}

// ═══════════════════════════════════════════════════════════════════════════
// SERIALIZER CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class Serializer {
  private options: Required<SerializerOptions>
  private output: string[] = []
  private indentLevel: number = 0

  constructor(options: SerializerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  private indent(): string {
    return this.options.indent.repeat(this.indentLevel)
  }

  private line(text: string = ''): void {
    if (text) {
      this.output.push(this.indent() + text)
    } else {
      this.output.push('')
    }
  }

  private divider(title?: string): void {
    if (this.options.includeComments) {
      this.line()
      if (title) {
        this.line('// ' + '═'.repeat(67))
        this.line(`// ${title.toUpperCase()}`)
        this.line('// ' + '═'.repeat(67))
      }
      this.line()
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SERIALIZE
  // ═══════════════════════════════════════════════════════════════════════════

  serialize(model: ArchitectureModel): string {
    this.output = []
    this.indentLevel = 0

    // Specification block
    if (Object.keys(model.specification.elements).length > 0 ||
        Object.keys(model.specification.relationships).length > 0 ||
        model.specification.tags.length > 0 ||
        model.specification.dataClasses.length > 0) {
      this.serializeSpecification(model.specification)
      this.line()
    }

    // Model block
    if (model.model.elements.length > 0 ||
        model.model.boundaries.length > 0 ||
        model.model.relationships.length > 0) {
      this.serializeModel(model.model)
      this.line()
    }

    // Views block
    if (model.views.length > 0) {
      this.serializeViews(model.views)
    }

    return this.output.join('\n')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  private serializeSpecification(spec: Specification): void {
    this.line('specification {')
    this.indentLevel++

    // Element kinds
    if (Object.keys(spec.elements).length > 0) {
      this.divider('Element Kinds')
      for (const [kind, def] of Object.entries(spec.elements)) {
        this.serializeElementKind(kind, def)
      }
    }

    // Relationship kinds
    if (Object.keys(spec.relationships).length > 0) {
      this.divider('Relationship Kinds')
      for (const [kind] of Object.entries(spec.relationships)) {
        this.line(`relationship ${kind} { }`)
      }
    }

    // Tags
    if (spec.tags.length > 0) {
      this.divider('Security Tags')
      for (const tag of spec.tags) {
        this.line(`tag ${tag}`)
      }
    }

    // Data classes
    if (spec.dataClasses.length > 0) {
      this.divider('Data Classifications')
      for (const dataClass of spec.dataClasses) {
        this.line(`dataClass ${dataClass}`)
      }
    }

    this.indentLevel--
    this.line('}')
  }

  private serializeElementKind(kind: string, def: { notation?: string; style?: ElementStyle }): void {
    this.line(`element ${kind} {`)
    this.indentLevel++

    if (def.notation) {
      this.line(`notation "${def.notation}"`)
    }

    if (def.style) {
      this.serializeStyle(def.style)
    }

    this.indentLevel--
    this.line('}')
    this.line()
  }

  private serializeStyle(style: ElementStyle): void {
    this.line('style {')
    this.indentLevel++

    if (style.shape) {
      this.line(`shape ${style.shape}`)
    }
    if (style.color) {
      this.line(`color ${style.color}`)
    }
    if (style.border) {
      this.line(`border ${style.border}`)
    }
    if (style.opacity !== undefined) {
      this.line(`opacity ${style.opacity}%`)
    }

    this.indentLevel--
    this.line('}')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL
  // ═══════════════════════════════════════════════════════════════════════════

  private serializeModel(model: Model): void {
    this.line('model {')
    this.indentLevel++

    // Trust boundaries
    if (model.boundaries.length > 0) {
      this.divider('Trust Boundaries')
      for (const boundary of model.boundaries) {
        this.serializeBoundary(boundary)
      }
    }

    // Elements (grouped by parent)
    const topLevelElements = model.elements.filter(e => !e.parent)
    if (topLevelElements.length > 0) {
      this.divider('Architecture')
      for (const element of topLevelElements) {
        this.serializeElement(element)
      }
    }

    // Relationships
    if (model.relationships.length > 0) {
      this.divider('Relationships')
      for (const rel of model.relationships) {
        this.serializeRelationship(rel)
      }
    }

    this.indentLevel--
    this.line('}')
  }

  private serializeBoundary(boundary: TrustBoundary): void {
    this.line(`${boundary.id} = trustBoundary "${boundary.name}" {`)
    this.indentLevel++

    this.line(`level ${boundary.level}`)
    if (boundary.parent) {
      this.line(`parent ${boundary.parent}`)
    }

    this.indentLevel--
    this.line('}')
    this.line()
  }

  private serializeElement(element: Element): void {
    const header = `${element.id} = ${element.kind} "${element.name}"`

    // Simple element without body
    if (!element.description &&
        !element.technology &&
        !element.boundary &&
        element.tags.length === 0 &&
        !element.children?.length &&
        !element.style) {
      this.line(header)
      return
    }

    this.line(`${header} {`)
    this.indentLevel++

    if (element.description) {
      this.line(`description "${element.description}"`)
    }

    if (element.technology) {
      this.line(`technology ${element.technology}`)
    }

    if (element.boundary) {
      this.line(`boundary ${element.boundary}`)
    }

    for (const tag of element.tags) {
      this.line(tag)
    }

    if (element.style) {
      this.line()
      this.serializeStyle(element.style)
    }

    // Nested children
    if (element.children && element.children.length > 0) {
      this.line()
      for (const child of element.children) {
        this.serializeElement(child)
      }
    }

    this.indentLevel--
    this.line('}')
    this.line()
  }

  private serializeRelationship(rel: Relationship): void {
    let header = `${rel.source} -> ${rel.target}`
    if (rel.label) {
      header += ` "${rel.label}"`
    }

    // Simple relationship without body
    if (!rel.protocol &&
        !rel.data?.length &&
        !rel.crossesBoundaries?.length &&
        rel.tags.length === 0) {
      this.line(header)
      return
    }

    this.line(`${header} {`)
    this.indentLevel++

    if (rel.protocol) {
      this.line(`protocol ${rel.protocol}`)
    }

    if (rel.data && rel.data.length > 0) {
      this.line(`data [${rel.data.join(', ')}]`)
    }

    for (const tag of rel.tags) {
      this.line(tag)
    }

    if (rel.crossesBoundaries && rel.crossesBoundaries.length > 0) {
      this.line(`crosses [${rel.crossesBoundaries.join(', ')}]`)
    }

    this.indentLevel--
    this.line('}')
    this.line()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEWS
  // ═══════════════════════════════════════════════════════════════════════════

  private serializeViews(views: View[]): void {
    this.line('views {')
    this.indentLevel++

    for (const view of views) {
      this.serializeView(view)
    }

    this.indentLevel--
    this.line('}')
  }

  private serializeView(view: View): void {
    let header = `view ${view.id}`
    if (view.scope) {
      header += ` of ${view.scope}`
    }

    this.line(`${header} {`)
    this.indentLevel++

    if (view.title && view.title !== view.id) {
      this.line(`title "${view.title}"`)
    }

    if (view.includes.length > 0) {
      this.line('include')
      this.indentLevel++
      for (const include of view.includes) {
        this.line(`${include},`)
      }
      this.indentLevel--
    }

    if (view.excludes && view.excludes.length > 0) {
      this.line('exclude')
      this.indentLevel++
      for (const exclude of view.excludes) {
        this.line(`${exclude},`)
      }
      this.indentLevel--
    }

    if (view.styles && view.styles.length > 0) {
      this.line()
      for (const vs of view.styles) {
        this.line(`style ${vs.selector} {`)
        this.indentLevel++
        if (vs.style.color) this.line(`color ${vs.style.color}`)
        if (vs.style.opacity !== undefined) this.line(`opacity ${vs.style.opacity}%`)
        this.indentLevel--
        this.line('}')
      }
    }

    this.indentLevel--
    this.line('}')
    this.line()
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SERIALIZE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Serialize an ArchitectureModel to DSL text
 */
export function serialize(model: ArchitectureModel, options?: SerializerOptions): string {
  const serializer = new Serializer(options)
  return serializer.serialize(model)
}

/**
 * Serialize with minimal formatting (no comments)
 */
export function serializeMinimal(model: ArchitectureModel): string {
  return serialize(model, { includeComments: false })
}
