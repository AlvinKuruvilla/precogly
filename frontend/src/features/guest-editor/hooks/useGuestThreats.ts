import { useState, useCallback } from 'react'
import type { GuestThreat } from '../types'

export function useGuestThreats() {
  const [threats, setThreats] = useState<GuestThreat[]>([])

  const addThreat = useCallback(
    (
      targetId: string,
      targetType: GuestThreat['targetType'],
      name: string,
      description: string,
      severity: GuestThreat['severity']
    ) => {
      const newThreat: GuestThreat = {
        id: crypto.randomUUID(),
        targetId,
        targetType,
        name,
        description,
        severity,
        createdAt: new Date().toISOString(),
      }
      setThreats((prev) => [...prev, newThreat])
    },
    []
  )

  const updateThreat = useCallback(
    (threatId: string, updates: Partial<Pick<GuestThreat, 'name' | 'description' | 'severity'>>) => {
      setThreats((prev) =>
        prev.map((t) => (t.id === threatId ? { ...t, ...updates } : t))
      )
    },
    []
  )

  const removeThreat = useCallback((threatId: string) => {
    setThreats((prev) => prev.filter((t) => t.id !== threatId))
  }, [])

  const getThreatsForTarget = useCallback(
    (targetId: string) => threats.filter((t) => t.targetId === targetId),
    [threats]
  )

  const getThreatCount = useCallback(
    (targetId: string) => threats.filter((t) => t.targetId === targetId).length,
    [threats]
  )

  const getAllThreats = useCallback(() => threats, [threats])

  const loadThreats = useCallback((newThreats: GuestThreat[]) => {
    setThreats(newThreats)
  }, [])

  return {
    addThreat,
    updateThreat,
    removeThreat,
    getThreatsForTarget,
    getThreatCount,
    getAllThreats,
    loadThreats,
  }
}
