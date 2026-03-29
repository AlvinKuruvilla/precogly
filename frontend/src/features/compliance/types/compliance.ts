/**
 * Type definitions for compliance frameworks.
 */

export interface Framework {
  id: number
  name: string
  version: string
  issuer: string
  description: string
  createdAt?: string
  updatedAt?: string
}

export interface FrameworkRequirement {
  id: number
  framework: number
  frameworkName: string
  sectionCode: string
  description: string
  parent: number | null
  createdAt?: string
  updatedAt?: string
}

export interface CountermeasureStandardMapping {
  id: number
  countermeasureLibrary: number
  requirement: number
  requirementCode: string
  frameworkName: string
  sufficiency: 'full' | 'partial'
}
