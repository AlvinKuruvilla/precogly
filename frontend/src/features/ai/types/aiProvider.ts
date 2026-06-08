/**
 * Types for per-tenant AI provider configuration.
 *
 * Field names are camelCase because the backend converts snake_case <-> camelCase
 * at the API boundary (djangorestframework-camel-case). The API key is never part
 * of a read response: the server exposes only `hasApiKey` so the UI can show that
 * a key is set without ever receiving the secret.
 */

// The only provider kind v1 supports. New, non-OpenAI-compatible providers add a
// value here in lockstep with a backend adapter; the UI's select stays valid.
export type AIProviderType = 'openai_compat'

export interface AIProviderConfig {
  id: number
  organization: number
  name: string
  providerType: AIProviderType
  baseUrl: string
  model: string
  requestTimeout: number
  isDefault: boolean
  enabled: boolean
  // True when a key is stored. The key itself is never returned.
  hasApiKey: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAIProviderInput {
  organization: number
  name: string
  providerType?: AIProviderType
  baseUrl: string
  model: string
  requestTimeout?: number
  // Omit or send blank to store no key (typical for local servers).
  apiKey?: string
  isDefault?: boolean
  enabled?: boolean
}

export interface UpdateAIProviderInput {
  name?: string
  baseUrl?: string
  model?: string
  requestTimeout?: number
  // Blank/omitted means "keep the stored key"; a value replaces it.
  apiKey?: string
  isDefault?: boolean
  enabled?: boolean
}

export interface ProviderHealth {
  ok: boolean
  detail: string
}
