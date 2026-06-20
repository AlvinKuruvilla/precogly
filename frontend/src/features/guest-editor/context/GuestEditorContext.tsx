import { createContext, useContext, type ReactNode } from 'react'
import type { GuestThreat } from '../types'

interface GuestEditorContextType {
  addThreat: (
    targetId: string,
    targetType: GuestThreat['targetType'],
    name: string,
    description: string,
    severity: GuestThreat['severity']
  ) => void
  updateThreat: (
    threatId: string,
    updates: Partial<Pick<GuestThreat, 'name' | 'description' | 'severity'>>
  ) => void
  removeThreat: (threatId: string) => void
  getThreatsForTarget: (targetId: string) => GuestThreat[]
  getThreatCount: (targetId: string) => number
  getAllThreats: () => GuestThreat[]
  loadThreats: (threats: GuestThreat[]) => void
}

const GuestEditorContext = createContext<GuestEditorContextType | null>(null)

export function GuestEditorProvider({
  children,
  value,
}: {
  children: ReactNode
  value: GuestEditorContextType
}) {
  return (
    <GuestEditorContext.Provider value={value}>
      {children}
    </GuestEditorContext.Provider>
  )
}

export function useGuestEditor(): GuestEditorContextType | null {
  return useContext(GuestEditorContext)
}
