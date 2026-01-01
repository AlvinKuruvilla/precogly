/**
 * Architecture Model Types
 * Based on SPECS.md - extends LikeC4 DSL for threat modeling
 */

// ═══════════════════════════════════════════════════════════════════════════
// ELEMENT KINDS
// ═══════════════════════════════════════════════════════════════════════════

export type ElementKind =
  | 'actor'
  | 'external'
  | 'system'
  | 'service'
  | 'datastore'
  | 'component'
  | 'trustBoundary'

// ═══════════════════════════════════════════════════════════════════════════
// RELATIONSHIP KINDS
// ═══════════════════════════════════════════════════════════════════════════

export type RelationshipKind =
  | 'calls'
  | 'stores'
  | 'reads'
  | 'publishes'
  | 'subscribes'
  | 'authenticates'

// ═══════════════════════════════════════════════════════════════════════════
// TRUST LEVELS
// ═══════════════════════════════════════════════════════════════════════════

export type TrustLevel =
  | 'untrusted'
  | 'semi-trusted'
  | 'trusted'
  | 'restricted'

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY TAGS
// ═══════════════════════════════════════════════════════════════════════════

export type SecurityTag =
  | 'pii'
  | 'pci'
  | 'phi'
  | 'public'
  | 'internal'
  | 'privileged'
  | 'encrypted_at_rest'
  | 'encrypted_in_transit'
  | 'mfa'

// ═══════════════════════════════════════════════════════════════════════════
// DATA CLASSIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

export type DataClass =
  | 'credentials'
  | 'userdata'
  | 'financial'
  | 'session'
  | 'audit'

// ═══════════════════════════════════════════════════════════════════════════
// STYLE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export type ElementShape =
  | 'rectangle'
  | 'person'
  | 'storage'
  | 'browser'
  | 'mobile'
  | 'cylinder'
  | 'queue'

export type BorderStyle = 'solid' | 'dashed' | 'dotted'

export type Color =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'red'
  | 'amber'
  | 'green'
  | 'blue'

export interface ElementStyle {
  shape?: ElementShape
  color?: Color
  border?: BorderStyle
  opacity?: number // 0-100
}

// ═══════════════════════════════════════════════════════════════════════════
// ELEMENT KIND DEFINITION (for specification block)
// ═══════════════════════════════════════════════════════════════════════════

export interface ElementKindDefinition {
  kind: ElementKind
  notation?: string
  style?: ElementStyle
}

// ═══════════════════════════════════════════════════════════════════════════
// RELATIONSHIP KIND DEFINITION (for specification block)
// ═══════════════════════════════════════════════════════════════════════════

export interface RelationshipKindDefinition {
  kind: RelationshipKind
  notation?: string
  style?: {
    color?: Color
    line?: 'solid' | 'dashed'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SPECIFICATION
// ═══════════════════════════════════════════════════════════════════════════

export interface Specification {
  elements: Record<string, ElementKindDefinition>
  relationships: Record<string, RelationshipKindDefinition>
  tags: string[]
  dataClasses: string[]
}

// ═══════════════════════════════════════════════════════════════════════════
// TRUST BOUNDARY
// ═══════════════════════════════════════════════════════════════════════════

export interface TrustBoundary {
  id: string
  name: string
  level: TrustLevel
  parent?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// ELEMENT
// ═══════════════════════════════════════════════════════════════════════════

export interface Element {
  id: string
  kind: ElementKind
  name: string
  description?: string
  technology?: string      // namespaced: aws:rds:postgresql, tech:nodejs
  boundary?: string        // which trust boundary this element is in
  tags: string[]           // security tags like #pii, #public
  parent?: string          // for nesting (e.g., component inside service)
  children?: Element[]
  style?: ElementStyle     // optional style overrides
}

// ═══════════════════════════════════════════════════════════════════════════
// RELATIONSHIP
// ═══════════════════════════════════════════════════════════════════════════

export interface Relationship {
  id: string
  kind?: RelationshipKind
  source: string
  target: string
  label?: string
  protocol?: string
  data?: DataClass[]       // data classifications flowing through
  tags: string[]           // security tags like #encrypted_in_transit
  crossesBoundaries?: string[]
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL
// ═══════════════════════════════════════════════════════════════════════════

export interface Model {
  boundaries: TrustBoundary[]
  elements: Element[]
  relationships: Relationship[]
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW
// ═══════════════════════════════════════════════════════════════════════════

export interface ViewStyle {
  selector: string         // element ID, tag, or predicate
  style: ElementStyle
}

export interface View {
  id: string
  title: string
  scope?: string           // element to scope to (e.g., "platform.api")
  includes: string[]       // predicates for what to include
  excludes?: string[]      // predicates for what to exclude
  styles?: ViewStyle[]     // style overrides for this view
}

// ═══════════════════════════════════════════════════════════════════════════
// ARCHITECTURE MODEL (top-level)
// ═══════════════════════════════════════════════════════════════════════════

export interface ArchitectureModel {
  id: string
  name: string
  version: string
  specification: Specification
  model: Model
  views: View[]
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function createEmptyModel(): ArchitectureModel {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled Model',
    version: '1.0.0',
    specification: {
      elements: {},
      relationships: {},
      tags: [],
      dataClasses: [],
    },
    model: {
      boundaries: [],
      elements: [],
      relationships: [],
    },
    views: [],
  }
}

export function findElementById(model: Model, id: string): Element | undefined {
  // Recursive search through elements and their children
  function search(elements: Element[]): Element | undefined {
    for (const element of elements) {
      if (element.id === id) return element
      if (element.children) {
        const found = search(element.children)
        if (found) return found
      }
    }
    return undefined
  }
  return search(model.elements)
}

export function findBoundaryById(model: Model, id: string): TrustBoundary | undefined {
  return model.boundaries.find(b => b.id === id)
}

export function getElementsInBoundary(model: Model, boundaryId: string): Element[] {
  function collect(elements: Element[]): Element[] {
    const result: Element[] = []
    for (const element of elements) {
      if (element.boundary === boundaryId) {
        result.push(element)
      }
      if (element.children) {
        result.push(...collect(element.children))
      }
    }
    return result
  }
  return collect(model.elements)
}
