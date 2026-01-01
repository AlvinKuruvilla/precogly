import { useRef, useEffect, useState, useCallback } from 'react'
import { AlertCircle } from 'lucide-react'
import { tryParse, type ParseError } from '../../lib/dsl'
import type { ArchitectureModel } from '../../types/model'

interface DSLEditorProps {
  value: string
  onChange: (value: string) => void
  onParse?: (result: { success: boolean; model?: ArchitectureModel; error?: ParseError }) => void
  className?: string
}

// Token types for syntax highlighting
type TokenType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'tag'
  | 'identifier'
  | 'operator'
  | 'bracket'
  | 'number'
  | 'technology'

interface HighlightedToken {
  type: TokenType
  value: string
}

const KEYWORDS = new Set([
  'specification', 'model', 'views', 'view', 'element', 'relationship',
  'tag', 'dataClass', 'style', 'notation', 'include', 'exclude',
  'title', 'description', 'technology', 'boundary', 'level', 'parent',
  'protocol', 'data', 'crosses', 'of', 'shape', 'color', 'border', 'opacity',
  'actor', 'external', 'system', 'service', 'datastore', 'component',
  'trustBoundary', 'calls', 'stores', 'reads', 'publishes', 'subscribes',
  'untrusted', 'semi-trusted', 'trusted', 'restricted',
  'person', 'storage', 'browser', 'mobile', 'cylinder', 'queue',
  'primary', 'secondary', 'muted', 'red', 'amber', 'green', 'blue',
  'solid', 'dashed', 'dotted',
])

function tokenizeLine(line: string): HighlightedToken[] {
  const tokens: HighlightedToken[] = []
  let i = 0

  while (i < line.length) {
    // Comments
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ type: 'comment', value: line.slice(i) })
      break
    }

    // Strings
    if (line[i] === '"' || line[i] === "'") {
      const quote = line[i]
      let j = i + 1
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++
        j++
      }
      tokens.push({ type: 'string', value: line.slice(i, j + 1) })
      i = j + 1
      continue
    }

    // Hash tags
    if (line[i] === '#') {
      let j = i + 1
      while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++
      tokens.push({ type: 'tag', value: line.slice(i, j) })
      i = j
      continue
    }

    // Numbers
    if (/[0-9]/.test(line[i])) {
      let j = i
      while (j < line.length && /[0-9.%]/.test(line[j])) j++
      tokens.push({ type: 'number', value: line.slice(i, j) })
      i = j
      continue
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(line[i])) {
      let j = i
      while (j < line.length && /[a-zA-Z0-9_:-]/.test(line[j])) j++
      const word = line.slice(i, j)

      // Check for technology namespaced identifiers (e.g., aws:rds:postgresql)
      if (word.includes(':')) {
        tokens.push({ type: 'technology', value: word })
      } else if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', value: word })
      } else {
        tokens.push({ type: 'identifier', value: word })
      }
      i = j
      continue
    }

    // Operators
    if (line[i] === '-' && line[i + 1] === '>') {
      tokens.push({ type: 'operator', value: '->' })
      i += 2
      continue
    }

    if ('=.,'.includes(line[i])) {
      tokens.push({ type: 'operator', value: line[i] })
      i++
      continue
    }

    // Brackets
    if ('{}[]()'.includes(line[i])) {
      tokens.push({ type: 'bracket', value: line[i] })
      i++
      continue
    }

    // Whitespace and other
    let j = i
    while (j < line.length && !/[a-zA-Z0-9_#"'{}\[\]()=.,\-/]/.test(line[j])) j++
    if (j > i) {
      tokens.push({ type: 'identifier', value: line.slice(i, j) })
      i = j
    } else {
      tokens.push({ type: 'identifier', value: line[i] })
      i++
    }
  }

  return tokens
}

function getTokenClassName(type: TokenType): string {
  switch (type) {
    case 'keyword':
      return 'text-purple-600 font-medium'
    case 'string':
      return 'text-green-600'
    case 'comment':
      return 'text-gray-400 italic'
    case 'tag':
      return 'text-orange-500 font-medium'
    case 'technology':
      return 'text-cyan-600'
    case 'operator':
      return 'text-gray-500'
    case 'bracket':
      return 'text-gray-600'
    case 'number':
      return 'text-blue-500'
    default:
      return 'text-gray-800'
  }
}

export function DSLEditor({ value, onChange, onParse, className = '' }: DSLEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [parseError, setParseError] = useState<ParseError | null>(null)

  // Sync scroll between textarea, highlight overlay, and line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      if (highlightRef.current) {
        highlightRef.current.scrollTop = textareaRef.current.scrollTop
        highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
      }
    }
  }, [])

  // Parse on change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = tryParse(value)
      setParseError(result.error || null)
      onParse?.(result)
    }, 300)

    return () => clearTimeout(timer)
  }, [value, onParse])

  // Handle tab key
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newValue)

      // Restore cursor position
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      })
    }
  }, [value, onChange])

  // Render highlighted content as inline spans (matching textarea text flow)
  const lines = value.split('\n')
  const highlightedContent = lines.map((line, idx) => {
    const tokens = tokenizeLine(line)
    return (
      <span key={idx}>
        {tokens.map((token, tidx) => (
          <span key={tidx} className={getTokenClassName(token.type)}>
            {token.value}
          </span>
        ))}
        {idx < lines.length - 1 && '\n'}
      </span>
    )
  })

  // Line numbers as a separate column
  const lineNumbers = lines.map((_, idx) => (
    <div key={idx} style={{ height: '24px', lineHeight: '24px' }} className="text-right pr-4 text-gray-400 select-none">
      {idx + 1}
    </div>
  ))

  return (
    <div className={`relative flex flex-col h-full ${className}`}>
      {/* Error banner */}
      {parseError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Line {parseError.line}, Column {parseError.column}: {parseError.message}
          </span>
        </div>
      )}

      {/* Editor container */}
      <div className="flex flex-1 overflow-hidden bg-white">
        {/* Line numbers column */}
        <div
          ref={lineNumbersRef}
          className="flex-shrink-0 w-12 border-r border-gray-200 overflow-hidden bg-gray-50 pt-4"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '14px' }}
        >
          {lineNumbers}
        </div>

        {/* Editor area */}
        <div className="relative flex-1 overflow-hidden">
          {/* Syntax highlighted overlay */}
          <pre
            ref={highlightRef}
            className="absolute inset-0 p-4 overflow-auto pointer-events-none whitespace-pre-wrap break-all m-0"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '14px', lineHeight: '24px' }}
            aria-hidden="true"
          >
            {highlightedContent}
          </pre>

          {/* Actual textarea (transparent text, handles input) */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            className="absolute inset-0 w-full h-full p-4 resize-none bg-transparent text-transparent caret-gray-800 outline-none whitespace-pre-wrap break-all"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '14px', lineHeight: '24px' }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>
    </div>
  )
}
