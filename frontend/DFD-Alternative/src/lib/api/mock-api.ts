/**
 * Mock API Layer
 *
 * Simulates backend services for the frontend-only MVP.
 * In production, these would be replaced with actual API calls.
 */

import type { ArchitectureModel, Element, Relationship } from '../../types/model'
import type { TechnologyEntry } from '../../types/technology'
import { getAllTechnologies, getTechnology } from '../technology-registry'

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATED DELAY
// ═══════════════════════════════════════════════════════════════════════════

const SIMULATE_DELAY = false
const DELAY_MS = 300

async function delay(): Promise<void> {
  if (SIMULATE_DELAY) {
    await new Promise(resolve => setTimeout(resolve, DELAY_MS))
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TECHNOLOGY REGISTRY API
// ═══════════════════════════════════════════════════════════════════════════

export interface TechnologySearchResult {
  technologies: TechnologyEntry[]
  total: number
}

export async function searchTechnologies(
  query: string,
  options?: {
    provider?: string
    category?: string
    limit?: number
  }
): Promise<TechnologySearchResult> {
  await delay()

  let results = getAllTechnologies()

  // Filter by query
  if (query) {
    const lowerQuery = query.toLowerCase()
    results = results.filter(t =>
      t.id.toLowerCase().includes(lowerQuery) ||
      t.displayName.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery)
    )
  }

  // Filter by provider
  if (options?.provider) {
    results = results.filter(t => t.provider === options.provider)
  }

  // Filter by category
  if (options?.category) {
    results = results.filter(t => t.category === options.category)
  }

  const total = results.length

  // Apply limit
  if (options?.limit) {
    results = results.slice(0, options.limit)
  }

  return { technologies: results, total }
}

export async function getTechnologyById(id: string): Promise<TechnologyEntry | null> {
  await delay()
  return getTechnology(id) || null
}

// ═══════════════════════════════════════════════════════════════════════════
// THREAT ANALYSIS API (Mock)
// ═══════════════════════════════════════════════════════════════════════════

export interface ThreatItem {
  id: string
  elementId: string
  elementName: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  status: 'open' | 'in_progress' | 'mitigated' | 'accepted'
  mitigations: string[]
}

export interface ThreatAnalysisResult {
  threats: ThreatItem[]
  summary: {
    total: number
    bySeverity: Record<string, number>
    byStatus: Record<string, number>
  }
}

/**
 * Mock threat analysis - generates threats based on model elements and technologies
 */
export async function analyzeModel(model: ArchitectureModel): Promise<ThreatAnalysisResult> {
  await delay()

  const threats: ThreatItem[] = []
  let threatId = 1

  // Analyze each element
  function analyzeElement(element: Element): void {
    // Check technology-based threats
    if (element.technology) {
      const tech = getTechnology(element.technology)
      if (tech) {
        for (const threat of tech.inherentThreats) {
          threats.push({
            id: `T-${threatId++}`,
            elementId: element.id,
            elementName: element.name,
            title: formatThreatTitle(threat.id),
            description: generateThreatDescription(threat.id, element, tech),
            severity: threat.severity,
            category: tech.category,
            status: 'open',
            mitigations: tech.recommendedControls
              .filter(c => c.mitigates === threat.id)
              .map(c => c.id),
          })
        }
      }
    }

    // Check tag-based threats
    if (element.tags.includes('#pii') && !element.tags.includes('#encrypted_at_rest')) {
      threats.push({
        id: `T-${threatId++}`,
        elementId: element.id,
        elementName: element.name,
        title: 'PII Data Exposure Risk',
        description: `${element.name} handles PII but is not marked as encrypted at rest.`,
        severity: 'high',
        category: 'data-protection',
        status: 'open',
        mitigations: ['encryption-at-rest', 'data-classification'],
      })
    }

    if (element.tags.includes('#public') && element.tags.includes('#pci')) {
      threats.push({
        id: `T-${threatId++}`,
        elementId: element.id,
        elementName: element.name,
        title: 'PCI Data in Public-Facing Component',
        description: `${element.name} is public-facing and handles PCI data, increasing attack surface.`,
        severity: 'critical',
        category: 'compliance',
        status: 'open',
        mitigations: ['network-segmentation', 'waf', 'encryption-in-transit'],
      })
    }

    // Recurse into children
    if (element.children) {
      for (const child of element.children) {
        analyzeElement(child)
      }
    }
  }

  // Analyze relationships
  function analyzeRelationship(rel: Relationship): void {
    // Check for unencrypted data flows
    if (!rel.tags.includes('#encrypted_in_transit')) {
      const hasCredentials = rel.data?.includes('credentials')
      const hasSensitiveData = rel.data?.some(d =>
        ['credentials', 'financial', 'userdata'].includes(d)
      )

      if (hasCredentials) {
        threats.push({
          id: `T-${threatId++}`,
          elementId: rel.id,
          elementName: `${rel.source} → ${rel.target}`,
          title: 'Unencrypted Credential Transmission',
          description: `Credentials are transmitted from ${rel.source} to ${rel.target} without encryption.`,
          severity: 'critical',
          category: 'data-in-transit',
          status: 'open',
          mitigations: ['tls', 'encryption-in-transit'],
        })
      } else if (hasSensitiveData) {
        threats.push({
          id: `T-${threatId++}`,
          elementId: rel.id,
          elementName: `${rel.source} → ${rel.target}`,
          title: 'Sensitive Data Transmitted Without Encryption',
          description: `Sensitive data flows from ${rel.source} to ${rel.target} without encryption in transit.`,
          severity: 'high',
          category: 'data-in-transit',
          status: 'open',
          mitigations: ['tls', 'encryption-in-transit'],
        })
      }
    }

    // Check for cross-boundary flows
    if (rel.crossesBoundaries && rel.crossesBoundaries.length > 0) {
      threats.push({
        id: `T-${threatId++}`,
        elementId: rel.id,
        elementName: `${rel.source} → ${rel.target}`,
        title: 'Trust Boundary Crossing',
        description: `Data flow crosses trust boundaries: ${rel.crossesBoundaries.join(' → ')}. Ensure proper authentication and authorization.`,
        severity: 'medium',
        category: 'trust-boundary',
        status: 'open',
        mitigations: ['authentication', 'authorization', 'input-validation'],
      })
    }
  }

  // Run analysis
  for (const element of model.model.elements) {
    analyzeElement(element)
  }

  for (const rel of model.model.relationships) {
    analyzeRelationship(rel)
  }

  // Calculate summary
  const summary = {
    total: threats.length,
    bySeverity: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
  }

  for (const threat of threats) {
    summary.bySeverity[threat.severity] = (summary.bySeverity[threat.severity] || 0) + 1
    summary.byStatus[threat.status] = (summary.byStatus[threat.status] || 0) + 1
  }

  return { threats, summary }
}

function formatThreatTitle(threatId: string): string {
  return threatId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function generateThreatDescription(
  threatId: string,
  element: Element,
  tech: TechnologyEntry
): string {
  const descriptions: Record<string, string> = {
    'sql-injection': `${element.name} using ${tech.displayName} may be vulnerable to SQL injection attacks if user input is not properly sanitized.`,
    'nosql-injection': `${element.name} using ${tech.displayName} may be vulnerable to NoSQL injection attacks.`,
    'privilege-escalation': `Improper access controls in ${element.name} could allow privilege escalation.`,
    'data-exposure': `${element.name} may expose sensitive data if not properly configured.`,
    'bucket-misconfiguration': `${element.name} S3 bucket may be misconfigured, potentially exposing data publicly.`,
    'container-misconfiguration': `${element.name} storage container may have insecure access policies.`,
    'unauthorized-access': `${element.name} may be accessible to unauthorized users.`,
    'code-injection': `${element.name} may be vulnerable to code injection attacks.`,
    'xss': `${element.name} may be vulnerable to cross-site scripting (XSS) attacks.`,
    'deserialization': `${element.name} may be vulnerable to insecure deserialization attacks.`,
    'api-abuse': `${element.name} API endpoints may be abused without proper rate limiting.`,
    'dos-attack': `${element.name} may be vulnerable to denial of service attacks.`,
    'cache-poisoning': `${element.name} cache may be vulnerable to cache poisoning attacks.`,
    'dependency-vulnerabilities': `${element.name} may have vulnerable dependencies that need updating.`,
    'prototype-pollution': `${element.name} may be vulnerable to prototype pollution attacks.`,
    'container-escape': `${element.name} containers may be vulnerable to container escape attacks.`,
    'image-vulnerabilities': `${element.name} container images may contain known vulnerabilities.`,
    'api-key-exposure': `API keys for ${element.name} may be exposed if not properly managed.`,
    'webhook-spoofing': `${element.name} webhooks may be spoofed without proper signature verification.`,
    'token-exposure': `Authentication tokens in ${element.name} may be exposed.`,
    'misconfiguration': `${element.name} may have security misconfigurations.`,
    'rbac-misconfiguration': `${element.name} RBAC policies may be misconfigured.`,
    'network-exposure': `${element.name} may have unnecessary network exposure.`,
    'secrets-exposure': `Secrets in ${element.name} may be exposed.`,
  }

  return descriptions[threatId] || `${element.name} using ${tech.displayName} may have security vulnerabilities.`
}

// ═══════════════════════════════════════════════════════════════════════════
// MODEL PERSISTENCE API (localStorage)
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'threat-model-dsl-models'

export interface SavedModel {
  id: string
  name: string
  dslContent: string
  model: ArchitectureModel
  createdAt: string
  updatedAt: string
}

export async function listModels(): Promise<SavedModel[]> {
  await delay()
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export async function getModel(id: string): Promise<SavedModel | null> {
  await delay()
  const models = await listModels()
  return models.find(m => m.id === id) || null
}

export async function saveModel(
  id: string,
  name: string,
  dslContent: string,
  model: ArchitectureModel
): Promise<SavedModel> {
  await delay()
  const models = await listModels()
  const now = new Date().toISOString()

  const existingIndex = models.findIndex(m => m.id === id)
  const savedModel: SavedModel = {
    id,
    name,
    dslContent,
    model,
    createdAt: existingIndex >= 0 ? models[existingIndex].createdAt : now,
    updatedAt: now,
  }

  if (existingIndex >= 0) {
    models[existingIndex] = savedModel
  } else {
    models.push(savedModel)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(models))
  return savedModel
}

export async function deleteModel(id: string): Promise<boolean> {
  await delay()
  const models = await listModels()
  const filtered = models.filter(m => m.id !== id)
  if (filtered.length === models.length) return false
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  return true
}

// ═══════════════════════════════════════════════════════════════════════════
// SAMPLE MODEL
// ═══════════════════════════════════════════════════════════════════════════

export const SAMPLE_DSL = `specification {
  element actor {
    style {
      shape person
    }
  }
  element process {
    style {
      shape rectangle
      color indigo
    }
  }
  element store {
    style {
      shape storage
      color secondary
    }
  }

  element boundary {
    style {
      border dashed
      opacity 0%
      color red
    }
  }
}

model {
  customer = actor 'Customer'
  kitchen = actor 'Kitchen Staff'

  corpZone = boundary 'Corporate Trust Boundary' {

    orderSystem = process 'Order Processing' {
       validate = process 'Validate'
       calc = process 'Calculate'
    }

    ordersDb = store 'Orders DB'
  }

  // Flows - using qualified names for nested elements
  customer -> corpZone.orderSystem.validate 'Order Details'
  corpZone.orderSystem.validate -> corpZone.orderSystem.calc
  corpZone.orderSystem.calc -> corpZone.ordersDb
  corpZone.orderSystem.calc -> kitchen 'Ticket'
}

views {
  view index {
    title 'High Level View'
    include *
  }

  view trust_boundary_view {
    title 'TM: Corporate Boundary'

    include corpZone
    include corpZone.*

    include customer
    include kitchen

    autoLayout TopBottom
  }
}
`
