import { http, HttpResponse } from 'msw'

// Base API URL - will match your Django backend later
const API_BASE = '/api'

export const handlers = [
  // Example: Get all threat models
  http.get(`${API_BASE}/threat-models`, () => {
    return HttpResponse.json([
      {
        id: '1',
        name: 'Payment Processing System',
        description: 'Threat model for payment flow',
        criticality: 'high',
        status: 'in_progress',
        frameworks: ['PCI-DSS', 'DORA'],
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T14:30:00Z',
      },
      {
        id: '2',
        name: 'User Authentication Service',
        description: 'Auth and identity management',
        criticality: 'critical',
        status: 'approved',
        frameworks: ['SOC2', 'ISO27001'],
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-18T11:00:00Z',
      },
    ])
  }),

  // Example: Get single threat model
  http.get(`${API_BASE}/threat-models/:id`, ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      id,
      name: 'Payment Processing System',
      description: 'Threat model for payment flow',
      criticality: 'high',
      status: 'in_progress',
      frameworks: ['PCI-DSS', 'DORA'],
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
    })
  }),

  // Example: Get compliance frameworks
  http.get(`${API_BASE}/frameworks`, () => {
    return HttpResponse.json([
      { id: '1', name: 'PCI-DSS', description: 'Payment Card Industry Data Security Standard' },
      { id: '2', name: 'DORA', description: 'Digital Operational Resilience Act' },
      { id: '3', name: 'SOC2', description: 'Service Organization Control 2' },
      { id: '4', name: 'ISO27001', description: 'Information Security Management' },
      { id: '5', name: 'CRA', description: 'Cyber Resilience Act' },
    ])
  }),

  // Add more handlers as you build features
]
