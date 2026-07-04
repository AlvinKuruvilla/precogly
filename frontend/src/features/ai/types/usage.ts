/**
 * Types for the per-organization AI usage report.
 *
 * These mirror the aggregate returned by `GET /api/ai-usage/summary/`. Field
 * names are camelCase because the backend converts snake_case <-> camelCase at
 * the API boundary (djangorestframework-camel-case). A `cost` of `null` means
 * every record in that group was self-hosted (unpriced) — the UI renders it as
 * "—" rather than `$0`, which is a real zero.
 */

// Period the report is scoped to. These are the literal query-param values the
// backend expects (query strings are NOT camelCased), so keep them exact.
export type UsageWindow = 'this_month' | 'last_month' | 'last_30_days' | 'all_time'

export interface UsageTotals {
  tokens: number
  // null when no priced (managed) usage fell in the period.
  cost: number | null
  calls: number
  avgTokensPerCall: number
}

export interface FeatureUsage {
  feature: string
  tokens: number
  cost: number | null
}

export interface ModelUsage {
  model: string
  providerType: string
  tokens: number
  cost: number | null
}

export interface UserUsage {
  // Null when the user was deleted after the call (record keeps the tokens).
  userId: number | null
  email: string | null
  tokens: number
  cost: number | null
}

export interface TrendPoint {
  // First day of the month, ISO date (e.g. "2026-07-01").
  month: string
  tokens: number
  cost: number | null
}

export interface AIUsageSummary {
  window: UsageWindow
  totals: UsageTotals
  byFeature: FeatureUsage[]
  byModel: ModelUsage[]
  byUser: UserUsage[]
  // The last ~12 months, independent of the selected window.
  trend: TrendPoint[]
}
