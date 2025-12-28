/**
 * Type definitions for compliance frameworks.
 */

export interface Framework {
  id: number
  name: string
  version: string
  issuer: string
  description: string
  created_at?: string
  updated_at?: string
}

export interface FrameworkRequirement {
  id: number
  framework: number
  framework_name: string
  section_code: string
  description: string
  parent: number | null
  created_at?: string
  updated_at?: string
}

export interface CountermeasureStandardMapping {
  id: number
  countermeasure_library: number
  requirement: number
  requirement_code: string
  framework_name: string
  sufficiency: 'full' | 'partial'
}
