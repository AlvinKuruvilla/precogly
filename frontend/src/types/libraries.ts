/**
 * Type definitions for library items.
 */

import type { STRIDECategory } from './domain'

export interface ComponentLibrary {
  id: number
  name: string
  category: string
  componentType: string
  provider: string
  organization?: number
  sourcePack?: number
  sourcePackName?: string
  sourcePackSlug?: string
  createdAt: string
  updatedAt: string
}

export interface ThreatLibrary {
  id: number
  name: string
  description?: string
  strideCategory: STRIDECategory
  source: string
  sourceId?: string
  organization?: number
  sourcePack?: number
  sourcePackName?: string
  sourcePackSlug?: string
  createdAt: string
  updatedAt: string
}

export interface CountermeasureLibrary {
  id: number
  name: string
  description?: string
  controlType: 'technical' | 'procedural'
  cost: 'low' | 'medium' | 'high'
  organization?: number
  sourcePack?: number
  sourcePackName?: string
  sourcePackSlug?: string
  createdAt: string
  updatedAt: string
}

export interface DFDTemplate {
  id: number
  name: string
  description?: string
  category: string
  diagramType: string
  canvasData?: Record<string, unknown>
  organization?: number
  sourcePack?: number
  sourcePackName?: string
  sourcePackSlug?: string
  createdAt: string
  updatedAt: string
}

export interface StandardRequirement {
  id: number
  framework: number
  frameworkName: string
  sourcePack?: number
  sectionCode: string
  description: string
  parent?: number
  createdAt: string
  updatedAt: string
}
