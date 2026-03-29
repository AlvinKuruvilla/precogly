// Unified pack type that can represent both source and database packs
export interface UnifiedPack {
  slug: string
  name: string
  description: string
  version: string
  packType: string
  tier: string
  source: string
  tags: string[]
  componentCount: number
  threatCount: number
  isInDatabase: boolean
  isImported: boolean
  databaseId: number | null
  dependsOn: Array<{ slug: string; name: string; isImported: boolean }>
}
