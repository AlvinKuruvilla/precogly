/**
 * Type exports for the Threat Model DSL
 *
 * Main types:
 * - ArchitectureModel: Top-level model containing specification, model, and views
 * - Element: Nodes in the architecture (actors, systems, services, etc.)
 * - Relationship: Connections between elements (data flows)
 * - TrustBoundary: Security perimeters
 * - View: Diagram perspectives
 *
 * Technology types:
 * - TechnologyEntry: Registry entry for a technology
 * - TechnologyRegistry: Collection of technology entries
 */

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORT MODEL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export * from './model'
export * from './technology'

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY TYPES (for backward compatibility with narrative UI)
// These will be deprecated once UI is migrated to DSL-first approach
// ═══════════════════════════════════════════════════════════════════════════

export type ActorKind = 'person' | 'external-system'
export type EntityKind = 'system' | 'container' | 'component'
export type ContainerSubtype = 'service' | 'database' | 'queue' | 'storage'
export type BoundaryKind = 'internet' | 'dmz' | 'internal' | 'vpc'
export type LegacySecurityTag = 'pii' | 'pci' | 'public-facing'
export type ThreatStatus = 'exposed' | 'assigned' | 'mitigated'

export interface ActorSentence {
  type: 'actor'
  id: string
  actorKind: ActorKind
  name: string
  description: string
}

export interface EntitySentence {
  type: 'entity'
  id: string
  parentId: string | null
  entityKind: EntityKind
  containerSubtype?: ContainerSubtype
  name: string
  technology: string
  tags: LegacySecurityTag[]
  description: string
}

export interface BoundarySentence {
  type: 'boundary'
  id: string
  parentId: string | null
  name: string
  boundaryKind: BoundaryKind
}

export interface FlowSentence {
  type: 'flow'
  id: string
  sourceId: string
  targetId: string
  label: string
  dataAssets: string[]
  protocol: string
  encrypted: boolean
  authenticated: boolean
}

export type Sentence = ActorSentence | EntitySentence | BoundarySentence | FlowSentence

export type Story = Sentence[]

// Mock threat data
export interface ThreatInfo {
  elementId: string
  count: number
  status: ThreatStatus
}

// ═══════════════════════════════════════════════════════════════════════════
// UI OPTIONS (legacy)
// ═══════════════════════════════════════════════════════════════════════════

export const ACTOR_KINDS: { value: ActorKind; label: string }[] = [
  { value: 'person', label: 'Person' },
  { value: 'external-system', label: 'External System' },
]

export const ENTITY_KINDS: { value: EntityKind; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'container', label: 'Container' },
  { value: 'component', label: 'Component' },
]

export const CONTAINER_SUBTYPES: { value: ContainerSubtype; label: string }[] = [
  { value: 'service', label: 'Service' },
  { value: 'database', label: 'Database' },
  { value: 'queue', label: 'Message Queue' },
  { value: 'storage', label: 'File Storage' },
]

export const BOUNDARY_KINDS: { value: BoundaryKind; label: string }[] = [
  { value: 'internet', label: 'Internet' },
  { value: 'dmz', label: 'DMZ' },
  { value: 'internal', label: 'Internal Network' },
  { value: 'vpc', label: 'VPC / Cloud Network' },
]

export const LEGACY_SECURITY_TAGS: { value: LegacySecurityTag; label: string }[] = [
  { value: 'pii', label: 'Contains PII' },
  { value: 'pci', label: 'Contains PCI Data' },
  { value: 'public-facing', label: 'Public Facing' },
]

export const PROTOCOLS = [
  'HTTPS',
  'HTTP',
  'gRPC',
  'WebSocket',
  'SQL',
  'Redis Protocol',
  'AMQP',
  'Kafka',
  'TCP',
  'UDP',
]

export const LEGACY_TECHNOLOGIES: { name: string; icon: string }[] = [
  { name: 'React', icon: 'tech:react' },
  { name: 'Node.js', icon: 'tech:nodejs' },
  { name: 'Python', icon: 'tech:python' },
  { name: 'Java', icon: 'tech:java' },
  { name: 'Go', icon: 'tech:go' },
  { name: 'PostgreSQL', icon: 'tech:postgresql' },
  { name: 'MySQL', icon: 'tech:mysql' },
  { name: 'MongoDB', icon: 'tech:mongodb' },
  { name: 'Redis', icon: 'tech:redis' },
  { name: 'AWS S3', icon: 'aws:s3' },
  { name: 'AWS Lambda', icon: 'aws:lambda' },
  { name: 'AWS API Gateway', icon: 'aws:api-gateway' },
  { name: 'AWS RDS', icon: 'aws:rds' },
  { name: 'Docker', icon: 'tech:docker' },
  { name: 'Kubernetes', icon: 'tech:kubernetes' },
  { name: 'Nginx', icon: 'tech:nginx' },
  { name: 'GraphQL', icon: 'tech:graphql' },
]
