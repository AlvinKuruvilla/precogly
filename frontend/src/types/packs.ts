/**
 * Type definitions for Library Packs.
 */

import type { InstallationStatus } from './domain'

export type PackType = 'technology' | 'threat' | 'countermeasure' | 'compliance' | 'template' | 'full'
export type PackTier = 'free' | 'premium' | 'enterprise'
export type PackSource = 'official' | 'partner' | 'community' | 'private'

// Re-export InstallationStatus from domain
export type { InstallationStatus } from './domain'

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
  isInstalled: boolean
  installedVersion?: string
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
  isInstalled: boolean
}

export interface InstalledPack {
  id: number
  organization: number
  pack: LibraryPackListItem
  installedVersion: string
  status: InstallationStatus
  installedBy: number
  installedByEmail: string
  installedAt: string
  lastUpdatedAt?: string
  updateAvailable: boolean
}

export interface PackInstallResponse {
  installation: InstalledPack
  dependenciesInstalled: string[]
  message: string
}

export interface PackDependencyCheck {
  pack: LibraryPackListItem
  dependencies: {
    packId: number
    slug: string
    name: string
    version: string
    versionConstraint: string
    isInstalled: boolean
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
