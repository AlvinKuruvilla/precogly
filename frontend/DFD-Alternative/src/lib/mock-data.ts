import type { Story, ThreatInfo } from '../types'

// Sample story for demo
export const initialStory: Story = [
  {
    type: 'actor',
    id: 'customer',
    actorKind: 'person',
    name: 'Customer',
    description: 'End user of the e-commerce platform',
  },
  {
    type: 'actor',
    id: 'payment-gateway',
    actorKind: 'external-system',
    name: 'Payment Gateway',
    description: 'Third-party payment processor (Stripe)',
  },
  {
    type: 'entity',
    id: 'platform',
    parentId: null,
    entityKind: 'system',
    name: 'E-Commerce Platform',
    technology: '',
    tags: [],
    description: 'Main e-commerce system',
  },
  {
    type: 'boundary',
    id: 'dmz',
    parentId: 'platform',
    name: 'DMZ',
    boundaryKind: 'dmz',
  },
  {
    type: 'entity',
    id: 'webapp',
    parentId: 'platform',
    entityKind: 'container',
    containerSubtype: 'service',
    name: 'Web Application',
    technology: 'React',
    tags: ['public-facing'],
    description: 'Customer-facing web application',
  },
  {
    type: 'entity',
    id: 'api',
    parentId: 'platform',
    entityKind: 'container',
    containerSubtype: 'service',
    name: 'API Server',
    technology: 'Node.js',
    tags: [],
    description: 'Backend REST API',
  },
  {
    type: 'entity',
    id: 'userdb',
    parentId: 'platform',
    entityKind: 'container',
    containerSubtype: 'database',
    name: 'User Database',
    technology: 'PostgreSQL',
    tags: ['pii'],
    description: 'Stores user accounts and profiles',
  },
  {
    type: 'flow',
    id: 'flow-1',
    sourceId: 'customer',
    targetId: 'webapp',
    label: 'browses products',
    dataAssets: ['session', 'product queries'],
    protocol: 'HTTPS',
    encrypted: true,
    authenticated: true,
  },
  {
    type: 'flow',
    id: 'flow-2',
    sourceId: 'webapp',
    targetId: 'api',
    label: 'requests data',
    dataAssets: ['user data', 'product data'],
    protocol: 'HTTPS',
    encrypted: true,
    authenticated: true,
  },
  {
    type: 'flow',
    id: 'flow-3',
    sourceId: 'api',
    targetId: 'userdb',
    label: 'queries users',
    dataAssets: ['user credentials', 'profile data'],
    protocol: 'SQL',
    encrypted: true,
    authenticated: true,
  },
  {
    type: 'flow',
    id: 'flow-4',
    sourceId: 'api',
    targetId: 'payment-gateway',
    label: 'processes payment',
    dataAssets: ['payment tokens'],
    protocol: 'HTTPS',
    encrypted: true,
    authenticated: true,
  },
]

// Mock threat data for visualization
export const mockThreats: ThreatInfo[] = [
  { elementId: 'webapp', count: 3, status: 'assigned' },
  { elementId: 'api', count: 5, status: 'exposed' },
  { elementId: 'userdb', count: 2, status: 'mitigated' },
  { elementId: 'payment-gateway', count: 1, status: 'mitigated' },
]

// Helper to get threat info for an element
export function getThreatInfo(elementId: string): ThreatInfo | undefined {
  return mockThreats.find((t) => t.elementId === elementId)
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}
