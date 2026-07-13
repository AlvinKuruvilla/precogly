/**
 * React Query hook for the per-organization AI usage report.
 *
 * Backs the "Usage" tab on the AI settings page: one org-scoped, read-only
 * aggregate (`GET /ai-usage/summary/`) giving period totals plus breakdowns by
 * feature, model, and user, and a fixed 12-month trend. The heavy lifting is
 * SUM/GROUP BY in Postgres — this is just a typed GET.
 *
 * `organization` and `window` are query-string params, which the API boundary
 * does NOT camelCase, so they are passed with their literal backend names.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AIUsageSummary, UsageWindow } from '@/features/ai/types/usage'

export const aiUsageKeys = {
  all: ['ai-usage'] as const,
  summary: (orgId?: number, window?: UsageWindow) =>
    [...aiUsageKeys.all, 'summary', orgId, window] as const,
}

export function useAIUsageSummary(organizationId?: number, window: UsageWindow = 'this_month') {
  return useQuery({
    queryKey: aiUsageKeys.summary(organizationId, window),
    queryFn: () =>
      api.get<AIUsageSummary>(
        `/ai-usage/summary/?organization=${organizationId}&window=${window}`
      ),
    enabled: !!organizationId,
  })
}
