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
    const kind = this.expectIdentifier('Expected element kind name') as ElementKind
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
      const prop = this.expectIdentifier('Expected style property')
      switch (prop) {
        case 'shape':
          style.shape = this.expectIdentifier('Expected shape value') as ElementStyle['shape']
          break
        case 'color':
          style.color = this.expectIdentifier('Expected color value') as ElementStyle['color']
          break
        case 'border':
          style.border = this.expectIdentifier('Expected border value') as ElementStyle['border']
          break
        case 'opacity':
          const numToken = this.expect('NUMBER', 'Expected opacity value')
          style.opacity = parseInt(numToken.value)
          break
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

    const model: Model = {
      boundaries: [],
      elements: [],
      relationships: [],
    }

    while (!this.check('RBRACE') && !this.check('EOF')) {
      // Check for relationship: identifier -> identifier
      if (this.check('IDENTIFIER') && this.peek(1).type === 'ARROW') {
        model.relationships.push(this.parseRelationship())
      }
      // Check for element assignment: identifier = kind "Name" { ... }
      else if (this.check('IDENTIFIER') && this.peek(1).type === 'EQUALS') {
        const element = this.parseElementAssignment()
        if (element.kind === 'trustBoundary') {
          model.boundaries.push({
            id: element.id,
            name: element.name,
            level: (element as Element & { level?: TrustLevel }).level || 'trusted',
            parent: element.parent,
          })
        } else {
          model.elements.push(element)
        }
      }
      // Otherwise, it might be a standalone element kind
      else if (this.check('IDENTIFIER')) {
        const element = this.parseElementAssignment()
        if (element.kind === 'trustBoundary') {
          model.boundaries.push({
            id: element.id,
            name: element.name,
            level: 'trusted',
            parent: element.parent,
          })
        } else {
          model.elements.push(element)
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

    this.expect('RBRACE', "Expected '}'")
    return model
  }

  private parseElementAssignment(): Element & { level?: TrustLevel } {
    const id = this.expectIdentifier('Expected element identifier')

    // Check for assignment
    if (this.match('EQUALS')) {
      const kind = this.expectIdentifier('Expected element kind') as ElementKind
      const name = this.expectString('Expected element name')
      return this.parseElementBody(id, kind, name)
    }

    // Standalone element (kind is the identifier)
    const kind = id as ElementKind
    const name = this.expectString('Expected element name')
    const elemId = this.generateId(name)
    return this.parseElementBody(elemId, kind, name)
  }

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
      // Check for nested elements
      if (this.check('IDENTIFIER') &&
          (this.peek(1).type === 'EQUALS' || this.peek(1).type === 'STRING')) {
        const child = this.parseElementAssignment()
        child.parent = id
        if (!element.children) element.children = []
        element.children.push(child)
      }
      // Check for properties
      else if (this.check('DESCRIPTION')) {
        this.advance()
        element.description = this.expectString('Expected description')
      }
      else if (this.check('TECHNOLOGY')) {
        this.advance()
        element.technology = this.expectIdentifier('Expected technology identifier')
      }
      else if (this.check('BOUNDARY')) {
        this.advance()
        element.boundary = this.expectIdentifier('Expected boundary identifier')
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
      else {
        // Skip unknown tokens
        this.advance()
      }
    }

    this.expect('RBRACE', "Expected '}'")
    return element
  }

  private parseRelationship(): Relationship {
    const source = this.expectIdentifier('Expected source identifier')
    this.expect('ARROW', "Expected '->'")
    const target = this.expectIdentifier('Expected target identifier')

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
      if (this.check('VIEW')) {
        views.push(this.parseView())
      } else {
        this.advance()
      }
    }

    this.expect('RBRACE', "Expected '}'")
    return views
  }

  private parseView(): View {
    this.expect('VIEW', "Expected 'view'")
    const id = this.expectIdentifier('Expected view identifier')

    const view: View = {
      id,
      title: id,
      includes: [],
    }

    // Check for "of" clause
    if (this.match('OF')) {
      view.scope = this.expectIdentifier('Expected scope identifier')
    }

    this.expect('LBRACE', "Expected '{'")

    while (!this.check('RBRACE') && !this.check('EOF')) {
      if (this.check('TITLE')) {
        this.advance()
        view.title = this.expectString('Expected title')
      }
      else if (this.check('INCLUDE')) {
        this.advance()
        // Parse include predicates (simplified)
        while (!this.check('EXCLUDE') && !this.check('STYLE') &&
               !this.check('RBRACE') && !this.check('EOF')) {
          if (this.check('IDENTIFIER') || this.check('HASH_TAG')) {
            view.includes.push(this.advance().value)
          } else {
            this.advance()
          }
        }
      }
      else if (this.check('EXCLUDE')) {
        this.advance()
        if (!view.excludes) view.excludes = []
        while (!this.check('INCLUDE') && !this.check('STYLE') &&
               !this.check('RBRACE') && !this.check('EOF')) {
          if (this.check('IDENTIFIER') || this.check('HASH_TAG')) {
            view.excludes.push(this.advance().value)
          } else {
            this.advance()
          }
        }
      }
      else if (this.check('STYLE')) {
        // Skip style blocks for now
        this.advance()
        if (this.check('IDENTIFIER')) this.advance()
        if (this.check('LBRACE')) {
          let depth = 1
          this.advance()
          while (depth > 0 && !this.check('EOF')) {
            if (this.check('LBRACE')) depth++
            if (this.check('RBRACE')) depth--
            this.advance()
          }
        }
      }
      else {
        this.advance()
      }
    }

    this.expect('RBRACE', "Expected '}'")
    return view
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
