import bankingTemplates from './banking.json'
import genericTemplates from './generic.json'

export interface DFDTemplate {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  templateData: {
    nodes: unknown[]
    edges: unknown[]
  }
  createdBy: string
  isPublic: boolean
  useCount: number
  createdAt: string
  updatedAt: string
}

export const dfdTemplates: DFDTemplate[] = [
  ...bankingTemplates,
  ...genericTemplates,
] as DFDTemplate[]

export { bankingTemplates, genericTemplates }
