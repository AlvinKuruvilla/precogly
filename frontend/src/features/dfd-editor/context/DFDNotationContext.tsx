import { createContext, useContext, type ReactNode } from 'react'
import type { DFDNotationStyle } from '../types/notation'

interface DFDNotationContextValue {
  notationStyle: DFDNotationStyle
}

const DFDNotationContext = createContext<DFDNotationContextValue>({
  notationStyle: 'dfd3',
})

export function DFDNotationProvider({
  notationStyle,
  children,
}: {
  notationStyle: DFDNotationStyle
  children: ReactNode
}) {
  return (
    <DFDNotationContext.Provider value={{ notationStyle }}>
      {children}
    </DFDNotationContext.Provider>
  )
}

export function useDFDNotation(): DFDNotationContextValue {
  return useContext(DFDNotationContext)
}
