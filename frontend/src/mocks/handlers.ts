import { http, HttpResponse } from 'msw'

// Base API URL - will match your Django backend later
const API_BASE = '/api'

// Mock data - Diagrams
const diagrams = [
  {
    id: 'diagram-1',
    threatModelId: '1',
    slug: 'payment-flow-dfd',
    title: 'Payment Flow DFD',
    description: 'Data flow diagram for payment processing',
    diagramType: 'dataflow',
    threatFramework: 'stride',
    orderIndex: 0,
    canvasData: {
      nodes: [
        {
          id: 'actor-1',
          type: 'actor',
          position: { x: 50, y: 200 },
          data: { label: 'Customer', description: 'End user making payment' },
        },
        {
          id: 'process-1',
          type: 'process',
          position: { x: 300, y: 180 },
          data: { label: 'Payment Gateway', technology: 'Node.js', dataSensitivity: 'confidential' },
        },
        {
          id: 'process-2',
          type: 'process',
          position: { x: 550, y: 180 },
          data: { label: 'Payment Processor', technology: 'Java', dataSensitivity: 'confidential' },
        },
        {
          id: 'datastore-1',
          type: 'datastore',
          position: { x: 550, y: 350 },
          data: { label: 'Transaction DB', technology: 'PostgreSQL', dataSensitivity: 'confidential' },
        },
        {
          id: 'trust-boundary-1',
          type: 'trustBoundary',
          position: { x: 250, y: 100 },
          style: { width: 400, height: 320 },
          data: { label: 'PCI Zone', trustLevel: 'private_secured' },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'actor-1',
          target: 'process-1',
          type: 'dataFlow',
          data: { label: 'Payment Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII', 'Financial'] },
        },
        {
          id: 'edge-2',
          source: 'process-1',
          target: 'process-2',
          type: 'dataFlow',
          data: { label: 'Process Payment', protocol: 'gRPC', encrypted: true, authenticated: true, dataClassification: ['Financial'] },
        },
        {
          id: 'edge-3',
          source: 'process-2',
          target: 'datastore-1',
          type: 'dataFlow',
          data: { label: 'Store Transaction', protocol: 'SQL', encrypted: true, dataClassification: ['Financial'] },
        },
      ],
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  },
  {
    id: 'diagram-2',
    threatModelId: '2',
    slug: 'auth-flow-dfd',
    title: 'Authentication Flow',
    description: 'User authentication and session management',
    diagramType: 'dataflow',
    threatFramework: 'stride',
    orderIndex: 0,
    canvasData: {
      nodes: [
        {
          id: 'actor-1',
          type: 'actor',
          position: { x: 50, y: 150 },
          data: { label: 'User', description: 'Application user' },
        },
        {
          id: 'process-1',
          type: 'process',
          position: { x: 250, y: 130 },
          data: { label: 'Auth Service', technology: 'Node.js', dataSensitivity: 'confidential' },
        },
        {
          id: 'datastore-1',
          type: 'datastore',
          position: { x: 250, y: 300 },
          data: { label: 'User Store', technology: 'PostgreSQL', dataSensitivity: 'confidential' },
        },
        {
          id: 'process-2',
          type: 'process',
          position: { x: 500, y: 130 },
          data: { label: 'Token Service', technology: 'Go', dataSensitivity: 'confidential' },
        },
        {
          id: 'datastore-2',
          type: 'datastore',
          position: { x: 500, y: 300 },
          data: { label: 'Session Cache', technology: 'Redis', dataSensitivity: 'internal' },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'actor-1',
          target: 'process-1',
          type: 'dataFlow',
          data: { label: 'Login Request', protocol: 'HTTPS', encrypted: true, dataClassification: ['PII'] },
        },
        {
          id: 'edge-2',
          source: 'process-1',
          target: 'datastore-1',
          type: 'dataFlow',
          data: { label: 'Verify Credentials', protocol: 'SQL', encrypted: true, dataClassification: ['PII'] },
        },
        {
          id: 'edge-3',
          source: 'process-1',
          target: 'process-2',
          type: 'dataFlow',
          data: { label: 'Generate Token', protocol: 'gRPC', encrypted: true, authenticated: true },
        },
        {
          id: 'edge-4',
          source: 'process-2',
          target: 'datastore-2',
          type: 'dataFlow',
          data: { label: 'Store Session', protocol: 'TCP', encrypted: true },
        },
      ],
    },
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-18T11:00:00Z',
  },
]

