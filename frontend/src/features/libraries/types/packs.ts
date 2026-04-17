/**
 * Type definitions for Library Packs.
 */

export type PackType = 'technology' | 'threat' | 'countermeasure' | 'compliance' | 'template' | 'full' | 'taxonomy'
export type PackTier = 'free' | 'premium' | 'enterprise'
export type PackSource = 'official' | 'partner' | 'community' | 'private'

export interface PackDependency {
  id: number
  dependsOnPack: number
  dependsOnPackName: string
  dependsOnPackSlug: string
  versionConstraint: string
  isOptional: boolean
}

export interface PackContentSummary {
  components: number
  threats: number
  countermeasures: number
  templates: number
  taxonomies: number
}

export interface LibraryPack {
  id: number
  slug: string
  name: string
  description: string
  version: string
  packType: PackType
  tier: PackTier
  source: PackSource
  author: string
  repositoryUrl?: string
  documentationUrl?: string
  iconUrl?: string
  installCount: number
  industries: string[]
  tags: string[]
  isPublished: boolean
  publishedAt?: string
  isImported: boolean
  dependencies?: PackDependency[]
  contentSummary?: PackContentSummary
  createdAt: string
  updatedAt: string
}

export interface LibraryPackListItem {
  id: number
  slug: string
  name: string
  description: string
  version: string
  packType: PackType
  tier: PackTier
  source: PackSource
  author: string
  installCount: number
  industries: string[]
  tags: string[]
  isImported: boolean
}

export interface PackDependencyCheck {
  pack: LibraryPackListItem
  dependencies: {
    packId: number
    slug: string
    name: string
    version: string
    versionConstraint: string
    isImported: boolean
  }[]
  missingDependencies: string[]
  allSatisfied: boolean
}

export interface PackFilters {
  packType?: PackType
  tier?: PackTier
  source?: PackSource
  industry?: string
  tag?: string
  search?: string
}

export interface ValidationWarning {
  file: string
  field: string
  message: string
  suggestion: string
}

export interface ValidationError {
  file: string
  line: number | null
  refType: string
  reference: string
  message: string
}

export interface ValidationResult {
  success: boolean
  packSlug: string
  packName: string
  version: string
  errors: ValidationError[]
  warnings: ValidationWarning[]
  errorCount: number
  warningCount: number
}
