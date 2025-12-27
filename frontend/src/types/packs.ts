/**
 * Type definitions for Library Packs.
 */

export type PackType = 'technology' | 'threat' | 'countermeasure' | 'compliance' | 'template' | 'full'
export type PackTier = 'free' | 'premium' | 'enterprise'
export type PackSource = 'official' | 'partner' | 'community' | 'private'
export type InstallationStatus = 'installed' | 'pending_update' | 'failed'

export interface PackDependency {
  id: number
  depends_on_pack: number
  depends_on_pack_name: string
  depends_on_pack_slug: string
  version_constraint: string
  is_optional: boolean
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
  pack_type: PackType
  tier: PackTier
  source: PackSource
  author: string
  repository_url?: string
  documentation_url?: string
  icon_url?: string
  install_count: number
  industries: string[]
  tags: string[]
  is_published: boolean
  published_at?: string
  is_installed: boolean
  installed_version?: string
  dependencies?: PackDependency[]
  content_summary?: PackContentSummary
  created_at: string
  updated_at: string
}

export interface LibraryPackListItem {
  id: number
  slug: string
  name: string
  description: string
  version: string
  pack_type: PackType
  tier: PackTier
  source: PackSource
  author: string
  install_count: number
  industries: string[]
  tags: string[]
  is_installed: boolean
}

export interface InstalledPack {
  id: number
  organization: number
  pack: LibraryPackListItem
  installed_version: string
  status: InstallationStatus
  installed_by: number
  installed_by_email: string
  installed_at: string
  last_updated_at?: string
  update_available: boolean
}

export interface PackInstallResponse {
  installation: InstalledPack
  dependencies_installed: string[]
  message: string
}

export interface PackDependencyCheck {
  pack: LibraryPackListItem
  dependencies: {
    pack_id: number
    slug: string
    name: string
    version: string
    version_constraint: string
    is_installed: boolean
  }[]
  missing_dependencies: string[]
  all_satisfied: boolean
}

export interface PackFilters {
  pack_type?: PackType
  tier?: PackTier
  source?: PackSource
  industry?: string
  tag?: string
  search?: string
}
