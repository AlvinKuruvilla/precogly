import { createContext, useContext, type ReactNode } from 'react'
import type { DiagramNode, DiagramEdge } from '@/features/dfd-editor/types'
import type { GuestThreat, GuestCountermeasure } from '../types'

interface GuestEditorContextType {
  // Diagram data (read-only from context consumers)
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  title: string

  // Threat operations
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

  // Countermeasure operations
  addCountermeasure: (
    threatId: string,
    name: string,
    description: string,
    controlType: GuestCountermeasure['controlType']
  ) => void
  updateCountermeasure: (
    countermeasureId: string,
    updates: Partial<Pick<GuestCountermeasure, 'name' | 'description' | 'controlType'>>
  ) => void
  removeCountermeasure: (countermeasureId: string) => void
  getCountermeasuresForThreat: (threatId: string) => GuestCountermeasure[]
  getCountermeasureCount: (threatId: string) => number
  getAllCountermeasures: () => GuestCountermeasure[]
  loadCountermeasures: (countermeasures: GuestCountermeasure[]) => void
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
