/**
 * DSL Parser
 *
 * Parses a token stream into an ArchitectureModel.
 * Based on LikeC4-style syntax.
 */

import type { Token, TokenType } from './tokenizer'
import { tokenize } from './tokenizer'
import type {
  ArchitectureModel,
  Specification,
  Model,
  View,
  Element,
  Relationship,
  ElementKind,
  TrustLevel,
  DataClass,
  ElementStyle,
  RelationshipKind,
} from '../../types/model'

// ═══════════════════════════════════════════════════════════════════════════
// PARSE ERROR
// ═══════════════════════════════════════════════════════════════════════════

export class ParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number
  ) {
    super(`${message} at line ${line}, column ${column}`)
    this.name = 'ParseError'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSER CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class Parser {
  private tokens: Token[]
  private pos: number = 0

  constructor(tokens: Token[]) {
    // Filter out comments and newlines for easier parsing
    this.tokens = tokens.filter(
      t => t.type !== 'COMMENT' && t.type !== 'NEWLINE'
    )
  }

  private peek(offset: number = 0): Token {
    const idx = this.pos + offset
    if (idx >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1] // EOF
    }
    return this.tokens[idx]
  }

  private current(): Token {
    return this.peek()
  }

  private advance(): Token {
    const token = this.current()
    if (token.type !== 'EOF') {
      this.pos++
    }
    return token
  }

  private check(type: TokenType): boolean {
    return this.current().type === type
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance()
        return true
      }
    }
    return false
  }

  private expect(type: TokenType, message: string): Token {
    const token = this.current()
    if (token.type !== type) {
      throw new ParseError(message, token.line, token.column)
    }
    return this.advance()
  }

  private expectIdentifier(message: string): string {
    const token = this.expect('IDENTIFIER', message)
    return token.value
  }

  /**
   * Accept an identifier OR a keyword token as a name.
   * This allows users to use words like 'boundary', 'color', 'style' as element kinds or variable names.
   */
  private expectName(message: string): string {
    const token = this.current()
    // Accept IDENTIFIER or any keyword token (they all have string values)
    if (token.type === 'IDENTIFIER' || this.isKeywordToken(token.type)) {
      this.advance()
      return token.value
    }
    throw new ParseError(message, token.line, token.column)
  }

  private isKeywordToken(type: TokenType): boolean {
    const keywords: TokenType[] = [
      'SPECIFICATION', 'MODEL', 'VIEWS', 'VIEW', 'ELEMENT', 'RELATIONSHIP',
      'TAG', 'DATACLASS', 'STYLE', 'NOTATION', 'INCLUDE', 'EXCLUDE',
      'TITLE', 'DESCRIPTION', 'TECHNOLOGY', 'BOUNDARY', 'LEVEL', 'PARENT',
      'PROTOCOL', 'DATA', 'CROSSES', 'OF', 'AUTOLAYOUT', 'WHERE', 'AND',
      'OR', 'IS', 'NOT', 'KIND', 'WITH', 'EXTENDS', 'DYNAMIC', 'PARALLEL',
      'GROUP', 'GLOBAL', 'LINK', 'ICON', 'METADATA', 'SUMMARY', 'COLOR'
    ]
    return keywords.includes(type)
  }

  /**
   * Check if current token could be used as a name (identifier or keyword)
   */
  private isNameToken(): boolean {
    const token = this.current()
    return token.type === 'IDENTIFIER' || this.isKeywordToken(token.type)
  }

  private expectString(message: string): string {
    const token = this.expect('STRING', message)
    return token.value
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOP-LEVEL PARSING
  // ═══════════════════════════════════════════════════════════════════════════

  parse(): ArchitectureModel {
    const model: ArchitectureModel = {
      id: crypto.randomUUID(),
      name: 'Parsed Model',
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

    while (!this.check('EOF')) {
      if (this.check('SPECIFICATION')) {
        model.specification = this.parseSpecification()
      } else if (this.check('MODEL')) {
        model.model = this.parseModel()
      } else if (this.check('VIEWS')) {
        model.views = this.parseViews()
      } else {
        const token = this.current()
        throw new ParseError(
          `Unexpected token '${token.value}'`,
          token.line,
          token.column
        )
      }
    }

    return model
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIFICATION BLOCK
  // ═══════════════════════════════════════════════════════════════════════════

  private parseSpecification(): Specification {
    this.expect('SPECIFICATION', "Expected 'specification'")
    this.expect('LBRACE', "Expected '{'")

    const spec: Specification = {
      elements: {},
      relationships: {},
      tags: [],
      dataClasses: [],
    }

    while (!this.check('RBRACE') && !this.check('EOF')) {
      if (this.check('ELEMENT')) {
        const [kind, def] = this.parseElementKindDef()
        spec.elements[kind] = def
      } else if (this.check('RELATIONSHIP')) {
        const [kind, def] = this.parseRelationshipKindDef()
        spec.relationships[kind] = def
      } else if (this.check('TAG')) {
        spec.tags.push(this.parseTagDef())
      } else if (this.check('DATACLASS')) {
        spec.dataClasses.push(this.parseDataClassDef())
      } else {
        const token = this.current()
        throw new ParseError(
          `Unexpected token in specification '${token.value}'`,
          token.line,
          token.column
        )
      }
    }

    this.expect('RBRACE', "Expected '}'")
    return spec
  }

  private parseElementKindDef(): [string, { kind: ElementKind; notation?: string; style?: ElementStyle }] {
    this.expect('ELEMENT', "Expected 'element'")
    const kind = this.expectName('Expected element kind name') as ElementKind
    this.expect('LBRACE', "Expected '{'")

    const def: { kind: ElementKind; notation?: string; style?: ElementStyle } = { kind }

    while (!this.check('RBRACE') && !this.check('EOF')) {
      if (this.check('NOTATION')) {
        this.advance()
        def.notation = this.expectString('Expected notation string')
      } else if (this.check('STYLE')) {
        def.style = this.parseStyle()
      } else {
        const token = this.current()
        throw new ParseError(
          `Unexpected token in element definition '${token.value}'`,
          token.line,
          token.column
        )
      }
    }

    this.expect('RBRACE', "Expected '}'")
    return [kind, def]
  }

  private parseRelationshipKindDef(): [string, { kind: RelationshipKind }] {
    this.expect('RELATIONSHIP', "Expected 'relationship'")
    const kind = this.expectIdentifier('Expected relationship kind name') as RelationshipKind
    this.expect('LBRACE', "Expected '{'")

    // For now, relationship defs are mostly empty
    while (!this.check('RBRACE') && !this.check('EOF')) {
      this.advance() // skip contents for now
    }

    this.expect('RBRACE', "Expected '}'")
    return [kind, { kind }]
  }

  private parseTagDef(): string {
    this.expect('TAG', "Expected 'tag'")
    const token = this.expect('HASH_TAG', 'Expected tag name starting with #')
    return token.value
  }

  private parseDataClassDef(): string {
    this.expect('DATACLASS', "Expected 'dataClass'")
    return this.expectIdentifier('Expected data class name')
  }

  private parseStyle(): ElementStyle {
    this.expect('STYLE', "Expected 'style'")
    this.expect('LBRACE', "Expected '{'")

    const style: ElementStyle = {}

    while (!this.check('RBRACE') && !this.check('EOF')) {
      // Handle style properties - some may be keywords (like 'color')
      const token = this.current()

      if (token.type === 'IDENTIFIER' && token.value === 'shape') {
        this.advance()
        style.shape = this.expectIdentifier('Expected shape value') as ElementStyle['shape']
      }
      else if (token.type === 'COLOR' || (token.type === 'IDENTIFIER' && token.value === 'color')) {
        this.advance()
        style.color = this.expectIdentifier('Expected color value') as ElementStyle['color']
      }
      else if (token.type === 'IDENTIFIER' && token.value === 'border') {
        this.advance()
        style.border = this.expectIdentifier('Expected border value') as ElementStyle['border']
      }
      else if (token.type === 'IDENTIFIER' && token.value === 'opacity') {
        this.advance()
        const numToken = this.expect('NUMBER', 'Expected opacity value')
        style.opacity = parseInt(numToken.value)
      }
      else {
        throw new ParseError(
          `Unknown style property '${token.value}'`,
          token.line,
          token.column
        )
      }

      // Skip optional comma between properties
      this.match('COMMA')
    }

    this.expect('RBRACE', "Expected '}'")
    return style
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL BLOCK
  // ═══════════════════════════════════════════════════════════════════════════

  private parseModel(): Model {
    this.expect('MODEL', "Expected 'model'")
    this.expect('LBRACE', "Expected '{'")

    // Clear nested relationships from previous parse
    this.nestedRelationships = []

    const model: Model = {
      boundaries: [],
      elements: [],
      relationships: [],
    }

    while (!this.check('RBRACE') && !this.check('EOF')) {
      // Check for relationship with qualified names: cloud.api -> cloud.db 'label'
      if (this.isNameToken() && this.peekForArrow()) {
        const source = this.parseQualifiedNameInModel()
        this.expect('ARROW', "Expected '->'")
        const target = this.parseQualifiedNameInModel()
        model.relationships.push(this.parseRelationshipBody(source, target))
      }
      // Check for element assignment: identifier = kind "Name" { ... }
      else if (this.isNameToken() && this.peek(1).type === 'EQUALS') {
        const element = this.parseElementAssignment()
        // Always add to elements so children are preserved for rendering
        model.elements.push(element)
        // Also track as boundary for trust boundary metadata
        if (element.kind === 'trustBoundary' || element.kind === 'boundary') {
          model.boundaries.push({
            id: element.id,
            name: element.name,
            level: (element as Element & { level?: TrustLevel }).level || 'trusted',
            parent: element.parent,
          })
        }
      }
      // Otherwise, it might be a standalone element kind: kind 'Name' { }
      else if (this.isNameToken()) {
        const element = this.parseElementAssignment()
        // Always add to elements so children are preserved for rendering
        model.elements.push(element)
        // Also track as boundary for trust boundary metadata
        if (element.kind === 'trustBoundary' || element.kind === 'boundary') {
          model.boundaries.push({
            id: element.id,
            name: element.name,
            level: 'trusted',
            parent: element.parent,
          })
        }
      } else {
        const token = this.current()
        throw new ParseError(
          `Unexpected token in model '${token.value}'`,
          token.line,
          token.column
        )
      }
    }

    // Add nested relationships collected during element parsing
    model.relationships.push(...this.nestedRelationships)

    this.expect('RBRACE', "Expected '}'")
    return model
  }

  private parseElementAssignment(): Element & { level?: TrustLevel } {
    const id = this.expectName('Expected element identifier')

    // Check for assignment
    if (this.match('EQUALS')) {
      const kind = this.expectName('Expected element kind') as ElementKind
      const name = this.expectString('Expected element name')
      return this.parseElementBody(id, kind, name)
    }

    // Standalone element (kind is the identifier)
    const kind = id as ElementKind
    const name = this.expectString('Expected element name')
    const elemId = this.generateId(name)
    return this.parseElementBody(elemId, kind, name)
  }

  /**
   * Parse a nested element and generate a qualified ID (parentId.childId)
   */
  private parseNestedElement(parentId: string): Element & { level?: TrustLevel } {
    const localId = this.expectName('Expected element identifier')

    // Check for assignment: localId = kind 'Name' { }
    if (this.match('EQUALS')) {
      const kind = this.expectName('Expected element kind') as ElementKind
      const name = this.expectString('Expected element name')
      const qualifiedId = `${parentId}.${localId}`
      const element = this.parseElementBody(qualifiedId, kind, name)
      element.parent = parentId
      return element
    }

    // Standalone element: kind 'Name' { }
    const kind = localId as ElementKind
    const name = this.expectString('Expected element name')
    const qualifiedId = `${parentId}.${this.generateId(name)}`
    const element = this.parseElementBody(qualifiedId, kind, name)
    element.parent = parentId
    return element
  }

  // Store nested relationships during parsing (will be moved to model.relationships)
  private nestedRelationships: Relationship[] = []

  private parseElementBody(id: string, kind: ElementKind, name: string): Element & { level?: TrustLevel } {
    const element: Element & { level?: TrustLevel } = {
      id,
      kind,
      name,
      tags: [],
    }

    if (!this.check('LBRACE')) {
      return element
    }

    this.expect('LBRACE', "Expected '{'")

    while (!this.check('RBRACE') && !this.check('EOF')) {
      // Check for implicit source relationship: -> target 'label'
      if (this.check('ARROW')) {
        this.advance()
        const target = this.parseQualifiedNameInModel()
        const rel = this.parseRelationshipBody(id, target)
        this.nestedRelationships.push(rel)
      }
      // Check for explicit relationship: source -> target 'label'
      else if (this.isNameToken() && this.peekForArrow()) {
        const source = this.parseQualifiedNameInModel()
        if (this.check('ARROW')) {
          this.advance()
          const target = this.parseQualifiedNameInModel()
          const rel = this.parseRelationshipBody(source, target)
          this.nestedRelationships.push(rel)
        }
      }
      // Check for nested elements with assignment: id = kind 'Name' { }
      else if (this.isNameToken() && this.peek(1).type === 'EQUALS') {
        const child = this.parseNestedElement(id)
        if (!element.children) element.children = []
        element.children.push(child)
      }
      // Check for nested elements without assignment: kind 'Name' { }
      else if (this.isNameToken() && this.peek(1).type === 'STRING') {
        const child = this.parseNestedElement(id)
        if (!element.children) element.children = []
        element.children.push(child)
      }
      // Check for properties
      else if (this.check('DESCRIPTION')) {
        this.advance()
        element.description = this.expectString('Expected description')
      }
      else if (this.check('SUMMARY')) {
        this.advance()
        element.description = this.expectString('Expected summary')
      }
      else if (this.check('TECHNOLOGY')) {
        this.advance()
        element.technology = this.expectName('Expected technology identifier')
      }
      else if (this.check('BOUNDARY')) {
        this.advance()
        element.boundary = this.expectName('Expected boundary identifier')
      }
      else if (this.check('LEVEL')) {
        this.advance()
        element.level = this.expectIdentifier('Expected level') as TrustLevel
      }
      else if (this.check('PARENT')) {
        this.advance()
        element.parent = this.expectIdentifier('Expected parent identifier')
      }
      else if (this.check('STYLE')) {
        element.style = this.parseStyle()
      }
      else if (this.check('HASH_TAG')) {
        const tag = this.advance()
        element.tags.push(tag.value)
      }
      else if (this.check('LINK')) {
        // Skip link directive for now: link <url> [label]
        this.advance()
        if (this.check('LT')) {
          this.advance()
          while (!this.check('GT') && !this.check('EOF') && !this.check('RBRACE')) {
            this.advance()
          }
          if (this.check('GT')) this.advance()
        }
        if (this.check('STRING')) this.advance()
      }
      else if (this.check('ICON')) {
        // Skip icon directive
        this.advance()
        if (this.check('IDENTIFIER') || this.check('STRING')) this.advance()
      }
      else if (this.check('METADATA')) {
        // Skip metadata block
        this.advance()
        if (this.check('LBRACE')) {
          this.skipBraceBlock()
        }
      }
      else {
        // Skip unknown tokens
        this.advance()
      }
    }

    this.expect('RBRACE', "Expected '}'")
    return element
  }

  /**
   * Look ahead to check if there's an arrow after the current identifier chain
   */
  private peekForArrow(): boolean {
    let offset = 1
    // Skip through potential dotted path
    while (this.peek(offset).type === 'DOT' || this.peek(offset).type === 'IDENTIFIER') {
      offset++
    }
    return this.peek(offset).type === 'ARROW'
  }

  /**
   * Parse qualified name in model context (for relationships)
   */
  private parseQualifiedNameInModel(): string {
    let name = ''

    if (this.check('IDENTIFIER')) {
      name = this.advance().value
    }

    while (this.check('DOT')) {
      this.advance()
      if (this.check('IDENTIFIER')) {
        name += '.' + this.advance().value
      } else {
        break
      }
    }

    return name
  }

  /**
   * Parse the body of a relationship (label and optional properties)
   */
  private parseRelationshipBody(source: string, target: string): Relationship {
    const rel: Relationship = {
      id: `${source}->${target}`,
      source,
      target,
      tags: [],
    }

    // Optional label
    if (this.check('STRING')) {
      rel.label = this.advance().value
    }

    // Optional body
    if (this.check('LBRACE')) {
      this.expect('LBRACE', "Expected '{'")

      while (!this.check('RBRACE') && !this.check('EOF')) {
        if (this.check('PROTOCOL')) {
          this.advance()
          rel.protocol = this.expectIdentifier('Expected protocol')
        }
        else if (this.check('DATA')) {
          this.advance()
          rel.data = this.parseDataList()
        }
        else if (this.check('CROSSES')) {
          this.advance()
          rel.crossesBoundaries = this.parseBoundaryList()
        }
        else if (this.check('HASH_TAG')) {
          rel.tags.push(this.advance().value)
        }
        else {
          this.advance()
        }
      }

      this.expect('RBRACE', "Expected '}'")
    }

    return rel
  }

  private parseDataList(): DataClass[] {
    const data: DataClass[] = []
    this.expect('LBRACKET', "Expected '['")

    while (!this.check('RBRACKET') && !this.check('EOF')) {
      data.push(this.expectIdentifier('Expected data class') as DataClass)
      if (!this.check('RBRACKET')) {
        this.match('COMMA')
      }
    }

    this.expect('RBRACKET', "Expected ']'")
    return data
  }

  private parseBoundaryList(): string[] {
    const boundaries: string[] = []
    this.expect('LBRACKET', "Expected '['")

    while (!this.check('RBRACKET') && !this.check('EOF')) {
      boundaries.push(this.expectIdentifier('Expected boundary identifier'))
      if (!this.check('RBRACKET')) {
        this.match('COMMA')
      }
    }

    this.expect('RBRACKET', "Expected ']'")
    return boundaries
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEWS BLOCK
  // ═══════════════════════════════════════════════════════════════════════════

  private parseViews(): View[] {
    this.expect('VIEWS', "Expected 'views'")
    this.expect('LBRACE', "Expected '{'")

    const views: View[] = []

    while (!this.check('RBRACE') && !this.check('EOF')) {
      if (this.check('VIEW') || this.check('DYNAMIC')) {
        views.push(this.parseView())
      } else {
        this.advance()
      }
    }

    this.expect('RBRACE', "Expected '}'")
    return views
  }

  private parseView(): View {
    // Support "dynamic view" syntax - consume token if present
    this.match('DYNAMIC')
    this.expect('VIEW', "Expected 'view'")
    const id = this.expectIdentifier('Expected view identifier')

    const view: View = {
      id,
      title: id,
      includes: [],
    }

    // Check for "of" clause: view of element { }
    if (this.match('OF')) {
      view.scope = this.parseQualifiedName()
    }

    // Check for "extends" clause: view extends other { }
    if (this.match('EXTENDS')) {
      // Store extends info (for now, just parse it)
      this.parseQualifiedName()
    }

    this.expect('LBRACE', "Expected '{'")

    while (!this.check('RBRACE') && !this.check('EOF')) {
      if (this.check('TITLE')) {
        this.advance()
        view.title = this.expectString('Expected title')
      }
      else if (this.check('DESCRIPTION')) {
        this.advance()
        view.description = this.expectString('Expected description')
      }
      else if (this.check('INCLUDE')) {
        this.advance()
        // Parse include predicates
        this.parseIncludePredicates(view)
      }
      else if (this.check('EXCLUDE')) {
        this.advance()
        if (!view.excludes) view.excludes = []
        this.parseExcludePredicates(view)
      }
      else if (this.check('AUTOLAYOUT')) {
        this.advance()
        view.autoLayout = this.parseAutoLayout()
      }
      else if (this.check('STYLE')) {
        // Skip style blocks for now
        this.advance()
        // style may be followed by a predicate like * or identifier
        this.skipStylePredicate()
        if (this.check('LBRACE')) {
          this.skipBraceBlock()
        }
      }
      else if (this.check('GROUP')) {
        // Skip group blocks for now
        this.advance()
        if (this.check('STRING')) this.advance()
        if (this.check('LBRACE')) {
          this.skipBraceBlock()
        }
      }
      else {
        this.advance()
      }
    }

    this.expect('RBRACE', "Expected '}'")
    return view
  }

  /**
   * Parse a qualified name like cloud.backend.api or cloud.*
   */
  private parseQualifiedName(): string {
    let name = ''

    // Handle leading arrow for relationship predicates like "-> element"
    if (this.check('ARROW')) {
      return '->'
    }

    // Handle wildcards
    if (this.check('ASTERISK')) {
      this.advance()
      return '*'
    }

    // Start with identifier
    if (this.check('IDENTIFIER')) {
      name = this.advance().value
    }

    // Continue with dotted parts
    while (this.check('DOT')) {
      this.advance()
      if (this.check('IDENTIFIER')) {
        name += '.' + this.advance().value
      } else if (this.check('ASTERISK')) {
        this.advance()
        name += '.*'
      } else if (this.check('DOUBLE_ASTERISK')) {
        this.advance()
        name += '.**'
      } else if (this.check('UNDERSCORE')) {
        this.advance()
        name += '._'
      } else {
        break
      }
    }

    return name
  }

  /**
   * Parse include predicates like: include *, include cloud.*, include -> api
   */
  private parseIncludePredicates(view: View): void {
    while (!this.isViewKeyword() && !this.check('RBRACE') && !this.check('EOF')) {
      // Handle wildcard: include *
      if (this.check('ASTERISK')) {
        this.advance()
        view.includes.push('*')
        this.match('COMMA')
        continue
      }

      // Handle relationship predicate: include -> element or include element ->
      if (this.check('ARROW')) {
        this.advance()
        const target = this.parseQualifiedName()
        view.includes.push(`-> ${target}`)
        this.match('COMMA')
        continue
      }

      // Handle identifier/qualified name
      if (this.check('IDENTIFIER')) {
        const name = this.parseQualifiedName()

        // Check for relationship arrow after element: include cloud -> backend
        if (this.check('ARROW')) {
          this.advance()
          const target = this.check('ASTERISK') ? (this.advance(), '*') : this.parseQualifiedName()
          view.includes.push(`${name} -> ${target}`)
        } else if (this.check('BIDIRECTIONAL')) {
          this.advance()
          const target = this.check('ASTERISK') ? (this.advance(), '*') : this.parseQualifiedName()
          view.includes.push(`${name} <-> ${target}`)
        } else {
          view.includes.push(name)
        }
        this.match('COMMA')
        continue
      }

      // Handle tags
      if (this.check('HASH_TAG')) {
        view.includes.push(this.advance().value)
        this.match('COMMA')
        continue
      }

      // Handle "where" clause - skip for now
      if (this.check('WHERE')) {
        this.skipWhereClause()
        continue
      }

      // Handle "with" clause - skip for now
      if (this.check('WITH')) {
        this.advance()
        if (this.check('LBRACE')) {
          this.skipBraceBlock()
        }
        continue
      }

      // Skip unknown tokens
      this.advance()
    }
  }

  /**
   * Parse exclude predicates
   */
  private parseExcludePredicates(view: View): void {
    while (!this.isViewKeyword() && !this.check('RBRACE') && !this.check('EOF')) {
      if (this.check('ASTERISK')) {
        this.advance()
        view.excludes!.push('*')
        this.match('COMMA')
        continue
      }

      if (this.check('IDENTIFIER')) {
        const name = this.parseQualifiedName()
        view.excludes!.push(name)
        this.match('COMMA')
        continue
      }

      if (this.check('HASH_TAG')) {
        view.excludes!.push(this.advance().value)
        this.match('COMMA')
        continue
      }

      if (this.check('WHERE')) {
        this.skipWhereClause()
        continue
      }

      this.advance()
    }
  }

  /**
   * Parse autoLayout directive: autoLayout TopBottom 120 110
   */
  private parseAutoLayout(): { direction: string; rankSep?: number; nodeSep?: number } {
    const layout: { direction: string; rankSep?: number; nodeSep?: number } = {
      direction: 'TopBottom'
    }

    // Parse direction
    if (this.check('IDENTIFIER')) {
      layout.direction = this.advance().value
    }

    // Parse optional rank separation
    if (this.check('NUMBER')) {
      layout.rankSep = parseInt(this.advance().value)
    }

    // Parse optional node separation
    if (this.check('NUMBER')) {
      layout.nodeSep = parseInt(this.advance().value)
    }

    return layout
  }

  /**
   * Check if current token is a view-level keyword (ends current predicate list)
   */
  private isViewKeyword(): boolean {
    return this.check('INCLUDE') || this.check('EXCLUDE') ||
           this.check('STYLE') || this.check('AUTOLAYOUT') ||
           this.check('TITLE') || this.check('DESCRIPTION') ||
           this.check('GROUP')
  }

  /**
   * Skip a where clause
   */
  private skipWhereClause(): void {
    this.advance() // skip 'where'
    while (!this.isViewKeyword() && !this.check('RBRACE') && !this.check('EOF') && !this.check('COMMA')) {
      this.advance()
    }
    this.match('COMMA')
  }

  /**
   * Skip a style predicate (like * or element.*)
   */
  private skipStylePredicate(): void {
    if (this.check('ASTERISK')) {
      this.advance()
    } else if (this.check('IDENTIFIER')) {
      this.parseQualifiedName()
    }
  }

  /**
   * Skip a brace-enclosed block
   */
  private skipBraceBlock(): void {
    if (!this.check('LBRACE')) return
    let depth = 1
    this.advance() // consume opening brace
    while (depth > 0 && !this.check('EOF')) {
      if (this.check('LBRACE')) depth++
      if (this.check('RBRACE')) depth--
      this.advance()
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private generateId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse DSL text into an ArchitectureModel
 */
export function parse(input: string): ArchitectureModel {
  const tokens = tokenize(input)
  const parser = new Parser(tokens)
  return parser.parse()
}

/**
 * Try to parse DSL text, returning errors if parsing fails
 */
export function tryParse(input: string): {
  success: boolean
  model?: ArchitectureModel
  error?: ParseError
} {
  try {
    const model = parse(input)
    return { success: true, model }
  } catch (error) {
    if (error instanceof ParseError) {
      return { success: false, error }
    }
    throw error
  }
}
