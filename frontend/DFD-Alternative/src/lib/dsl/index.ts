/**
 * DSL Module
 *
 * Provides tokenizer, parser, and serializer for the Threat Model DSL.
 *
 * Usage:
 * ```typescript
 * import { parse, serialize } from './lib/dsl'
 *
 * // Parse DSL text into a model
 * const model = parse(dslText)
 *
 * // Serialize model back to DSL text
 * const output = serialize(model)
 * ```
 */

export { Tokenizer, tokenize } from './tokenizer'
export type { Token, TokenType } from './tokenizer'

export { Parser, parse, tryParse, ParseError } from './parser'

export { Serializer, serialize, serializeMinimal } from './serializer'
export type { SerializerOptions } from './serializer'
