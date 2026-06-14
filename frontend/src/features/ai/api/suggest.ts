/**
 * React Query hooks for the AI "suggest threats" feature.
 *
 * Two endpoints back the owl in the component view:
 *  - `ai_availability` (cheap, GET): does this component's org have AI enabled?
 *    Drives whether the owl is active or routes to provider setup, decided
 *    *before* the user clicks so we never fire a request that can only 400.
 *  - `suggest` (the real work, POST): grounded, ranked threat candidates for a
 *    component. It persists nothing — the user reviews and accepts each one
 *    through the normal create path, so this is a mutation we trigger on demand
 *    rather than a query that auto-refetches an LLM call.
 *
 * Request/response casing crosses the snake_case <-> camelCase boundary
 * automatically (djangorestframework-camel-case), so bodies are camelCase here.
 * Query params are the exception — they are not converted — hence the literal
 * `component_id` below, matching the rest of the threats API.
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ThreatSuggestion {
  threatLibrary: number
  threatName: string
  threatDescription: string
  defaultSeverity: string
  suggestedSeverity: 'low' | 'medium' | 'high' | 'critical'
  rationale: string
  taxonomy: string[]
  source: { qualifiedSlug: string; packName: string | null }
}

export interface SuggestThreatsResponse {
  component: number
  suggestions: ThreatSuggestion[]
}

export interface AiAvailability {
  available: boolean
  reason: string | null
}

export const aiSuggestKeys = {
  availability: (componentId: number) => ['ai-availability', componentId] as const,
}

/**
 * Whether AI suggestions are available for the component's organization.
 * Cached per component; availability changes rarely, so it stays fresh a while.
 */
export function useAiAvailability(componentId: number | null) {
  return useQuery({
    queryKey: aiSuggestKeys.availability(componentId ?? -1),
    queryFn: () =>
      api.get<AiAvailability>(
        `/component-threats/ai_availability/?component_id=${componentId}`
      ),
    enabled: componentId !== null,
    staleTime: 60_000,
  })
}

/**
 * Request ranked, grounded threat suggestions for a component. Triggered when
 * the owl popover opens; re-run via "Regenerate".
 */
export function useSuggestThreats() {
  return useMutation({
    mutationFn: (componentId: number) =>
      api.post<SuggestThreatsResponse>('/component-threats/suggest/', {
        componentId,
      }),
  })
}
