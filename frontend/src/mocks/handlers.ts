import { http, HttpResponse } from 'msw'

// Base API URL - will match your Django backend later
const API_BASE = '/api'

// Mock data - Systems/CMDB entities
const systems = [
  {
    id: '1',
    name: 'AWS Serverless System',
    type: 'system',
    description: 'Lambda, API Gateway, DynamoDB stack',
    environment: 'production',
  },
  {
    id: '2',
    name: 'Mobile Payments System',
    type: 'system',
    description: 'Mobile payment processing infrastructure',
    environment: 'production',
  },
  {
    id: '3',
    name: 'Customer Data Lake',
    type: 'system',
    description: 'S3-based data lake for analytics',
    environment: 'production',
  },
  {
    id: '4',
    name: 'Identity Provider',
    type: 'system',
    description: 'OAuth/OIDC identity management',
    environment: 'production',
  },
  {
    id: '5',
    name: 'Order Processing Pipeline',
    type: 'process',
    description: 'End-to-end order fulfillment process',
    environment: 'production',
  },
  {
    id: '6',
    name: 'Customer Onboarding Flow',
    type: 'process',
    description: 'New customer registration and KYC process',
    environment: 'production',
  },
]

// Mock data - Threat Models
const threatModels = [
  {
    id: '1',
    name: 'Payment Processing System',
    description: 'Threat model for payment flow including card processing and PCI compliance',
    criticality: 'high',
    status: 'in_progress',
    frameworks: ['PCI-DSS', 'DORA'],
    owner: 'Alice Chen',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  },
  {
    id: '2',
    name: 'User Authentication Service',
    description: 'Auth and identity management including SSO and MFA',
    criticality: 'critical',
    status: 'approved',
    frameworks: ['SOC2', 'ISO27001'],
    owner: 'Bob Martinez',
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-18T11:00:00Z',
  },
  {
    id: '3',
    name: 'Customer Data Platform',
    description: 'CDP handling PII and customer analytics data',
    criticality: 'critical',
    status: 'pending_review',
    frameworks: ['GDPR', 'SOC2'],
    owner: 'Carol Wong',
    createdAt: '2024-01-12T08:00:00Z',
    updatedAt: '2024-01-19T16:45:00Z',
  },
  {
    id: '4',
    name: 'Internal Admin Portal',
    description: 'Back-office admin tools for operations team',
    criticality: 'medium',
    status: 'in_progress',
    frameworks: ['SOC2'],
    owner: 'David Kim',
    createdAt: '2024-01-08T11:00:00Z',
    updatedAt: '2024-01-17T10:20:00Z',
  },
  {
    id: '5',
    name: 'Mobile Banking App',
    description: 'iOS and Android mobile banking application',
    criticality: 'critical',
    status: 'in_progress',
    frameworks: ['PCI-DSS', 'DORA', 'ISO27001'],
    owner: 'Eve Johnson',
    createdAt: '2024-01-05T14:00:00Z',
    updatedAt: '2024-01-21T09:15:00Z',
  },
  {
    id: '6',
    name: 'API Gateway',
    description: 'Central API gateway for all microservices',
    criticality: 'high',
    status: 'approved',
    frameworks: ['SOC2', 'ISO27001'],
    owner: 'Frank Lee',
    createdAt: '2024-01-02T10:00:00Z',
    updatedAt: '2024-01-14T13:30:00Z',
  },
]

export const handlers = [
  // Dashboard stats
  http.get(`${API_BASE}/dashboard/stats`, () => {
    const stats = {
      total: threatModels.length,
      inProgress: threatModels.filter((t) => t.status === 'in_progress').length,
      pendingReview: threatModels.filter((t) => t.status === 'pending_review').length,
      approved: threatModels.filter((t) => t.status === 'approved').length,
    }
    return HttpResponse.json(stats)
  }),

  // Get all threat models
  http.get(`${API_BASE}/threat-models`, () => {
    return HttpResponse.json(threatModels)
  }),

  // Get single threat model
  http.get(`${API_BASE}/threat-models/:id`, ({ params }) => {
    const { id } = params
    const model = threatModels.find((t) => t.id === id)
    if (!model) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(model)
  }),

  // Create threat model
  http.post(`${API_BASE}/threat-models`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const newModel = {
      id: String(threatModels.length + 1),
      ...body,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json(newModel, { status: 201 })
  }),

  // Get compliance frameworks
  http.get(`${API_BASE}/frameworks`, () => {
    return HttpResponse.json([
      { id: '1', name: 'PCI-DSS', description: 'Payment Card Industry Data Security Standard' },
      { id: '2', name: 'DORA', description: 'Digital Operational Resilience Act' },
      { id: '3', name: 'SOC2', description: 'Service Organization Control 2' },
      { id: '4', name: 'ISO27001', description: 'Information Security Management' },
      { id: '5', name: 'CRA', description: 'Cyber Resilience Act' },
      { id: '6', name: 'GDPR', description: 'General Data Protection Regulation' },
    ])
  }),

  // Get systems/CMDB entities
  http.get(`${API_BASE}/systems`, () => {
    return HttpResponse.json(systems)
  }),
]
