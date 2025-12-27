/**
 * Type definitions for library items.
 */

export interface ComponentLibrary {
  id: number
  name: string
  category: string
  component_type: string
  provider: string
  organization?: number
  source_pack?: number
  source_pack_name?: string
  source_pack_slug?: string
  created_at: string
  updated_at: string
}

export interface ThreatLibrary {
  id: number
  name: string
  description?: string
  stride_category: 'spoofing' | 'tampering' | 'repudiation' | 'information_disclosure' | 'denial_of_service' | 'elevation_of_privilege'
  source: string
  source_id?: string
  organization?: number
  source_pack?: number
  source_pack_name?: string
  source_pack_slug?: string
  created_at: string
  updated_at: string
}

export interface CountermeasureLibrary {
  id: number
  name: string
  description?: string
  control_type: 'preventive' | 'detective' | 'corrective' | 'compensating'
  cost: 'low' | 'medium' | 'high'
  organization?: number
  source_pack?: number
  source_pack_name?: string
  source_pack_slug?: string
  created_at: string
  updated_at: string
}

export interface DFDTemplate {
  id: number
  name: string
  description?: string
  category: string
  diagram_type: string
  canvas_data?: Record<string, unknown>
  organization?: number
  source_pack?: number
  source_pack_name?: string
  source_pack_slug?: string
  created_at: string
  updated_at: string
}
