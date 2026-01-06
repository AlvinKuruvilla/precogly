/**
 * DSL Tokenizer
 *
 * Converts DSL text into a stream of tokens for parsing.
 * Based on LikeC4-style syntax.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TokenType =
  // Keywords
  | 'SPECIFICATION'
  | 'MODEL'
  | 'VIEWS'
  | 'VIEW'
  | 'ELEMENT'
  | 'RELATIONSHIP'
  | 'TAG'
  | 'DATACLASS'
  | 'STYLE'
  | 'NOTATION'
  | 'INCLUDE'
  | 'EXCLUDE'
  | 'TITLE'
  | 'DESCRIPTION'
  | 'TECHNOLOGY'
  | 'BOUNDARY'
  | 'LEVEL'
  | 'PARENT'
  | 'PROTOCOL'
  | 'DATA'
  | 'CROSSES'
  | 'OF'
  | 'AUTOLAYOUT'      // autoLayout
  | 'WHERE'           // where
  | 'AND'             // and
  | 'OR'              // or
  | 'IS'              // is
  | 'NOT'             // not
  | 'KIND'            // kind
  | 'WITH'            // with
  | 'EXTENDS'         // extends
  | 'DYNAMIC'         // dynamic
  | 'PARALLEL'        // parallel
  | 'GROUP'           // group
  | 'GLOBAL'          // global
  | 'LINK'            // link
  | 'ICON'            // icon
  | 'METADATA'        // metadata
  | 'SUMMARY'         // summary
  | 'COLOR'           // color (as keyword)

  // Literals
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'HASH_TAG'        // #pii, #encrypted_at_rest

  // Operators
  | 'ARROW'           // ->
  | 'EQUALS'          // =
  | 'DOT'             // .
  | 'COMMA'           // ,
  | 'COLON'           // :
  | 'ASTERISK'        // *
  | 'DOUBLE_ASTERISK' // **
  | 'UNDERSCORE'      // _ (for cloud._ expand syntax)
  | 'LT'              // <
  | 'GT'              // >
  | 'BIDIRECTIONAL'   // <->

  // Delimiters
  | 'LBRACE'          // {
  | 'RBRACE'          // }
  | 'LBRACKET'        // [
  | 'RBRACKET'        // ]
  | 'LPAREN'          // (
  | 'RPAREN'          // )

  // Special
  | 'COMMENT'
  | 'NEWLINE'
  | 'EOF'

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

export interface Token {
  type: TokenType
  value: string
  line: number
  column: number
}

// ═══════════════════════════════════════════════════════════════════════════
// KEYWORDS MAP
// ═══════════════════════════════════════════════════════════════════════════

const KEYWORDS: Record<string, TokenType> = {
  specification: 'SPECIFICATION',
  model: 'MODEL',
  views: 'VIEWS',
  view: 'VIEW',
  element: 'ELEMENT',
  relationship: 'RELATIONSHIP',
  tag: 'TAG',
  dataClass: 'DATACLASS',
  style: 'STYLE',
  notation: 'NOTATION',
  include: 'INCLUDE',
  exclude: 'EXCLUDE',
  title: 'TITLE',
  description: 'DESCRIPTION',
  technology: 'TECHNOLOGY',
  boundary: 'BOUNDARY',
  level: 'LEVEL',
  parent: 'PARENT',
  protocol: 'PROTOCOL',
  data: 'DATA',
  crosses: 'CROSSES',
  of: 'OF',
  // LikeC4 additional keywords
  autoLayout: 'AUTOLAYOUT',
  where: 'WHERE',
  and: 'AND',
  or: 'OR',
  is: 'IS',
  not: 'NOT',
  kind: 'KIND',
  with: 'WITH',
  extends: 'EXTENDS',
  dynamic: 'DYNAMIC',
  parallel: 'PARALLEL',
  group: 'GROUP',
  global: 'GLOBAL',
  link: 'LINK',
  icon: 'ICON',
  metadata: 'METADATA',
  summary: 'SUMMARY',
  color: 'COLOR',
}

// ═══════════════════════════════════════════════════════════════════════════
// TOKENIZER CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class Tokenizer {
  private input: string
  private pos: number = 0
  private line: number = 1
  private column: number = 1

  constructor(input: string) {
    this.input = input
  }

  private peek(offset: number = 0): string {
    return this.input[this.pos + offset] || ''
  }

  private advance(): string {
    const char = this.input[this.pos]
    this.pos++
    if (char === '\n') {
      this.line++
      this.column = 1
    } else {
      this.column++
    }
    return char
  }

  private isAtEnd(): boolean {
    return this.pos >= this.input.length
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z_]/.test(char)
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9_-]/.test(char)
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char)
  }

  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\r'
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd() && this.isWhitespace(this.peek())) {
      this.advance()
    }
  }

  private readString(quote: string): Token {
    const startLine = this.line
    const startColumn = this.column
    this.advance() // consume opening quote

    let value = ''
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\' && this.peek(1) === quote) {
        this.advance() // skip escape
        value += this.advance()
      } else {
        value += this.advance()
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${startLine}, column ${startColumn}`)
    }

    this.advance() // consume closing quote

    return {
      type: 'STRING',
      value,
      line: startLine,
      column: startColumn,
    }
  }

  private readIdentifier(): Token {
    const startLine = this.line
    const startColumn = this.column
    let value = ''

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.advance()
    }

    // Check for namespaced identifiers like aws:rds:postgresql
    while (this.peek() === ':' && this.isAlphaNumeric(this.peek(1))) {
      value += this.advance() // consume colon
      while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
        value += this.advance()
      }
    }

    const type = KEYWORDS[value] || 'IDENTIFIER'

    return {
      type,
      value,
      line: startLine,
      column: startColumn,
    }
  }

  private readNumber(): Token {
    const startLine = this.line
    const startColumn = this.column
    let value = ''

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance()
    }

    // Handle decimals
    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
      value += this.advance()
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance()
      }
    }

    // Handle percentage
    if (this.peek() === '%') {
      value += this.advance()
    }

    return {
      type: 'NUMBER',
      value,
      line: startLine,
      column: startColumn,
    }
  }

  private readHashTag(): Token {
    const startLine = this.line
    const startColumn = this.column
    this.advance() // consume #

    let value = '#'
    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.advance()
    }

    return {
      type: 'HASH_TAG',
      value,
      line: startLine,
      column: startColumn,
    }
  }

  private readComment(): Token {
    const startLine = this.line
    const startColumn = this.column
    let value = ''

    // Single-line comment
    if (this.peek() === '/' && this.peek(1) === '/') {
      this.advance() // consume first /
      this.advance() // consume second /
      while (!this.isAtEnd() && this.peek() !== '\n') {
        value += this.advance()
      }
      return {
        type: 'COMMENT',
        value: value.trim(),
        line: startLine,
        column: startColumn,
      }
    }

    // Multi-line comment
    if (this.peek() === '/' && this.peek(1) === '*') {
      this.advance() // consume /
      this.advance() // consume *
      while (!this.isAtEnd() && !(this.peek() === '*' && this.peek(1) === '/')) {
        value += this.advance()
      }
      if (!this.isAtEnd()) {
        this.advance() // consume *
        this.advance() // consume /
      }
      return {
        type: 'COMMENT',
        value: value.trim(),
        line: startLine,
        column: startColumn,
      }
    }

    throw new Error(`Unexpected character at line ${startLine}, column ${startColumn}`)
  }

  nextToken(): Token {
    this.skipWhitespace()

    if (this.isAtEnd()) {
      return { type: 'EOF', value: '', line: this.line, column: this.column }
    }

    const char = this.peek()
    const startLine = this.line
    const startColumn = this.column

    // Newlines
    if (char === '\n') {
      this.advance()
      return { type: 'NEWLINE', value: '\n', line: startLine, column: startColumn }
    }

    // Comments
    if (char === '/' && (this.peek(1) === '/' || this.peek(1) === '*')) {
      return this.readComment()
    }

    // Strings
    if (char === '"' || char === "'") {
      return this.readString(char)
    }

    // Hash tags
    if (char === '#') {
      return this.readHashTag()
    }

    // Numbers
    if (this.isDigit(char)) {
      return this.readNumber()
    }

    // Identifiers and keywords
    if (this.isAlpha(char)) {
      return this.readIdentifier()
    }

    // Operators and delimiters
    switch (char) {
      case '{':
        this.advance()
        return { type: 'LBRACE', value: '{', line: startLine, column: startColumn }
      case '}':
        this.advance()
        return { type: 'RBRACE', value: '}', line: startLine, column: startColumn }
      case '[':
        this.advance()
        return { type: 'LBRACKET', value: '[', line: startLine, column: startColumn }
      case ']':
        this.advance()
        return { type: 'RBRACKET', value: ']', line: startLine, column: startColumn }
      case '(':
        this.advance()
        return { type: 'LPAREN', value: '(', line: startLine, column: startColumn }
      case ')':
        this.advance()
        return { type: 'RPAREN', value: ')', line: startLine, column: startColumn }
      case '=':
        this.advance()
        return { type: 'EQUALS', value: '=', line: startLine, column: startColumn }
      case '.':
        this.advance()
        return { type: 'DOT', value: '.', line: startLine, column: startColumn }
      case ',':
        this.advance()
        return { type: 'COMMA', value: ',', line: startLine, column: startColumn }
      case ':':
        this.advance()
        return { type: 'COLON', value: ':', line: startLine, column: startColumn }
      case '*':
        if (this.peek(1) === '*') {
          this.advance()
          this.advance()
          return { type: 'DOUBLE_ASTERISK', value: '**', line: startLine, column: startColumn }
        }
        this.advance()
        return { type: 'ASTERISK', value: '*', line: startLine, column: startColumn }
      case '_':
        this.advance()
        return { type: 'UNDERSCORE', value: '_', line: startLine, column: startColumn }
      case '<':
        if (this.peek(1) === '-' && this.peek(2) === '>') {
          this.advance()
          this.advance()
          this.advance()
          return { type: 'BIDIRECTIONAL', value: '<->', line: startLine, column: startColumn }
        }
        this.advance()
        return { type: 'LT', value: '<', line: startLine, column: startColumn }
      case '>':
        this.advance()
        return { type: 'GT', value: '>', line: startLine, column: startColumn }
      case '-':
        if (this.peek(1) === '>') {
          this.advance()
          this.advance()
          return { type: 'ARROW', value: '->', line: startLine, column: startColumn }
        }
        // Allow hyphen in identifiers, skip here and let identifier handle it
        break
    }

    throw new Error(`Unexpected character '${char}' at line ${startLine}, column ${startColumn}`)
  }

  tokenize(): Token[] {
    const tokens: Token[] = []

    while (true) {
      const token = this.nextToken()
      tokens.push(token)
      if (token.type === 'EOF') break
    }

    return tokens
  }
}

/**
 * Tokenize DSL input
 */
export function tokenize(input: string): Token[] {
  const tokenizer = new Tokenizer(input)
  return tokenizer.tokenize()
}