// Mock data - DFD Templates
const dfdTemplates = [
  {
    id: 'template-1',
    name: 'Basic Web Application',
    description: 'Standard 3-tier web application with user, frontend, backend, and database',
    category: 'web_application',
    tags: ['web', 'frontend', 'backend', 'database'],
    templateData: {
      nodes: [
        { id: 'actor-1', type: 'actor', position: { x: 50, y: 150 }, data: { label: 'User' } },
        { id: 'process-1', type: 'process', position: { x: 250, y: 130 }, data: { label: 'Web Frontend', technology: 'React' } },
        { id: 'process-2', type: 'process', position: { x: 450, y: 130 }, data: { label: 'API Backend', technology: 'Node.js' } },
        { id: 'datastore-1', type: 'datastore', position: { x: 450, y: 300 }, data: { label: 'Database', technology: 'PostgreSQL' } },
      ],
      edges: [
        { id: 'edge-1', source: 'actor-1', target: 'process-1', type: 'dataFlow', data: { protocol: 'HTTPS', encrypted: true } },
        { id: 'edge-2', source: 'process-1', target: 'process-2', type: 'dataFlow', data: { protocol: 'HTTPS', encrypted: true } },
        { id: 'edge-3', source: 'process-2', target: 'datastore-1', type: 'dataFlow', data: { protocol: 'SQL', encrypted: true } },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 45,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'template-2',
    name: 'Microservices with API Gateway',
    description: 'Microservices architecture with API gateway, service mesh, and shared database',
    category: 'microservices',
    tags: ['microservices', 'api-gateway', 'kubernetes', 'docker'],
    templateData: {
      nodes: [
        { id: 'actor-1', type: 'actor', position: { x: 50, y: 200 }, data: { label: 'Client' } },
        { id: 'process-1', type: 'process', position: { x: 250, y: 180 }, data: { label: 'API Gateway', technology: 'Kong' } },
        { id: 'process-2', type: 'process', position: { x: 500, y: 100 }, data: { label: 'Service A', technology: 'Go' } },
        { id: 'process-3', type: 'process', position: { x: 500, y: 250 }, data: { label: 'Service B', technology: 'Node.js' } },
        { id: 'datastore-1', type: 'datastore', position: { x: 700, y: 180 }, data: { label: 'Shared DB', technology: 'PostgreSQL' } },
        { id: 'system-boundary-1', type: 'systemBoundary', position: { x: 200, y: 50 }, style: { width: 550, height: 300 }, data: { label: 'Kubernetes Cluster' } },
      ],
      edges: [
        { id: 'edge-1', source: 'actor-1', target: 'process-1', type: 'dataFlow', data: { protocol: 'HTTPS', encrypted: true } },
        { id: 'edge-2', source: 'process-1', target: 'process-2', type: 'dataFlow', data: { protocol: 'gRPC', encrypted: true } },
        { id: 'edge-3', source: 'process-1', target: 'process-3', type: 'dataFlow', data: { protocol: 'gRPC', encrypted: true } },
        { id: 'edge-4', source: 'process-2', target: 'datastore-1', type: 'dataFlow', data: { protocol: 'SQL', encrypted: true } },
        { id: 'edge-5', source: 'process-3', target: 'datastore-1', type: 'dataFlow', data: { protocol: 'SQL', encrypted: true } },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 32,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'template-3',
    name: 'AWS Serverless',
    description: 'Serverless architecture with Lambda, API Gateway, and DynamoDB',
    category: 'cloud_infrastructure',
    tags: ['aws', 'serverless', 'lambda', 'dynamodb', 'api-gateway'],
    templateData: {
      nodes: [
        { id: 'actor-1', type: 'actor', position: { x: 50, y: 150 }, data: { label: 'Client' } },
        { id: 'process-1', type: 'process', position: { x: 250, y: 130 }, data: { label: 'API Gateway', technology: 'AWS API Gateway' } },
        { id: 'process-2', type: 'process', position: { x: 450, y: 130 }, data: { label: 'Lambda Function', technology: 'AWS Lambda' } },
        { id: 'datastore-1', type: 'datastore', position: { x: 650, y: 130 }, data: { label: 'DynamoDB', technology: 'AWS DynamoDB' } },
        { id: 'trust-boundary-1', type: 'trustBoundary', position: { x: 200, y: 50 }, style: { width: 500, height: 200 }, data: { label: 'AWS VPC', trustLevel: 'private_secured' } },
      ],
      edges: [
        { id: 'edge-1', source: 'actor-1', target: 'process-1', type: 'dataFlow', data: { protocol: 'HTTPS', encrypted: true } },
        { id: 'edge-2', source: 'process-1', target: 'process-2', type: 'dataFlow', data: { protocol: 'HTTPS', encrypted: true } },
        { id: 'edge-3', source: 'process-2', target: 'datastore-1', type: 'dataFlow', data: { protocol: 'HTTPS', encrypted: true } },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 28,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

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
      id: `tm-${Date.now()}`,
      ...body,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    // Add to mock data so subsequent GETs can find it
    threatModels.push(newModel as typeof threatModels[0])
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

  // ===== DIAGRAM ENDPOINTS =====

  // Get diagrams for a threat model
  http.get(`${API_BASE}/threat-models/:threatModelId/diagrams`, ({ params }) => {
    const { threatModelId } = params
    const modelDiagrams = diagrams.filter((d) => d.threatModelId === threatModelId)
    return HttpResponse.json(modelDiagrams)
  }),

  // Get single diagram
  http.get(`${API_BASE}/diagrams/:id`, ({ params }) => {
    const { id } = params
    const diagram = diagrams.find((d) => d.id === id || d.slug === id)
    if (!diagram) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(diagram)
  }),

  // Create diagram
  http.post(`${API_BASE}/diagrams`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const newDiagram = {
      id: `diag-${Date.now()}`,
      slug: String(body.title || 'untitled').toLowerCase().replace(/\s+/g, '-'),
      diagramType: 'dataflow',
      threatFramework: 'stride',
      orderIndex: 0,
      canvasData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    // Add to mock data so subsequent GETs can find it
    diagrams.push(newDiagram as typeof diagrams[0])
    return HttpResponse.json(newDiagram, { status: 201 })
  }),

  // Update diagram (save canvas)
  http.patch(`${API_BASE}/diagrams/:id`, async ({ params, request }) => {
    const { id } = params
    const body = (await request.json()) as Record<string, unknown>
    const diagram = diagrams.find((d) => d.id === id || d.slug === id)
    if (!diagram) {
      return new HttpResponse(null, { status: 404 })
    }
    const updated = {
      ...diagram,
      ...body,
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json(updated)
  }),

  // Delete diagram
  http.delete(`${API_BASE}/diagrams/:id`, ({ params }) => {
    const { id } = params
    const index = diagrams.findIndex((d) => d.id === id || d.slug === id)
    if (index === -1) {
      return new HttpResponse(null, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // ===== TEMPLATE ENDPOINTS =====

  // Get all templates
  http.get(`${API_BASE}/dfd-templates`, ({ request }) => {
    const url = new URL(request.url)
    const orderBy = url.searchParams.get('order_by') || '-use_count'

    let sorted = [...dfdTemplates]
    if (orderBy === '-use_count') {
      sorted.sort((a, b) => b.useCount - a.useCount)
    } else if (orderBy === '-created_at') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (orderBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    }

    return HttpResponse.json(sorted)
  }),

  // Get single template
  http.get(`${API_BASE}/dfd-templates/:id`, ({ params }) => {
    const { id } = params
    const template = dfdTemplates.find((t) => t.id === id)
    if (!template) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(template)
  }),

  // Create template
  http.post(`${API_BASE}/dfd-templates`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    const newTemplate = {
      id: `template-${Date.now()}`,
      isPublic: true,
      useCount: 0,
      createdBy: 'current-user',
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return HttpResponse.json(newTemplate, { status: 201 })
  }),

  // Use template (increment counter)
  http.post(`${API_BASE}/dfd-templates/:id/use_template`, ({ params }) => {
    const { id } = params
    const template = dfdTemplates.find((t) => t.id === id)
    if (!template) {
      return new HttpResponse(null, { status: 404 })
    }
    template.useCount += 1
    return HttpResponse.json({ success: true })
  }),
]
