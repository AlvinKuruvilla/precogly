import { useQuery } from '@tanstack/react-query'
import type { ThreatModel, DashboardStats } from '@/types'

const API_BASE = '/api'

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
