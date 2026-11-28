import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AuthorizationRequest {
  clientName: string
  scopes: { name: string; description: string }[]
  redirectUri: string
  loopbackRedirect: boolean
}

export interface Decision {
  allow: boolean
  password?: string
}

// `query`, here and in `useDecision`, is the consent page's own query string without
// the `?`, exactly as `/o/authorize/` redirected with it. The authorization-request
// and decision endpoints each validate it server-side, so it is passed on unchanged.
//
// The endpoint requires a JWT, so the query runs only once the user is known. A 404
// means the request is invalid, so retrying returns the same 404.
export function useAuthorizationRequest(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ['oauth', 'authorization-request', query],
    queryFn: () => api.get<AuthorizationRequest>(`/oauth/authorization-request/?${query}`),
    enabled: enabled && !!query,
    retry: false,
  })
}

export interface AuthorizedApplication {
  id: number
  name: string
  scopes: { name: string; description: string }[]
  registeredAt: string
  runsLocally: boolean
  redirectHost: string
}

const authorizedKey = ['oauth', 'authorized-apps']

export function useAuthorizedApplications() {
  return useQuery({
    queryKey: authorizedKey,
    queryFn: () => api.get<AuthorizedApplication[]>('/oauth/authorized-apps/'),
  })
}

export function useRevokeApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/oauth/authorized-apps/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authorizedKey }),
  })
}

export function useDecision(query: string) {
  return useMutation({
    mutationFn: (decision: Decision) =>
      api.post<{ redirectUrl: string }>(`/oauth/decision/?${query}`, decision),
  })
}
