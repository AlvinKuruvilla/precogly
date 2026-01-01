/**
 * API Layer
 *
 * Re-exports all API functions for the application.
 */

export {
  // Technology Registry
  searchTechnologies,
  getTechnologyById,

  // Threat Analysis
  analyzeModel,

  // Model Persistence
  listModels,
  getModel,
  saveModel,
  deleteModel,

  // Sample Data
  SAMPLE_DSL,
} from './mock-api'

export type {
  TechnologySearchResult,
  ThreatItem,
  ThreatAnalysisResult,
  SavedModel,
} from './mock-api'
