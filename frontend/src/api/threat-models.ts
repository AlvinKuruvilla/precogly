import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ThreatModel, DashboardStats, Framework, System, CreateThreatModelInput } from '@/types'

const API_BASE = '/api'

// Fetchers
async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(`${API_BASE}/dashboard/stats`)
  if (!response.ok) throw new Error('Failed to fetch dashboard stats')
  return response.json()
}

async function fetchThreatModels(): Promise<ThreatModel[]> {
  const response = await fetch(`${API_BASE}/threat-models`)
  if (!response.ok) throw new Error('Failed to fetch threat models')
  return response.json()
}

async function fetchThreatModel(id: string): Promise<ThreatModel> {
  const response = await fetch(`${API_BASE}/threat-models/${id}`)
  if (!response.ok) throw new Error('Failed to fetch threat model')
  return response.json()
}

async function fetchFrameworks(): Promise<Framework[]> {
  const response = await fetch(`${API_BASE}/frameworks`)
  if (!response.ok) throw new Error('Failed to fetch frameworks')
  return response.json()
}

async function fetchSystems(): Promise<System[]> {
  const response = await fetch(`${API_BASE}/systems`)
  if (!response.ok) throw new Error('Failed to fetch systems')
  return response.json()
}

async function createThreatModel(input: CreateThreatModelInput): Promise<ThreatModel> {
  const response = await fetch(`${API_BASE}/threat-models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error('Failed to create threat model')
  return response.json()
}

// Query Hooks
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
  })
}

export function useThreatModels() {
  return useQuery({
    queryKey: ['threat-models'],
    queryFn: fetchThreatModels,
  })
}

export function useThreatModel(id: string) {
  return useQuery({
    queryKey: ['threat-models', id],
    queryFn: () => fetchThreatModel(id),
    enabled: !!id,
  })
}

export function useFrameworks() {
  return useQuery({
    queryKey: ['frameworks'],
    queryFn: fetchFrameworks,
  })
}

export function useSystems() {
  return useQuery({
    queryKey: ['systems'],
    queryFn: fetchSystems,
  })
}

// Mutation Hooks
export function useCreateThreatModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createThreatModel,
    onSuccess: () => {
      // Invalidate related queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['threat-models'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}
