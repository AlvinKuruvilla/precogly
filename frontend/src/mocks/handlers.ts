import { http, HttpResponse } from 'msw'

// Base API URL - will match your Django backend later
const API_BASE = '/api'

// ============ localStorage Persistence ============
// This keeps mock data alive across HMR reloads during development.
// Delete this entire section (and handlers.ts) when real backend is ready.

const STORAGE_KEYS = {
  diagrams: 'precogly_mock_diagrams',
  threatModels: 'precogly_mock_threatModels',
} as const

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save mock data to localStorage:', e)
  }
}

// ============ Default Mock Data ============

const DEFAULT_DIAGRAMS = [
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
  // ============ BANKING TEMPLATES ============
  {
    id: 'banking-swift-payments',
    name: 'SWIFT International Payments',
    description: 'Cross-border payment processing via SWIFT network with Alliance Lite2 gateway, sanctions screening, and core banking integration. Includes proper trust boundaries for DMZ, processing, and internal zones.',
    category: 'payment_processing',
    tags: ['swift', 'banking', 'payments', 'cross-border', 'sanctions', 'aml', 'azure', 'compliance'],
    templateData: {
      nodes: [
        // ===== SYSTEM BOUNDARY (outermost container) =====
        // All other nodes use absolute positions and are visually contained
        {
          id: 'system-swift',
          type: 'systemBoundary',
          position: { x: 0, y: 0 },
          style: { width: 1420, height: 700 },
          data: {
            label: 'SWIFT International Payments',
            owner: 'Treasury & Payments',
            classification: 'Critical'
          }
        },

        // ===== TRUST BOUNDARIES (absolute positions inside system boundary) =====
        // Internet Zone (External Partners) - RED
        {
          id: 'tb-internet',
          type: 'trustBoundary',
          position: { x: 20, y: 80 },
          style: { width: 180, height: 320 },
          data: {
            label: 'Internet Zone',
            trustLevel: 'internet',
            technology: 'Public Network'
          }
        },
        // DMZ / Perimeter Zone - YELLOW
        {
          id: 'tb-dmz',
          type: 'trustBoundary',
          position: { x: 220, y: 80 },
          style: { width: 280, height: 500 },
          data: {
            label: 'DMZ / Perimeter',
            trustLevel: 'trusted_partner',
            technology: 'Azure Front Door'
          }
        },
        // Private Processing Zone - BLUE
        {
          id: 'tb-private',
          type: 'trustBoundary',
          position: { x: 520, y: 80 },
          style: { width: 420, height: 500 },
          data: {
            label: 'Private Processing Zone',
            trustLevel: 'private_secured',
            technology: 'Azure VNet (Private)'
          }
        },
        // Internal / Core Banking Zone - GREEN
        {
          id: 'tb-internal',
          type: 'trustBoundary',
          position: { x: 960, y: 80 },
          style: { width: 440, height: 500 },
          data: {
            label: 'Internal Zone',
            trustLevel: 'internal',
            technology: 'On-Premises / Private Cloud'
          }
        },

        // ===== ACTORS (absolute positions) =====
        // Correspondent Bank (External) - inside Internet Zone
        {
          id: 'actor-correspondent',
          type: 'actor',
          position: { x: 55, y: 150 },
          data: {
            label: 'Correspondent Bank',
            actorType: 'external',
            description: 'Partner bank initiating/receiving SWIFT messages (MT103, MT202)'
          }
        },
        // SWIFTNet (External System) - inside Internet Zone
        {
          id: 'actor-swiftnet',
          type: 'actor',
          position: { x: 55, y: 280 },
          data: {
            label: 'SWIFTNet',
            actorType: 'system',
            description: 'SWIFT secure messaging network (FIN, InterAct)'
          }
        },
        // Bank Operations User (Internal) - below boundaries
        {
          id: 'actor-ops-user',
          type: 'actor',
          position: { x: 55, y: 620 },
          data: {
            label: 'Bank Operations',
            actorType: 'user',
            description: 'Treasury operations staff for manual review and release'
          }
        },

        // ===== PROCESSES - DMZ (absolute positions inside DMZ boundary) =====
        // Azure WAF
        {
          id: 'process-waf',
          type: 'process',
          position: { x: 280, y: 150 },
          data: {
            label: 'Azure WAF',
            technology: 'Azure Application Gateway',
            description: 'Web Application Firewall - traffic inspection and DDoS protection',
            dataSensitivity: 'confidential'
          }
        },
        // SWIFT Alliance Lite2
        {
          id: 'process-alliance',
          type: 'process',
          position: { x: 280, y: 280 },
          data: {
            label: 'SWIFT Alliance Lite2',
            technology: 'Azure (HSM-backed)',
            description: 'SWIFT messaging gateway with hardware security module for key management',
            dataSensitivity: 'confidential'
          }
        },
        // Message Validation
        {
          id: 'process-validation',
          type: 'process',
          position: { x: 280, y: 410 },
          data: {
            label: 'Message Validation',
            technology: 'Azure Functions',
            description: 'SWIFT message format validation (MT/MX) and schema compliance',
            dataSensitivity: 'confidential'
          }
        },

        // ===== PROCESSES - PRIVATE ZONE (absolute positions inside Private boundary) =====
        // Payment Gateway
        {
          id: 'process-payment-gw',
          type: 'process',
          position: { x: 570, y: 150 },
          data: {
            label: 'Payment Gateway',
            technology: 'Azure Kubernetes (AKS)',
            description: 'Payment orchestration - routing, enrichment, and workflow management',
            dataSensitivity: 'confidential'
          }
        },
        // Sanctions Screening
        {
          id: 'process-sanctions',
          type: 'process',
          position: { x: 750, y: 150 },
          data: {
            label: 'Sanctions Screening',
            technology: 'Fircosoft / Azure',
            description: 'Real-time AML/KYC checks against OFAC, EU, UN sanctions lists',
            dataSensitivity: 'confidential'
          }
        },
        // Message Queue
        {
          id: 'process-queue',
          type: 'process',
          position: { x: 570, y: 280 },
          data: {
            label: 'Message Queue',
            technology: 'Azure Service Bus',
            description: 'Async message processing with guaranteed delivery and dead-letter handling',
            dataSensitivity: 'confidential'
          }
        },
        // Nostro/Vostro Reconciliation
        {
          id: 'process-reconciliation',
          type: 'process',
          position: { x: 750, y: 280 },
          data: {
            label: 'Reconciliation Engine',
            technology: 'Azure Batch',
            description: 'Nostro/Vostro account reconciliation and exception handling',
            dataSensitivity: 'confidential'
          }
        },
        // Fraud Detection
        {
          id: 'process-fraud',
          type: 'process',
          position: { x: 660, y: 410 },
          data: {
            label: 'Fraud Detection',
            technology: 'Azure ML',
            description: 'ML-based anomaly detection for payment fraud patterns',
            dataSensitivity: 'confidential'
          }
        },

        // ===== PROCESSES - INTERNAL ZONE (absolute positions inside Internal boundary) =====
        // Core Banking Integration
        {
          id: 'process-core-banking',
          type: 'process',
          position: { x: 1020, y: 150 },
          data: {
            label: 'Core Banking Integration',
            technology: 'Temenos T24 / SAP',
            description: 'Integration layer for general ledger posting and account updates',
            dataSensitivity: 'confidential'
          }
        },
        // Notification Service
        {
          id: 'process-notification',
          type: 'process',
          position: { x: 1200, y: 150 },
          data: {
            label: 'Notification Service',
            technology: 'Azure Logic Apps',
            description: 'Customer and ops notifications via email, SMS, and portal',
            dataSensitivity: 'internal'
          }
        },

        // ===== DATA STORES - PRIVATE ZONE =====
        {
          id: 'datastore-payments',
          type: 'datastore',
          position: { x: 570, y: 500 },
          data: {
            label: 'Payment Messages DB',
            technology: 'Azure SQL (TDE)',
            description: 'Transaction records, payment status, and message metadata',
            dataSensitivity: 'confidential'
          }
        },

        // ===== DATA STORES - INTERNAL ZONE =====
        {
          id: 'datastore-archive',
          type: 'datastore',
          position: { x: 1020, y: 300 },
          data: {
            label: 'SWIFT Message Archive',
            technology: 'Azure Blob (WORM)',
            description: '7-year retention of SWIFT messages for regulatory compliance',
            dataSensitivity: 'confidential'
          }
        },
        {
          id: 'datastore-audit',
          type: 'datastore',
          position: { x: 1200, y: 300 },
          data: {
            label: 'Audit Log',
            technology: 'Azure Monitor / Splunk',
            description: 'Immutable audit trail for all payment operations',
            dataSensitivity: 'confidential'
          }
        },
        {
          id: 'datastore-gl',
          type: 'datastore',
          position: { x: 1110, y: 450 },
          data: {
            label: 'General Ledger',
            technology: 'Oracle / SAP HANA',
            description: 'Core banking ledger for account balances and postings',
            dataSensitivity: 'confidential'
          }
        },
      ],
      edges: [
        // ===== EXTERNAL TO DMZ =====
        {
          id: 'edge-correspondent-waf',
          source: 'actor-correspondent',
          target: 'process-waf',
          type: 'dataFlow',
          data: {
            label: 'Payment Instructions',
            protocol: 'HTTPS',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial', 'PII']
          }
        },
        {
          id: 'edge-swiftnet-alliance',
          source: 'actor-swiftnet',
          target: 'process-alliance',
          type: 'dataFlow',
          data: {
            label: 'MT103/MT202 Messages',
            protocol: 'Custom',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial', 'PII']
          }
        },

        // ===== DMZ INTERNAL FLOWS =====
        {
          id: 'edge-waf-alliance',
          source: 'process-waf',
          target: 'process-alliance',
          type: 'dataFlow',
          data: {
            label: 'Filtered Traffic',
            protocol: 'HTTPS',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial']
          }
        },
        {
          id: 'edge-alliance-validation',
          source: 'process-alliance',
          target: 'process-validation',
          type: 'dataFlow',
          data: {
            label: 'Raw SWIFT Messages',
            protocol: 'AMQP',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial', 'PII']
          }
        },

        // ===== DMZ TO PRIVATE ZONE =====
        {
          id: 'edge-validation-gateway',
          source: 'process-validation',
          target: 'process-payment-gw',
          type: 'dataFlow',
          data: {
            label: 'Validated Messages',
            protocol: 'HTTPS',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial', 'PII']
          }
        },

        // ===== PRIVATE ZONE FLOWS =====
        {
          id: 'edge-gateway-sanctions',
          source: 'process-payment-gw',
          target: 'process-sanctions',
          type: 'dataFlow',
          data: {
            label: 'Screening Request',
            protocol: 'HTTPS',
            encrypted: true,
            authenticated: true,
            dataClassification: ['PII', 'Financial']
          }
        },
        {
          id: 'edge-sanctions-gateway',
          source: 'process-sanctions',
          target: 'process-payment-gw',
          type: 'dataFlow',
          data: {
            label: 'Screening Result',
            protocol: 'HTTPS',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Confidential']
          }
        },
        {
          id: 'edge-gateway-queue',
          source: 'process-payment-gw',
          target: 'process-queue',
          type: 'dataFlow',
          data: {
            label: 'Payment Events',
            protocol: 'AMQP',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial']
          }
        },
        {
          id: 'edge-gateway-fraud',
          source: 'process-payment-gw',
          target: 'process-fraud',
          type: 'dataFlow',
          data: {
            label: 'Transaction Data',
            protocol: 'HTTPS',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial', 'PII']
          }
        },
        {
          id: 'edge-queue-reconciliation',
          source: 'process-queue',
          target: 'process-reconciliation',
          type: 'dataFlow',
          data: {
            label: 'Settlement Events',
            protocol: 'AMQP',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial']
          }
        },
        {
          id: 'edge-gateway-db',
          source: 'process-payment-gw',
          target: 'datastore-payments',
          type: 'dataFlow',
          data: {
            label: 'Transaction Records',
            protocol: 'SQL',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial', 'PII']
          }
        },

        // ===== PRIVATE TO INTERNAL ZONE =====
        {
          id: 'edge-queue-corebanking',
          source: 'process-queue',
          target: 'process-core-banking',
          type: 'dataFlow',
          data: {
            label: 'Posting Instructions',
            protocol: 'HTTPS',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial']
          }
        },
        {
          id: 'edge-reconciliation-corebanking',
          source: 'process-reconciliation',
          target: 'process-core-banking',
          type: 'dataFlow',
          data: {
            label: 'Reconciliation Updates',
            protocol: 'HTTPS',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial']
          }
        },

        // ===== INTERNAL ZONE FLOWS =====
        {
          id: 'edge-corebanking-gl',
          source: 'process-core-banking',
          target: 'datastore-gl',
          type: 'dataFlow',
          data: {
            label: 'Ledger Postings',
            protocol: 'SQL',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial']
          }
        },
        {
          id: 'edge-corebanking-archive',
          source: 'process-core-banking',
          target: 'datastore-archive',
          type: 'dataFlow',
          data: {
            label: 'Message Archive',
            protocol: 'HTTPS',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial', 'PII']
          }
        },
        {
          id: 'edge-corebanking-audit',
          source: 'process-core-banking',
          target: 'datastore-audit',
          type: 'dataFlow',
          data: {
            label: 'Audit Events',
            protocol: 'HTTPS',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Confidential']
          }
        },
        {
          id: 'edge-corebanking-notification',
          source: 'process-core-banking',
          target: 'process-notification',
          type: 'dataFlow',
          data: {
            label: 'Status Updates',
            protocol: 'HTTPS',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Internal']
          }
        },

        // ===== OPS USER ACCESS =====
        {
          id: 'edge-ops-gateway',
          source: 'actor-ops-user',
          target: 'process-payment-gw',
          type: 'dataFlow',
          data: {
            label: 'Manual Review/Release',
            protocol: 'HTTPS',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial', 'PII']
          }
        },

        // ===== OUTBOUND TO SWIFT =====
        {
          id: 'edge-alliance-swiftnet',
          source: 'process-alliance',
          target: 'actor-swiftnet',
          type: 'dataFlow',
          data: {
            label: 'Outbound MT Messages',
            protocol: 'Custom',
            encrypted: true,
            authenticated: true,
            dataClassification: ['Financial', 'PII']
          }
        },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 127,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },

  // ============ MOBILE BANKING APPLICATION ============
  {
    id: 'banking-mobile-app',
    name: 'Mobile Banking Application',
    description: 'Customer-facing mobile banking with biometric authentication, account management, transfers, and push notifications. Includes API gateway, BFF pattern, and secure token management.',
    category: 'mobile_application',
    tags: ['mobile', 'banking', 'ios', 'android', 'biometric', 'oauth', 'aws', 'authentication'],
    templateData: {
      nodes: [
        // System Boundary
        {
          id: 'system-mobile',
          type: 'systemBoundary',
          position: { x: 0, y: 0 },
          style: { width: 1400, height: 680 },
          data: {
            label: 'Mobile Banking Application',
            owner: 'Digital Banking',
            classification: 'Critical'
          }
        },
        // Trust Boundaries
        {
          id: 'tb-internet',
          type: 'trustBoundary',
          position: { x: 20, y: 80 },
          style: { width: 180, height: 400 },
          data: { label: 'Internet Zone', trustLevel: 'internet', technology: 'Public Network' }
        },
        {
          id: 'tb-dmz',
          type: 'trustBoundary',
          position: { x: 220, y: 80 },
          style: { width: 300, height: 480 },
          data: { label: 'DMZ / API Layer', trustLevel: 'trusted_partner', technology: 'AWS CloudFront + WAF' }
        },
        {
          id: 'tb-private',
          type: 'trustBoundary',
          position: { x: 540, y: 80 },
          style: { width: 420, height: 480 },
          data: { label: 'Private Services Zone', trustLevel: 'private_secured', technology: 'AWS VPC (Private Subnets)' }
        },
        {
          id: 'tb-internal',
          type: 'trustBoundary',
          position: { x: 980, y: 80 },
          style: { width: 400, height: 480 },
          data: { label: 'Internal Zone', trustLevel: 'internal', technology: 'On-Premises / Direct Connect' }
        },
        // Actors
        {
          id: 'actor-customer',
          type: 'actor',
          position: { x: 55, y: 150 },
          data: { label: 'Bank Customer', actorType: 'user', description: 'Mobile app user (iOS/Android)' }
        },
        {
          id: 'actor-push',
          type: 'actor',
          position: { x: 55, y: 300 },
          data: { label: 'Push Services', actorType: 'system', description: 'APNs / Firebase Cloud Messaging' }
        },
        // DMZ Processes
        {
          id: 'process-cdn',
          type: 'process',
          position: { x: 280, y: 150 },
          data: { label: 'CDN / WAF', technology: 'AWS CloudFront', description: 'Content delivery and DDoS protection', dataSensitivity: 'internal' }
        },
        {
          id: 'process-apigw',
          type: 'process',
          position: { x: 280, y: 280 },
          data: { label: 'API Gateway', technology: 'AWS API Gateway', description: 'Rate limiting, request validation, API versioning', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-oauth',
          type: 'process',
          position: { x: 280, y: 410 },
          data: { label: 'OAuth Server', technology: 'AWS Cognito', description: 'Token issuance, refresh, biometric binding', dataSensitivity: 'confidential' }
        },
        // Private Zone Processes
        {
          id: 'process-bff',
          type: 'process',
          position: { x: 600, y: 150 },
          data: { label: 'Mobile BFF', technology: 'AWS ECS (Node.js)', description: 'Backend-for-Frontend - mobile-optimized API aggregation', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-accounts',
          type: 'process',
          position: { x: 780, y: 150 },
          data: { label: 'Account Service', technology: 'AWS Lambda', description: 'Balance inquiries, transaction history, statements', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-transfers',
          type: 'process',
          position: { x: 600, y: 280 },
          data: { label: 'Transfer Service', technology: 'AWS ECS', description: 'Internal transfers, beneficiary management', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-notifications',
          type: 'process',
          position: { x: 780, y: 280 },
          data: { label: 'Notification Service', technology: 'AWS SNS', description: 'Push notifications, alerts, marketing', dataSensitivity: 'internal' }
        },
        {
          id: 'datastore-session',
          type: 'datastore',
          position: { x: 600, y: 420 },
          data: { label: 'Session Store', technology: 'AWS ElastiCache (Redis)', description: 'Session tokens, device fingerprints', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-userprefs',
          type: 'datastore',
          position: { x: 780, y: 420 },
          data: { label: 'User Preferences', technology: 'AWS DynamoDB', description: 'App settings, notification preferences', dataSensitivity: 'internal' }
        },
        // Internal Zone
        {
          id: 'process-core',
          type: 'process',
          position: { x: 1040, y: 150 },
          data: { label: 'Core Banking API', technology: 'Temenos Transact', description: 'Account master, balance, transaction posting', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-fraud',
          type: 'process',
          position: { x: 1200, y: 150 },
          data: { label: 'Fraud Engine', technology: 'FICO / SAS', description: 'Real-time transaction scoring', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-customers',
          type: 'datastore',
          position: { x: 1040, y: 300 },
          data: { label: 'Customer DB', technology: 'Oracle (TDE)', description: 'Customer master data, KYC status', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-audit',
          type: 'datastore',
          position: { x: 1200, y: 300 },
          data: { label: 'Audit Log', technology: 'Splunk', description: 'Security events, login attempts, transactions', dataSensitivity: 'confidential' }
        },
      ],
      edges: [
        { id: 'e1', source: 'actor-customer', target: 'process-cdn', type: 'dataFlow', data: { label: 'App Requests', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e2', source: 'process-cdn', target: 'process-apigw', type: 'dataFlow', data: { label: 'Filtered Traffic', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e3', source: 'process-apigw', target: 'process-oauth', type: 'dataFlow', data: { label: 'Auth Requests', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e4', source: 'process-apigw', target: 'process-bff', type: 'dataFlow', data: { label: 'API Calls', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e5', source: 'process-bff', target: 'process-accounts', type: 'dataFlow', data: { label: 'Account Queries', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e6', source: 'process-bff', target: 'process-transfers', type: 'dataFlow', data: { label: 'Transfer Requests', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e7', source: 'process-transfers', target: 'process-fraud', type: 'dataFlow', data: { label: 'Fraud Check', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e8', source: 'process-bff', target: 'datastore-session', type: 'dataFlow', data: { label: 'Session Data', protocol: 'TCP', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e9', source: 'process-notifications', target: 'datastore-userprefs', type: 'dataFlow', data: { label: 'Preferences', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Internal'] } },
        { id: 'e10', source: 'process-notifications', target: 'actor-push', type: 'dataFlow', data: { label: 'Push Messages', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Internal'] } },
        { id: 'e11', source: 'process-accounts', target: 'process-core', type: 'dataFlow', data: { label: 'Core API Calls', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e12', source: 'process-transfers', target: 'process-core', type: 'dataFlow', data: { label: 'Posting Instructions', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e13', source: 'process-core', target: 'datastore-customers', type: 'dataFlow', data: { label: 'Customer Data', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['PII', 'Financial'] } },
        { id: 'e14', source: 'process-oauth', target: 'datastore-audit', type: 'dataFlow', data: { label: 'Auth Events', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 98,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },

  // ============ PSD2 OPEN BANKING APIs ============
  {
    id: 'banking-psd2-openbanking',
    name: 'PSD2 Open Banking APIs',
    description: 'EU PSD2-compliant Open Banking platform with Account Information Services (AIS), Payment Initiation Services (PIS), and Confirmation of Funds (CoF). Includes TPP onboarding, consent management, and strong customer authentication (SCA).',
    category: 'api_gateway',
    tags: ['psd2', 'open-banking', 'tpp', 'aisp', 'pisp', 'sca', 'eu-regulation', 'azure', 'api'],
    templateData: {
      nodes: [
        // System Boundary
        {
          id: 'system-psd2',
          type: 'systemBoundary',
          position: { x: 0, y: 0 },
          style: { width: 1420, height: 700 },
          data: { label: 'PSD2 Open Banking Platform', owner: 'Open Banking & API', classification: 'Critical' }
        },
        // Trust Boundaries
        {
          id: 'tb-internet',
          type: 'trustBoundary',
          position: { x: 20, y: 80 },
          style: { width: 200, height: 400 },
          data: { label: 'Internet Zone', trustLevel: 'internet', technology: 'Public Network' }
        },
        {
          id: 'tb-dmz',
          type: 'trustBoundary',
          position: { x: 240, y: 80 },
          style: { width: 320, height: 500 },
          data: { label: 'API Gateway Zone', trustLevel: 'trusted_partner', technology: 'Azure API Management' }
        },
        {
          id: 'tb-private',
          type: 'trustBoundary',
          position: { x: 580, y: 80 },
          style: { width: 420, height: 500 },
          data: { label: 'Open Banking Services', trustLevel: 'private_secured', technology: 'Azure VNet' }
        },
        {
          id: 'tb-internal',
          type: 'trustBoundary',
          position: { x: 1020, y: 80 },
          style: { width: 380, height: 500 },
          data: { label: 'Core Banking Zone', trustLevel: 'internal', technology: 'On-Premises' }
        },
        // Actors
        {
          id: 'actor-tpp',
          type: 'actor',
          position: { x: 55, y: 150 },
          data: { label: 'Third Party Provider', actorType: 'external', description: 'Licensed AISP/PISP (e.g., Plaid, Tink)' }
        },
        {
          id: 'actor-customer',
          type: 'actor',
          position: { x: 55, y: 300 },
          data: { label: 'Bank Customer', actorType: 'user', description: 'PSU granting consent via redirect' }
        },
        {
          id: 'actor-regulator',
          type: 'actor',
          position: { x: 55, y: 620 },
          data: { label: 'Regulatory Authority', actorType: 'external', description: 'DNB / EBA TPP Registry' }
        },
        // DMZ Processes
        {
          id: 'process-apim',
          type: 'process',
          position: { x: 300, y: 150 },
          data: { label: 'API Management', technology: 'Azure APIM', description: 'Rate limiting, TPP certificate validation, API versioning', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-tpp-auth',
          type: 'process',
          position: { x: 300, y: 280 },
          data: { label: 'TPP Authentication', technology: 'eIDAS / QWAC', description: 'Qualified certificate validation, PSD2 roles check', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-sca',
          type: 'process',
          position: { x: 300, y: 410 },
          data: { label: 'SCA Service', technology: 'Azure AD B2C', description: 'Strong Customer Authentication - redirect flow', dataSensitivity: 'confidential' }
        },
        // Private Zone Processes
        {
          id: 'process-consent',
          type: 'process',
          position: { x: 640, y: 150 },
          data: { label: 'Consent Manager', technology: 'Azure Functions', description: 'Consent lifecycle - create, view, revoke', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-ais',
          type: 'process',
          position: { x: 820, y: 150 },
          data: { label: 'AIS Service', technology: 'Azure AKS', description: 'Account Information Service - balances, transactions', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-pis',
          type: 'process',
          position: { x: 640, y: 280 },
          data: { label: 'PIS Service', technology: 'Azure AKS', description: 'Payment Initiation Service - SEPA transfers', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-cof',
          type: 'process',
          position: { x: 820, y: 280 },
          data: { label: 'CoF Service', technology: 'Azure Functions', description: 'Confirmation of Funds - yes/no response', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-consents',
          type: 'datastore',
          position: { x: 640, y: 420 },
          data: { label: 'Consent Store', technology: 'Azure Cosmos DB', description: 'PSU consents with expiry and scope', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-tppregistry',
          type: 'datastore',
          position: { x: 820, y: 420 },
          data: { label: 'TPP Registry Cache', technology: 'Azure Redis', description: 'Cached TPP licenses and certificates', dataSensitivity: 'internal' }
        },
        // Internal Zone
        {
          id: 'process-core',
          type: 'process',
          position: { x: 1080, y: 150 },
          data: { label: 'Core Banking Gateway', technology: 'MuleSoft / SAP', description: 'Account and payment APIs', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-payments',
          type: 'process',
          position: { x: 1240, y: 150 },
          data: { label: 'Payment Engine', technology: 'Finastra', description: 'SEPA payment processing', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-accounts',
          type: 'datastore',
          position: { x: 1080, y: 300 },
          data: { label: 'Account Master', technology: 'Oracle DB', description: 'Account balances and transactions', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-audit',
          type: 'datastore',
          position: { x: 1240, y: 300 },
          data: { label: 'PSD2 Audit Log', technology: 'Azure Monitor', description: 'Regulatory audit trail - 5 year retention', dataSensitivity: 'confidential' }
        },
      ],
      edges: [
        { id: 'e1', source: 'actor-tpp', target: 'process-apim', type: 'dataFlow', data: { label: 'API Requests (mTLS)', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e2', source: 'process-apim', target: 'process-tpp-auth', type: 'dataFlow', data: { label: 'Certificate Validation', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e3', source: 'actor-customer', target: 'process-sca', type: 'dataFlow', data: { label: 'SCA Redirect', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e4', source: 'process-sca', target: 'process-consent', type: 'dataFlow', data: { label: 'Consent Grant', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e5', source: 'process-apim', target: 'process-ais', type: 'dataFlow', data: { label: 'AIS Requests', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e6', source: 'process-apim', target: 'process-pis', type: 'dataFlow', data: { label: 'PIS Requests', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e7', source: 'process-apim', target: 'process-cof', type: 'dataFlow', data: { label: 'CoF Requests', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e8', source: 'process-ais', target: 'process-consent', type: 'dataFlow', data: { label: 'Consent Check', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e9', source: 'process-consent', target: 'datastore-consents', type: 'dataFlow', data: { label: 'Consent CRUD', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e10', source: 'process-tpp-auth', target: 'datastore-tppregistry', type: 'dataFlow', data: { label: 'TPP Lookup', protocol: 'TCP', encrypted: true, authenticated: true, dataClassification: ['Internal'] } },
        { id: 'e11', source: 'process-ais', target: 'process-core', type: 'dataFlow', data: { label: 'Account Data', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e12', source: 'process-pis', target: 'process-payments', type: 'dataFlow', data: { label: 'Payment Initiation', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e13', source: 'process-core', target: 'datastore-accounts', type: 'dataFlow', data: { label: 'Account Queries', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e14', source: 'process-apim', target: 'datastore-audit', type: 'dataFlow', data: { label: 'API Audit Events', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e15', source: 'actor-regulator', target: 'datastore-tppregistry', type: 'dataFlow', data: { label: 'TPP Registry Sync', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Internal'] } },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 89,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },

  // ============ iDEAL PAYMENT INTEGRATION ============
  {
    id: 'banking-ideal-payments',
    name: 'iDEAL Payment Integration',
    description: 'Dutch iDEAL online payment system integration for merchant acquiring. Includes Currence iDEAL hub connectivity, merchant onboarding, and settlement processing. Supports iDEAL 2.0 with improved UX.',
    category: 'payment_processing',
    tags: ['ideal', 'netherlands', 'dutch', 'payments', 'acquiring', 'merchant', 'currence', 'sepa'],
    templateData: {
      nodes: [
        // System Boundary
        {
          id: 'system-ideal',
          type: 'systemBoundary',
          position: { x: 0, y: 0 },
          style: { width: 1400, height: 680 },
          data: { label: 'iDEAL Payment Integration', owner: 'Merchant Services', classification: 'Critical' }
        },
        // Trust Boundaries
        {
          id: 'tb-internet',
          type: 'trustBoundary',
          position: { x: 20, y: 80 },
          style: { width: 200, height: 400 },
          data: { label: 'Internet Zone', trustLevel: 'internet', technology: 'Public Network' }
        },
        {
          id: 'tb-partner',
          type: 'trustBoundary',
          position: { x: 240, y: 80 },
          style: { width: 200, height: 400 },
          data: { label: 'Partner Network', trustLevel: 'trusted_partner', technology: 'Currence Dedicated Link' }
        },
        {
          id: 'tb-dmz',
          type: 'trustBoundary',
          position: { x: 460, y: 80 },
          style: { width: 300, height: 480 },
          data: { label: 'DMZ / Gateway', trustLevel: 'trusted_partner', technology: 'Azure Front Door' }
        },
        {
          id: 'tb-private',
          type: 'trustBoundary',
          position: { x: 780, y: 80 },
          style: { width: 320, height: 480 },
          data: { label: 'Processing Zone', trustLevel: 'private_secured', technology: 'Azure VNet' }
        },
        {
          id: 'tb-internal',
          type: 'trustBoundary',
          position: { x: 1120, y: 80 },
          style: { width: 260, height: 480 },
          data: { label: 'Internal Zone', trustLevel: 'internal', technology: 'Core Banking' }
        },
        // Actors
        {
          id: 'actor-consumer',
          type: 'actor',
          position: { x: 55, y: 150 },
          data: { label: 'Consumer', actorType: 'user', description: 'Dutch consumer paying via iDEAL' }
        },
        {
          id: 'actor-merchant',
          type: 'actor',
          position: { x: 55, y: 300 },
          data: { label: 'Merchant', actorType: 'external', description: 'Webshop accepting iDEAL payments' }
        },
        {
          id: 'actor-currence',
          type: 'actor',
          position: { x: 275, y: 150 },
          data: { label: 'Currence iDEAL Hub', actorType: 'system', description: 'iDEAL scheme operator and routing hub' }
        },
        {
          id: 'actor-issuer',
          type: 'actor',
          position: { x: 275, y: 300 },
          data: { label: 'Issuing Bank', actorType: 'system', description: 'Consumer\'s bank (e.g., ING, Rabobank)' }
        },
        // DMZ Processes
        {
          id: 'process-psp-gw',
          type: 'process',
          position: { x: 520, y: 150 },
          data: { label: 'PSP Gateway', technology: 'Azure APIM', description: 'Payment Service Provider interface for merchants', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-ideal-connector',
          type: 'process',
          position: { x: 520, y: 280 },
          data: { label: 'iDEAL Connector', technology: 'Azure Functions', description: 'Currence iDEAL protocol adapter (iDEAL 2.0)', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-bank-selector',
          type: 'process',
          position: { x: 520, y: 410 },
          data: { label: 'Bank Selector', technology: 'React (SPA)', description: 'iDEAL bank selection UI component', dataSensitivity: 'internal' }
        },
        // Private Zone
        {
          id: 'process-txn-orchestrator',
          type: 'process',
          position: { x: 840, y: 150 },
          data: { label: 'Transaction Orchestrator', technology: 'Azure Service Bus', description: 'Payment flow state machine and retry logic', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-settlement',
          type: 'process',
          position: { x: 840, y: 280 },
          data: { label: 'Settlement Engine', technology: 'Azure Batch', description: 'Merchant settlement and reconciliation', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-transactions',
          type: 'datastore',
          position: { x: 840, y: 420 },
          data: { label: 'Transaction Store', technology: 'Azure SQL', description: 'iDEAL transaction records and status', dataSensitivity: 'confidential' }
        },
        // Internal Zone
        {
          id: 'process-merchant-ledger',
          type: 'process',
          position: { x: 1170, y: 150 },
          data: { label: 'Merchant Ledger', technology: 'SAP', description: 'Merchant account balances and fees', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-merchants',
          type: 'datastore',
          position: { x: 1170, y: 280 },
          data: { label: 'Merchant Master', technology: 'Oracle DB', description: 'Merchant contracts and fee schedules', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-settlement',
          type: 'datastore',
          position: { x: 1170, y: 410 },
          data: { label: 'Settlement Files', technology: 'Azure Blob', description: 'SEPA batch files and reports', dataSensitivity: 'confidential' }
        },
      ],
      edges: [
        { id: 'e1', source: 'actor-merchant', target: 'process-psp-gw', type: 'dataFlow', data: { label: 'Payment Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e2', source: 'process-psp-gw', target: 'process-ideal-connector', type: 'dataFlow', data: { label: 'iDEAL Init', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e3', source: 'process-ideal-connector', target: 'actor-currence', type: 'dataFlow', data: { label: 'iDEAL Protocol', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e4', source: 'actor-currence', target: 'actor-issuer', type: 'dataFlow', data: { label: 'Issuer Routing', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e5', source: 'actor-consumer', target: 'process-bank-selector', type: 'dataFlow', data: { label: 'Bank Selection', protocol: 'HTTPS', encrypted: true, authenticated: false, dataClassification: ['Internal'] } },
        { id: 'e6', source: 'actor-consumer', target: 'actor-issuer', type: 'dataFlow', data: { label: 'Bank Login & Approval', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII', 'Financial'] } },
        { id: 'e7', source: 'process-ideal-connector', target: 'process-txn-orchestrator', type: 'dataFlow', data: { label: 'Transaction Events', protocol: 'AMQP', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e8', source: 'process-txn-orchestrator', target: 'datastore-transactions', type: 'dataFlow', data: { label: 'Transaction State', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e9', source: 'process-txn-orchestrator', target: 'process-settlement', type: 'dataFlow', data: { label: 'Settled Transactions', protocol: 'AMQP', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e10', source: 'process-settlement', target: 'process-merchant-ledger', type: 'dataFlow', data: { label: 'Settlement Instructions', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e11', source: 'process-merchant-ledger', target: 'datastore-merchants', type: 'dataFlow', data: { label: 'Merchant Data', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e12', source: 'process-settlement', target: 'datastore-settlement', type: 'dataFlow', data: { label: 'SEPA Files', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e13', source: 'process-psp-gw', target: 'actor-merchant', type: 'dataFlow', data: { label: 'Webhook Callback', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 67,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },

  // ============ CORE BANKING SYSTEM ============
  {
    id: 'banking-core-system',
    name: 'Core Banking System',
    description: 'Central banking platform with account management, general ledger, interest calculation, and product catalog. Includes batch processing, real-time transaction posting, and regulatory reporting.',
    category: 'data_pipeline',
    tags: ['core-banking', 'ledger', 'accounts', 'temenos', 'sap', 'oracle', 'batch', 'transactions'],
    templateData: {
      nodes: [
        // System Boundary
        {
          id: 'system-core',
          type: 'systemBoundary',
          position: { x: 0, y: 0 },
          style: { width: 1420, height: 720 },
          data: { label: 'Core Banking System', owner: 'Core Banking Operations', classification: 'Critical' }
        },
        // Trust Boundaries
        {
          id: 'tb-channels',
          type: 'trustBoundary',
          position: { x: 20, y: 80 },
          style: { width: 200, height: 520 },
          data: { label: 'Channel Integration', trustLevel: 'trusted_partner', technology: 'ESB / MQ' }
        },
        {
          id: 'tb-api',
          type: 'trustBoundary',
          position: { x: 240, y: 80 },
          style: { width: 280, height: 520 },
          data: { label: 'API Layer', trustLevel: 'private_secured', technology: 'IBM API Connect' }
        },
        {
          id: 'tb-core',
          type: 'trustBoundary',
          position: { x: 540, y: 80 },
          style: { width: 480, height: 520 },
          data: { label: 'Core Processing', trustLevel: 'internal', technology: 'Mainframe / Private Cloud' }
        },
        {
          id: 'tb-data',
          type: 'trustBoundary',
          position: { x: 1040, y: 80 },
          style: { width: 360, height: 520 },
          data: { label: 'Data Layer', trustLevel: 'internal', technology: 'Oracle Exadata' }
        },
        // Channel Actors
        {
          id: 'actor-branch',
          type: 'actor',
          position: { x: 55, y: 150 },
          data: { label: 'Branch Systems', actorType: 'system', description: 'Teller and platform applications' }
        },
        {
          id: 'actor-digital',
          type: 'actor',
          position: { x: 55, y: 280 },
          data: { label: 'Digital Channels', actorType: 'system', description: 'Mobile, Internet Banking, ATM' }
        },
        {
          id: 'actor-payments',
          type: 'actor',
          position: { x: 55, y: 410 },
          data: { label: 'Payment Systems', actorType: 'system', description: 'SWIFT, SEPA, Cards' }
        },
        {
          id: 'actor-regulator',
          type: 'actor',
          position: { x: 55, y: 640 },
          data: { label: 'Regulatory Systems', actorType: 'external', description: 'DNB, ECB reporting' }
        },
        // API Layer
        {
          id: 'process-api-gw',
          type: 'process',
          position: { x: 300, y: 150 },
          data: { label: 'Core Banking API', technology: 'IBM API Connect', description: 'REST/SOAP gateway with versioning', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-esb',
          type: 'process',
          position: { x: 300, y: 290 },
          data: { label: 'Enterprise Service Bus', technology: 'IBM MQ / Kafka', description: 'Message routing and transformation', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-batch-scheduler',
          type: 'process',
          position: { x: 300, y: 430 },
          data: { label: 'Batch Scheduler', technology: 'Control-M', description: 'EOD/EOM batch orchestration', dataSensitivity: 'internal' }
        },
        // Core Processing
        {
          id: 'process-account-mgmt',
          type: 'process',
          position: { x: 600, y: 150 },
          data: { label: 'Account Management', technology: 'Temenos T24', description: 'Account opening, maintenance, closure', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-txn-engine',
          type: 'process',
          position: { x: 800, y: 150 },
          data: { label: 'Transaction Engine', technology: 'Temenos T24', description: 'Real-time posting, reversal, holds', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-gl',
          type: 'process',
          position: { x: 600, y: 290 },
          data: { label: 'General Ledger', technology: 'SAP S/4HANA', description: 'Double-entry accounting, subledgers', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-interest',
          type: 'process',
          position: { x: 800, y: 290 },
          data: { label: 'Interest Calculator', technology: 'Temenos T24', description: 'Accrual, capitalization, rate changes', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-product',
          type: 'process',
          position: { x: 600, y: 430 },
          data: { label: 'Product Catalog', technology: 'Temenos T24', description: 'Account types, pricing, eligibility rules', dataSensitivity: 'internal' }
        },
        {
          id: 'process-regulatory',
          type: 'process',
          position: { x: 800, y: 430 },
          data: { label: 'Regulatory Reporting', technology: 'AxiomSL / SAS', description: 'COREP, FINREP, AnaCredit', dataSensitivity: 'confidential' }
        },
        // Data Layer
        {
          id: 'datastore-customer',
          type: 'datastore',
          position: { x: 1100, y: 150 },
          data: { label: 'Customer Master', technology: 'Oracle DB', description: 'KYC, demographics, relationships', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-accounts',
          type: 'datastore',
          position: { x: 1260, y: 150 },
          data: { label: 'Account Master', technology: 'Oracle DB', description: 'Balances, status, product linkage', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-gl',
          type: 'datastore',
          position: { x: 1100, y: 300 },
          data: { label: 'GL Datastore', technology: 'SAP HANA', description: 'Chart of accounts, journal entries', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-history',
          type: 'datastore',
          position: { x: 1260, y: 300 },
          data: { label: 'Transaction History', technology: 'Oracle Exadata', description: '10-year transaction archive', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-audit',
          type: 'datastore',
          position: { x: 1180, y: 450 },
          data: { label: 'Audit Trail', technology: 'Splunk', description: 'All system events and changes', dataSensitivity: 'confidential' }
        },
      ],
      edges: [
        { id: 'e1', source: 'actor-branch', target: 'process-api-gw', type: 'dataFlow', data: { label: 'Branch Transactions', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e2', source: 'actor-digital', target: 'process-api-gw', type: 'dataFlow', data: { label: 'Digital Requests', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e3', source: 'actor-payments', target: 'process-esb', type: 'dataFlow', data: { label: 'Payment Messages', protocol: 'AMQP', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e4', source: 'process-api-gw', target: 'process-account-mgmt', type: 'dataFlow', data: { label: 'Account APIs', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e5', source: 'process-api-gw', target: 'process-txn-engine', type: 'dataFlow', data: { label: 'Transaction APIs', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e6', source: 'process-esb', target: 'process-txn-engine', type: 'dataFlow', data: { label: 'Payment Postings', protocol: 'AMQP', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e7', source: 'process-txn-engine', target: 'process-gl', type: 'dataFlow', data: { label: 'GL Entries', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e8', source: 'process-batch-scheduler', target: 'process-interest', type: 'dataFlow', data: { label: 'EOD Trigger', protocol: 'TCP', encrypted: true, authenticated: true, dataClassification: ['Internal'] } },
        { id: 'e9', source: 'process-interest', target: 'process-txn-engine', type: 'dataFlow', data: { label: 'Interest Postings', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e10', source: 'process-account-mgmt', target: 'datastore-customer', type: 'dataFlow', data: { label: 'Customer Data', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e11', source: 'process-account-mgmt', target: 'datastore-accounts', type: 'dataFlow', data: { label: 'Account Data', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e12', source: 'process-gl', target: 'datastore-gl', type: 'dataFlow', data: { label: 'Journal Entries', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e13', source: 'process-txn-engine', target: 'datastore-history', type: 'dataFlow', data: { label: 'Transaction Archive', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e14', source: 'process-regulatory', target: 'actor-regulator', type: 'dataFlow', data: { label: 'Regulatory Reports', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'Confidential'] } },
        { id: 'e15', source: 'process-txn-engine', target: 'datastore-audit', type: 'dataFlow', data: { label: 'Audit Events', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 112,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },

  // ============ SEPA INSTANT PAYMENTS ============
  {
    id: 'banking-sepa-instant',
    name: 'SEPA Instant Payments',
    description: 'Real-time Euro payments via SEPA Instant Credit Transfer (SCT Inst). Includes RT1/TIPS connectivity, 10-second SLA, 24/7 availability, and instant confirmation. Supports Request-to-Pay (RTP).',
    category: 'payment_processing',
    tags: ['sepa', 'instant', 'sct-inst', 'rt1', 'tips', 'real-time', 'euro', 'ecb'],
    templateData: {
      nodes: [
        // System Boundary
        {
          id: 'system-sepa-inst',
          type: 'systemBoundary',
          position: { x: 0, y: 0 },
          style: { width: 1400, height: 680 },
          data: { label: 'SEPA Instant Payments', owner: 'Payments & Clearing', classification: 'Critical' }
        },
        // Trust Boundaries
        {
          id: 'tb-channels',
          type: 'trustBoundary',
          position: { x: 20, y: 80 },
          style: { width: 180, height: 380 },
          data: { label: 'Channel Zone', trustLevel: 'trusted_partner', technology: 'Internal Network' }
        },
        {
          id: 'tb-processing',
          type: 'trustBoundary',
          position: { x: 220, y: 80 },
          style: { width: 420, height: 480 },
          data: { label: 'Processing Zone', trustLevel: 'private_secured', technology: 'Azure VNet (HA)' }
        },
        {
          id: 'tb-clearing',
          type: 'trustBoundary',
          position: { x: 660, y: 80 },
          style: { width: 340, height: 480 },
          data: { label: 'Clearing Network', trustLevel: 'trusted_partner', technology: 'EBA RT1 / ECB TIPS' }
        },
        {
          id: 'tb-internal',
          type: 'trustBoundary',
          position: { x: 1020, y: 80 },
          style: { width: 360, height: 480 },
          data: { label: 'Internal Zone', trustLevel: 'internal', technology: 'Core Banking' }
        },
        // Channel Actors
        {
          id: 'actor-mobile',
          type: 'actor',
          position: { x: 55, y: 150 },
          data: { label: 'Mobile Banking', actorType: 'system', description: 'Customer mobile app' }
        },
        {
          id: 'actor-internet',
          type: 'actor',
          position: { x: 55, y: 280 },
          data: { label: 'Internet Banking', actorType: 'system', description: 'Web banking portal' }
        },
        {
          id: 'actor-corporate',
          type: 'actor',
          position: { x: 55, y: 620 },
          data: { label: 'Corporate Clients', actorType: 'external', description: 'Batch file upload (pain.001)' }
        },
        // Processing Zone
        {
          id: 'process-payment-hub',
          type: 'process',
          position: { x: 280, y: 150 },
          data: { label: 'Payment Hub', technology: 'Finastra GPP', description: 'Payment orchestration and routing', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-validation',
          type: 'process',
          position: { x: 460, y: 150 },
          data: { label: 'Validation Engine', technology: 'Azure Functions', description: 'IBAN check, amount limits, duplicate detection', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-sanctions',
          type: 'process',
          position: { x: 280, y: 280 },
          data: { label: 'Instant Sanctions', technology: 'Fircosoft', description: 'Real-time sanctions screening (<2s SLA)', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-liquidity',
          type: 'process',
          position: { x: 460, y: 280 },
          data: { label: 'Liquidity Manager', technology: 'Azure Functions', description: 'Prefunding and position monitoring', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-sct-formatter',
          type: 'process',
          position: { x: 370, y: 410 },
          data: { label: 'SCT Inst Formatter', technology: 'Azure AKS', description: 'pacs.008 message creation (ISO 20022)', dataSensitivity: 'confidential' }
        },
        // Clearing Network
        {
          id: 'actor-rt1',
          type: 'actor',
          position: { x: 720, y: 150 },
          data: { label: 'EBA RT1', actorType: 'system', description: 'EBA Clearing real-time system' }
        },
        {
          id: 'actor-tips',
          type: 'actor',
          position: { x: 880, y: 150 },
          data: { label: 'ECB TIPS', actorType: 'system', description: 'TARGET Instant Payment Settlement' }
        },
        {
          id: 'process-clearing-gw',
          type: 'process',
          position: { x: 800, y: 300 },
          data: { label: 'Clearing Gateway', technology: 'SWIFT Alliance', description: 'Connectivity to RT1/TIPS', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-position',
          type: 'datastore',
          position: { x: 800, y: 430 },
          data: { label: 'Position Account', technology: 'In-Memory DB', description: 'Real-time liquidity position', dataSensitivity: 'confidential' }
        },
        // Internal Zone
        {
          id: 'process-core-posting',
          type: 'process',
          position: { x: 1100, y: 150 },
          data: { label: 'Core Banking Post', technology: 'Temenos T24', description: 'Account debit/credit posting', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-notification',
          type: 'process',
          position: { x: 1260, y: 150 },
          data: { label: 'Notification Service', technology: 'Azure Logic Apps', description: 'Push notification, SMS, email', dataSensitivity: 'internal' }
        },
        {
          id: 'datastore-txn',
          type: 'datastore',
          position: { x: 1100, y: 300 },
          data: { label: 'Transaction Store', technology: 'Azure SQL', description: 'Payment records and status', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-audit',
          type: 'datastore',
          position: { x: 1260, y: 300 },
          data: { label: 'Audit & SLA Log', technology: 'Azure Monitor', description: 'Performance metrics, SLA tracking', dataSensitivity: 'confidential' }
        },
      ],
      edges: [
        { id: 'e1', source: 'actor-mobile', target: 'process-payment-hub', type: 'dataFlow', data: { label: 'Instant Payment Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e2', source: 'actor-internet', target: 'process-payment-hub', type: 'dataFlow', data: { label: 'Instant Payment Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e3', source: 'process-payment-hub', target: 'process-validation', type: 'dataFlow', data: { label: 'Validation Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e4', source: 'process-validation', target: 'process-sanctions', type: 'dataFlow', data: { label: 'Screening Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII', 'Financial'] } },
        { id: 'e5', source: 'process-sanctions', target: 'process-liquidity', type: 'dataFlow', data: { label: 'Cleared Payment', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e6', source: 'process-liquidity', target: 'process-sct-formatter', type: 'dataFlow', data: { label: 'Funded Payment', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e7', source: 'process-sct-formatter', target: 'process-clearing-gw', type: 'dataFlow', data: { label: 'pacs.008 Message', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e8', source: 'process-clearing-gw', target: 'actor-rt1', type: 'dataFlow', data: { label: 'RT1 Submit', protocol: 'Custom', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e9', source: 'process-clearing-gw', target: 'actor-tips', type: 'dataFlow', data: { label: 'TIPS Submit', protocol: 'Custom', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e10', source: 'process-clearing-gw', target: 'datastore-position', type: 'dataFlow', data: { label: 'Position Update', protocol: 'TCP', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e11', source: 'process-payment-hub', target: 'process-core-posting', type: 'dataFlow', data: { label: 'Account Posting', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e12', source: 'process-core-posting', target: 'datastore-txn', type: 'dataFlow', data: { label: 'Transaction Record', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e13', source: 'process-core-posting', target: 'process-notification', type: 'dataFlow', data: { label: 'Confirmation Trigger', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Internal'] } },
        { id: 'e14', source: 'process-payment-hub', target: 'datastore-audit', type: 'dataFlow', data: { label: 'SLA Metrics', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Internal'] } },
        { id: 'e15', source: 'actor-corporate', target: 'process-payment-hub', type: 'dataFlow', data: { label: 'Bulk pain.001', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 94,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },

  // ============ KYC/AML COMPLIANCE SYSTEM ============
  {
    id: 'banking-kyc-aml',
    name: 'KYC/AML Compliance System',
    description: 'Know Your Customer and Anti-Money Laundering platform with customer onboarding, identity verification, sanctions screening, transaction monitoring, and suspicious activity reporting (SAR). FATF and EU AMLD6 compliant.',
    category: 'data_pipeline',
    tags: ['kyc', 'aml', 'compliance', 'sanctions', 'pep', 'fatf', 'amld6', 'customer-onboarding', 'sar'],
    templateData: {
      nodes: [
        // System Boundary
        {
          id: 'system-kyc-aml',
          type: 'systemBoundary',
          position: { x: 0, y: 0 },
          style: { width: 1420, height: 720 },
          data: { label: 'KYC/AML Compliance System', owner: 'Compliance & Risk', classification: 'Critical' }
        },
        // Trust Boundaries
        {
          id: 'tb-external',
          type: 'trustBoundary',
          position: { x: 20, y: 80 },
          style: { width: 200, height: 520 },
          data: { label: 'External Sources', trustLevel: 'internet', technology: 'API Integrations' }
        },
        {
          id: 'tb-onboarding',
          type: 'trustBoundary',
          position: { x: 240, y: 80 },
          style: { width: 300, height: 520 },
          data: { label: 'Onboarding Zone', trustLevel: 'trusted_partner', technology: 'Azure APIM' }
        },
        {
          id: 'tb-screening',
          type: 'trustBoundary',
          position: { x: 560, y: 80 },
          style: { width: 380, height: 520 },
          data: { label: 'Screening & Monitoring', trustLevel: 'private_secured', technology: 'Azure VNet' }
        },
        {
          id: 'tb-case',
          type: 'trustBoundary',
          position: { x: 960, y: 80 },
          style: { width: 440, height: 520 },
          data: { label: 'Case Management', trustLevel: 'internal', technology: 'Private Network' }
        },
        // External Sources
        {
          id: 'actor-customer',
          type: 'actor',
          position: { x: 55, y: 150 },
          data: { label: 'New Customer', actorType: 'user', description: 'Individual or corporate applicant' }
        },
        {
          id: 'actor-idv-provider',
          type: 'actor',
          position: { x: 55, y: 280 },
          data: { label: 'IDV Provider', actorType: 'system', description: 'Onfido, Jumio - ID verification' }
        },
        {
          id: 'actor-data-vendor',
          type: 'actor',
          position: { x: 55, y: 410 },
          data: { label: 'Data Vendors', actorType: 'system', description: 'World-Check, Dow Jones, LexisNexis' }
        },
        {
          id: 'actor-fiu',
          type: 'actor',
          position: { x: 55, y: 640 },
          data: { label: 'FIU-Netherlands', actorType: 'external', description: 'Financial Intelligence Unit' }
        },
        // Onboarding Zone
        {
          id: 'process-onboarding-api',
          type: 'process',
          position: { x: 300, y: 150 },
          data: { label: 'Onboarding API', technology: 'Azure APIM', description: 'Customer application intake', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-idv',
          type: 'process',
          position: { x: 300, y: 280 },
          data: { label: 'ID Verification', technology: 'Azure Functions', description: 'Document OCR, liveness check, biometrics', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-risk-rating',
          type: 'process',
          position: { x: 300, y: 410 },
          data: { label: 'Risk Rating Engine', technology: 'Python / ML', description: 'Customer risk score calculation', dataSensitivity: 'confidential' }
        },
        // Screening & Monitoring Zone
        {
          id: 'process-sanctions',
          type: 'process',
          position: { x: 620, y: 150 },
          data: { label: 'Sanctions Screening', technology: 'Fircosoft', description: 'Real-time PEP/sanctions/adverse media', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-txn-monitoring',
          type: 'process',
          position: { x: 800, y: 150 },
          data: { label: 'Transaction Monitoring', technology: 'Actimize / SAS', description: 'Rule-based and ML anomaly detection', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-batch-screening',
          type: 'process',
          position: { x: 620, y: 280 },
          data: { label: 'Batch Rescreening', technology: 'Azure Batch', description: 'Periodic customer base screening', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-alert-engine',
          type: 'process',
          position: { x: 800, y: 280 },
          data: { label: 'Alert Engine', technology: 'Azure Functions', description: 'Alert generation and prioritization', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-watchlist',
          type: 'datastore',
          position: { x: 620, y: 420 },
          data: { label: 'Watchlist DB', technology: 'Azure SQL', description: 'Sanctions lists, PEP lists, internal lists', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-txn-data',
          type: 'datastore',
          position: { x: 800, y: 420 },
          data: { label: 'Transaction Data Lake', technology: 'Azure Synapse', description: 'Historical transactions for pattern analysis', dataSensitivity: 'confidential' }
        },
        // Case Management Zone
        {
          id: 'process-case-mgmt',
          type: 'process',
          position: { x: 1040, y: 150 },
          data: { label: 'Case Management', technology: 'Pega / ServiceNow', description: 'Alert investigation workflow', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-sar-filing',
          type: 'process',
          position: { x: 1220, y: 150 },
          data: { label: 'SAR Filing', technology: 'goAML Integration', description: 'Suspicious Activity Report submission', dataSensitivity: 'confidential' }
        },
        {
          id: 'actor-analyst',
          type: 'actor',
          position: { x: 1130, y: 640 },
          data: { label: 'Compliance Analyst', actorType: 'user', description: 'AML investigator' }
        },
        {
          id: 'datastore-cases',
          type: 'datastore',
          position: { x: 1040, y: 300 },
          data: { label: 'Case Database', technology: 'PostgreSQL', description: 'Investigation cases and evidence', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-customer-kyc',
          type: 'datastore',
          position: { x: 1220, y: 300 },
          data: { label: 'KYC Repository', technology: 'Azure Blob + SQL', description: 'ID documents, risk assessments', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-audit',
          type: 'datastore',
          position: { x: 1130, y: 450 },
          data: { label: 'Compliance Audit Log', technology: 'Splunk', description: 'All compliance decisions and actions', dataSensitivity: 'confidential' }
        },
      ],
      edges: [
        { id: 'e1', source: 'actor-customer', target: 'process-onboarding-api', type: 'dataFlow', data: { label: 'Application Data', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e2', source: 'process-onboarding-api', target: 'process-idv', type: 'dataFlow', data: { label: 'ID Documents', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e3', source: 'process-idv', target: 'actor-idv-provider', type: 'dataFlow', data: { label: 'Verification Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e4', source: 'process-onboarding-api', target: 'process-sanctions', type: 'dataFlow', data: { label: 'Screening Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e5', source: 'process-sanctions', target: 'datastore-watchlist', type: 'dataFlow', data: { label: 'Watchlist Lookup', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e6', source: 'actor-data-vendor', target: 'datastore-watchlist', type: 'dataFlow', data: { label: 'List Updates', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e7', source: 'process-sanctions', target: 'process-risk-rating', type: 'dataFlow', data: { label: 'Screening Result', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e8', source: 'process-risk-rating', target: 'datastore-customer-kyc', type: 'dataFlow', data: { label: 'Risk Profile', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII', 'Confidential'] } },
        { id: 'e9', source: 'process-txn-monitoring', target: 'datastore-txn-data', type: 'dataFlow', data: { label: 'Transaction Analysis', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e10', source: 'process-txn-monitoring', target: 'process-alert-engine', type: 'dataFlow', data: { label: 'Suspicious Patterns', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'Confidential'] } },
        { id: 'e11', source: 'process-alert-engine', target: 'process-case-mgmt', type: 'dataFlow', data: { label: 'Alerts', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e12', source: 'process-batch-screening', target: 'process-alert-engine', type: 'dataFlow', data: { label: 'Batch Hits', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e13', source: 'actor-analyst', target: 'process-case-mgmt', type: 'dataFlow', data: { label: 'Investigation Actions', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e14', source: 'process-case-mgmt', target: 'datastore-cases', type: 'dataFlow', data: { label: 'Case Data', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e15', source: 'process-case-mgmt', target: 'process-sar-filing', type: 'dataFlow', data: { label: 'SAR Submission', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e16', source: 'process-sar-filing', target: 'actor-fiu', type: 'dataFlow', data: { label: 'goAML Report', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e17', source: 'process-case-mgmt', target: 'datastore-audit', type: 'dataFlow', data: { label: 'Audit Trail', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 103,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },

  // ============ CREDIT CARD PROCESSING ============
  {
    id: 'banking-card-processing',
    name: 'Credit Card Processing',
    description: 'Card payment processing with authorization, clearing, and settlement. Includes PCI-DSS compliant cardholder data environment (CDE), tokenization, 3D Secure authentication, and card network connectivity (Visa, Mastercard).',
    category: 'payment_processing',
    tags: ['cards', 'visa', 'mastercard', 'pci-dss', 'authorization', 'tokenization', '3ds', 'acquiring', 'issuing'],
    templateData: {
      nodes: [
        // System Boundary
        {
          id: 'system-cards',
          type: 'systemBoundary',
          position: { x: 0, y: 0 },
          style: { width: 1420, height: 700 },
          data: { label: 'Credit Card Processing', owner: 'Cards & Payments', classification: 'Critical' }
        },
        // Trust Boundaries
        {
          id: 'tb-merchant',
          type: 'trustBoundary',
          position: { x: 20, y: 80 },
          style: { width: 180, height: 380 },
          data: { label: 'Merchant Zone', trustLevel: 'internet', technology: 'Public Network' }
        },
        {
          id: 'tb-cde',
          type: 'trustBoundary',
          position: { x: 220, y: 80 },
          style: { width: 380, height: 500 },
          data: { label: 'Cardholder Data Environment (CDE)', trustLevel: 'private_secured', technology: 'PCI-DSS Segmented Network' }
        },
        {
          id: 'tb-network',
          type: 'trustBoundary',
          position: { x: 620, y: 80 },
          style: { width: 340, height: 500 },
          data: { label: 'Card Network Zone', trustLevel: 'trusted_partner', technology: 'Dedicated Lines' }
        },
        {
          id: 'tb-internal',
          type: 'trustBoundary',
          position: { x: 980, y: 80 },
          style: { width: 420, height: 500 },
          data: { label: 'Internal Processing', trustLevel: 'internal', technology: 'Core Banking Network' }
        },
        // Merchant Zone Actors
        {
          id: 'actor-pos',
          type: 'actor',
          position: { x: 55, y: 150 },
          data: { label: 'POS Terminal', actorType: 'system', description: 'In-store card terminal' }
        },
        {
          id: 'actor-ecommerce',
          type: 'actor',
          position: { x: 55, y: 280 },
          data: { label: 'E-Commerce', actorType: 'system', description: 'Online checkout (CNP)' }
        },
        {
          id: 'actor-cardholder',
          type: 'actor',
          position: { x: 55, y: 620 },
          data: { label: 'Cardholder', actorType: 'user', description: 'Card owner for 3DS authentication' }
        },
        // CDE Zone
        {
          id: 'process-gateway',
          type: 'process',
          position: { x: 280, y: 150 },
          data: { label: 'Payment Gateway', technology: 'AWS PrivateLink', description: 'Secure card data ingress', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-tokenization',
          type: 'process',
          position: { x: 440, y: 150 },
          data: { label: 'Tokenization Vault', technology: 'Thales payShield HSM', description: 'PAN tokenization and detokenization', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-3ds',
          type: 'process',
          position: { x: 280, y: 290 },
          data: { label: '3D Secure Server', technology: 'Netcetera', description: '3DS2 authentication (EMV 3DS)', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-auth-engine',
          type: 'process',
          position: { x: 440, y: 290 },
          data: { label: 'Authorization Engine', technology: 'FIS / ACI', description: 'Real-time auth decision', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-tokens',
          type: 'datastore',
          position: { x: 280, y: 430 },
          data: { label: 'Token Vault', technology: 'HSM + Encrypted DB', description: 'Token-to-PAN mapping', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-keys',
          type: 'datastore',
          position: { x: 440, y: 430 },
          data: { label: 'Key Management', technology: 'Thales HSM', description: 'Encryption keys (DUKPT, zone keys)', dataSensitivity: 'confidential' }
        },
        // Card Network Zone
        {
          id: 'actor-visa',
          type: 'actor',
          position: { x: 680, y: 150 },
          data: { label: 'VisaNet', actorType: 'system', description: 'Visa authorization network' }
        },
        {
          id: 'actor-mastercard',
          type: 'actor',
          position: { x: 840, y: 150 },
          data: { label: 'Mastercard Network', actorType: 'system', description: 'Mastercard Banknet' }
        },
        {
          id: 'process-switch',
          type: 'process',
          position: { x: 760, y: 290 },
          data: { label: 'Card Switch', technology: 'ACI / BASE24', description: 'Network routing and switching', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-clearing',
          type: 'process',
          position: { x: 760, y: 420 },
          data: { label: 'Clearing Processor', technology: 'FIS / Fiserv', description: 'Batch clearing file processing', dataSensitivity: 'confidential' }
        },
        // Internal Processing
        {
          id: 'process-issuer',
          type: 'process',
          position: { x: 1060, y: 150 },
          data: { label: 'Issuer System', technology: 'Temenos', description: 'Card issuance and account management', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-acquirer',
          type: 'process',
          position: { x: 1220, y: 150 },
          data: { label: 'Acquirer System', technology: 'FIS', description: 'Merchant acquiring and settlement', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-fraud',
          type: 'process',
          position: { x: 1060, y: 290 },
          data: { label: 'Fraud Detection', technology: 'FICO Falcon', description: 'Real-time fraud scoring', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-disputes',
          type: 'process',
          position: { x: 1220, y: 290 },
          data: { label: 'Dispute Management', technology: 'VISA Resolve / MC Connect', description: 'Chargeback processing', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-cards',
          type: 'datastore',
          position: { x: 1060, y: 430 },
          data: { label: 'Card Master', technology: 'Oracle (TDE)', description: 'Card accounts and limits', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-txn',
          type: 'datastore',
          position: { x: 1220, y: 430 },
          data: { label: 'Transaction Archive', technology: 'Azure SQL', description: 'Authorization and settlement records', dataSensitivity: 'confidential' }
        },
      ],
      edges: [
        { id: 'e1', source: 'actor-pos', target: 'process-gateway', type: 'dataFlow', data: { label: 'Card Present (CP)', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e2', source: 'actor-ecommerce', target: 'process-gateway', type: 'dataFlow', data: { label: 'Card Not Present (CNP)', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e3', source: 'process-gateway', target: 'process-tokenization', type: 'dataFlow', data: { label: 'PAN for Tokenization', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e4', source: 'process-gateway', target: 'process-3ds', type: 'dataFlow', data: { label: '3DS Auth Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e5', source: 'process-3ds', target: 'actor-cardholder', type: 'dataFlow', data: { label: '3DS Challenge', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e6', source: 'process-tokenization', target: 'datastore-tokens', type: 'dataFlow', data: { label: 'Token Storage', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e7', source: 'process-tokenization', target: 'datastore-keys', type: 'dataFlow', data: { label: 'Key Operations', protocol: 'Custom', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e8', source: 'process-3ds', target: 'process-auth-engine', type: 'dataFlow', data: { label: 'Authenticated Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e9', source: 'process-auth-engine', target: 'process-switch', type: 'dataFlow', data: { label: 'Auth Message (ISO 8583)', protocol: 'TCP', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e10', source: 'process-switch', target: 'actor-visa', type: 'dataFlow', data: { label: 'Visa Auth', protocol: 'Custom', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e11', source: 'process-switch', target: 'actor-mastercard', type: 'dataFlow', data: { label: 'MC Auth', protocol: 'Custom', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e12', source: 'process-auth-engine', target: 'process-fraud', type: 'dataFlow', data: { label: 'Fraud Check', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e13', source: 'process-auth-engine', target: 'process-issuer', type: 'dataFlow', data: { label: 'Issuer Auth', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e14', source: 'process-clearing', target: 'process-acquirer', type: 'dataFlow', data: { label: 'Clearing Files', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e15', source: 'process-issuer', target: 'datastore-cards', type: 'dataFlow', data: { label: 'Card Data', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e16', source: 'process-acquirer', target: 'datastore-txn', type: 'dataFlow', data: { label: 'Settlement Records', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e17', source: 'process-disputes', target: 'actor-visa', type: 'dataFlow', data: { label: 'Dispute Filing', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 118,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },

  // ============ FRAUD DETECTION PLATFORM ============
  {
    id: 'banking-fraud-detection',
    name: 'Fraud Detection Platform',
    description: 'Enterprise fraud detection with real-time transaction scoring, behavioral analytics, device fingerprinting, and case management. Includes ML models, rule engine, and integration with card networks and payment channels.',
    category: 'data_pipeline',
    tags: ['fraud', 'ml', 'detection', 'behavioral', 'analytics', 'real-time', 'scoring', 'rules-engine'],
    templateData: {
      nodes: [
        // System Boundary
        {
          id: 'system-fraud',
          type: 'systemBoundary',
          position: { x: 0, y: 0 },
          style: { width: 1420, height: 700 },
          data: { label: 'Fraud Detection Platform', owner: 'Fraud Risk Management', classification: 'Critical' }
        },
        // Trust Boundaries
        {
          id: 'tb-channels',
          type: 'trustBoundary',
          position: { x: 20, y: 80 },
          style: { width: 200, height: 500 },
          data: { label: 'Channel Integration', trustLevel: 'trusted_partner', technology: 'API Gateway' }
        },
        {
          id: 'tb-realtime',
          type: 'trustBoundary',
          position: { x: 240, y: 80 },
          style: { width: 400, height: 500 },
          data: { label: 'Real-Time Processing', trustLevel: 'private_secured', technology: 'AWS VPC (Low Latency)' }
        },
        {
          id: 'tb-analytics',
          type: 'trustBoundary',
          position: { x: 660, y: 80 },
          style: { width: 340, height: 500 },
          data: { label: 'Analytics Zone', trustLevel: 'private_secured', technology: 'AWS SageMaker VPC' }
        },
        {
          id: 'tb-case',
          type: 'trustBoundary',
          position: { x: 1020, y: 80 },
          style: { width: 380, height: 500 },
          data: { label: 'Case Management', trustLevel: 'internal', technology: 'Internal Network' }
        },
        // Channel Actors
        {
          id: 'actor-cards',
          type: 'actor',
          position: { x: 55, y: 150 },
          data: { label: 'Card Systems', actorType: 'system', description: 'Authorization requests' }
        },
        {
          id: 'actor-payments',
          type: 'actor',
          position: { x: 55, y: 280 },
          data: { label: 'Payment Systems', actorType: 'system', description: 'SEPA, SWIFT, instant payments' }
        },
        {
          id: 'actor-digital',
          type: 'actor',
          position: { x: 55, y: 410 },
          data: { label: 'Digital Banking', actorType: 'system', description: 'Mobile/web login and transactions' }
        },
        // Real-Time Processing
        {
          id: 'process-scoring-api',
          type: 'process',
          position: { x: 300, y: 150 },
          data: { label: 'Scoring API', technology: 'AWS Lambda', description: 'Low-latency fraud scoring endpoint (<100ms)', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-rules-engine',
          type: 'process',
          position: { x: 480, y: 150 },
          data: { label: 'Rules Engine', technology: 'Drools / AWS Step Functions', description: 'Real-time business rules evaluation', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-device-intel',
          type: 'process',
          position: { x: 300, y: 290 },
          data: { label: 'Device Intelligence', technology: 'ThreatMetrix', description: 'Device fingerprinting and reputation', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-velocity',
          type: 'process',
          position: { x: 480, y: 290 },
          data: { label: 'Velocity Engine', technology: 'AWS ElastiCache', description: 'Transaction velocity and pattern detection', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-profiles',
          type: 'datastore',
          position: { x: 300, y: 430 },
          data: { label: 'Customer Profiles', technology: 'AWS DynamoDB', description: 'Behavioral baselines, device history', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-rules',
          type: 'datastore',
          position: { x: 480, y: 430 },
          data: { label: 'Rule Repository', technology: 'PostgreSQL', description: 'Active rules and thresholds', dataSensitivity: 'internal' }
        },
        // Analytics Zone
        {
          id: 'process-ml-scoring',
          type: 'process',
          position: { x: 720, y: 150 },
          data: { label: 'ML Scoring Model', technology: 'AWS SageMaker', description: 'XGBoost/Neural network fraud models', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-feature-store',
          type: 'process',
          position: { x: 880, y: 150 },
          data: { label: 'Feature Store', technology: 'AWS Feature Store', description: 'Real-time feature computation', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-model-training',
          type: 'process',
          position: { x: 720, y: 290 },
          data: { label: 'Model Training', technology: 'AWS SageMaker', description: 'Periodic model retraining pipeline', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-datalake',
          type: 'datastore',
          position: { x: 720, y: 430 },
          data: { label: 'Fraud Data Lake', technology: 'AWS S3 + Glue', description: 'Historical transactions, labels, features', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-models',
          type: 'datastore',
          position: { x: 880, y: 430 },
          data: { label: 'Model Registry', technology: 'MLflow', description: 'Versioned ML models', dataSensitivity: 'internal' }
        },
        // Case Management
        {
          id: 'process-alert-queue',
          type: 'process',
          position: { x: 1080, y: 150 },
          data: { label: 'Alert Queue', technology: 'AWS SQS', description: 'Prioritized fraud alerts', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-case-mgmt',
          type: 'process',
          position: { x: 1240, y: 150 },
          data: { label: 'Case Management', technology: 'NICE Actimize', description: 'Investigation workflow', dataSensitivity: 'confidential' }
        },
        {
          id: 'actor-analyst',
          type: 'actor',
          position: { x: 1160, y: 620 },
          data: { label: 'Fraud Analyst', actorType: 'user', description: 'Fraud investigation team' }
        },
        {
          id: 'datastore-cases',
          type: 'datastore',
          position: { x: 1080, y: 300 },
          data: { label: 'Case Database', technology: 'PostgreSQL', description: 'Investigation cases and outcomes', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-feedback',
          type: 'datastore',
          position: { x: 1240, y: 300 },
          data: { label: 'Feedback Loop', technology: 'AWS Kinesis', description: 'Analyst decisions for model training', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-audit',
          type: 'datastore',
          position: { x: 1160, y: 450 },
          data: { label: 'Decision Audit', technology: 'AWS CloudWatch', description: 'All scoring decisions for explainability', dataSensitivity: 'confidential' }
        },
      ],
      edges: [
        { id: 'e1', source: 'actor-cards', target: 'process-scoring-api', type: 'dataFlow', data: { label: 'Auth Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e2', source: 'actor-payments', target: 'process-scoring-api', type: 'dataFlow', data: { label: 'Payment Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e3', source: 'actor-digital', target: 'process-scoring-api', type: 'dataFlow', data: { label: 'Login/Transaction', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e4', source: 'process-scoring-api', target: 'process-rules-engine', type: 'dataFlow', data: { label: 'Rule Evaluation', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e5', source: 'process-scoring-api', target: 'process-device-intel', type: 'dataFlow', data: { label: 'Device Check', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e6', source: 'process-scoring-api', target: 'process-velocity', type: 'dataFlow', data: { label: 'Velocity Check', protocol: 'TCP', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e7', source: 'process-velocity', target: 'datastore-profiles', type: 'dataFlow', data: { label: 'Profile Lookup', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e8', source: 'process-rules-engine', target: 'datastore-rules', type: 'dataFlow', data: { label: 'Rule Fetch', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Internal'] } },
        { id: 'e9', source: 'process-scoring-api', target: 'process-ml-scoring', type: 'dataFlow', data: { label: 'ML Scoring Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e10', source: 'process-ml-scoring', target: 'process-feature-store', type: 'dataFlow', data: { label: 'Feature Fetch', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e11', source: 'process-model-training', target: 'datastore-datalake', type: 'dataFlow', data: { label: 'Training Data', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e12', source: 'process-model-training', target: 'datastore-models', type: 'dataFlow', data: { label: 'Model Artifacts', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Internal'] } },
        { id: 'e13', source: 'process-scoring-api', target: 'process-alert-queue', type: 'dataFlow', data: { label: 'High-Risk Alerts', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'Confidential'] } },
        { id: 'e14', source: 'process-alert-queue', target: 'process-case-mgmt', type: 'dataFlow', data: { label: 'Alert Delivery', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e15', source: 'actor-analyst', target: 'process-case-mgmt', type: 'dataFlow', data: { label: 'Investigation', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e16', source: 'process-case-mgmt', target: 'datastore-cases', type: 'dataFlow', data: { label: 'Case Data', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e17', source: 'process-case-mgmt', target: 'datastore-feedback', type: 'dataFlow', data: { label: 'Analyst Decisions', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e18', source: 'datastore-feedback', target: 'process-model-training', type: 'dataFlow', data: { label: 'Labels for Training', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
        { id: 'e19', source: 'process-scoring-api', target: 'datastore-audit', type: 'dataFlow', data: { label: 'Decision Log', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 95,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },

  // ============ MORTGAGE ORIGINATION SYSTEM ============
  {
    id: 'banking-mortgage-origination',
    name: 'Mortgage Origination System',
    description: 'End-to-end mortgage application processing with online application, document collection, credit decisioning, property valuation, and offer generation. Includes integration with credit bureaus, land registry, and notary services.',
    category: 'web_application',
    tags: ['mortgage', 'lending', 'credit', 'underwriting', 'property', 'kadaster', 'bkr', 'origination'],
    templateData: {
      nodes: [
        // System Boundary
        {
          id: 'system-mortgage',
          type: 'systemBoundary',
          position: { x: 0, y: 0 },
          style: { width: 1420, height: 720 },
          data: { label: 'Mortgage Origination System', owner: 'Mortgage & Lending', classification: 'Critical' }
        },
        // Trust Boundaries
        {
          id: 'tb-customer',
          type: 'trustBoundary',
          position: { x: 20, y: 80 },
          style: { width: 180, height: 380 },
          data: { label: 'Customer Zone', trustLevel: 'internet', technology: 'Public Internet' }
        },
        {
          id: 'tb-external',
          type: 'trustBoundary',
          position: { x: 20, y: 480 },
          style: { width: 180, height: 200 },
          data: { label: 'External Partners', trustLevel: 'trusted_partner', technology: 'B2B APIs' }
        },
        {
          id: 'tb-application',
          type: 'trustBoundary',
          position: { x: 220, y: 80 },
          style: { width: 400, height: 520 },
          data: { label: 'Application Layer', trustLevel: 'private_secured', technology: 'Azure AKS' }
        },
        {
          id: 'tb-decisioning',
          type: 'trustBoundary',
          position: { x: 640, y: 80 },
          style: { width: 380, height: 520 },
          data: { label: 'Decisioning Zone', trustLevel: 'private_secured', technology: 'Azure VNet' }
        },
        {
          id: 'tb-internal',
          type: 'trustBoundary',
          position: { x: 1040, y: 80 },
          style: { width: 360, height: 520 },
          data: { label: 'Internal Zone', trustLevel: 'internal', technology: 'Core Systems' }
        },
        // Customer Zone
        {
          id: 'actor-applicant',
          type: 'actor',
          position: { x: 55, y: 150 },
          data: { label: 'Mortgage Applicant', actorType: 'user', description: 'Customer applying for mortgage' }
        },
        {
          id: 'actor-broker',
          type: 'actor',
          position: { x: 55, y: 280 },
          data: { label: 'Mortgage Broker', actorType: 'external', description: 'Intermediary channel' }
        },
        // External Partners
        {
          id: 'actor-bkr',
          type: 'actor',
          position: { x: 55, y: 530 },
          data: { label: 'BKR', actorType: 'system', description: 'Dutch Credit Bureau' }
        },
        {
          id: 'actor-kadaster',
          type: 'actor',
          position: { x: 55, y: 620 },
          data: { label: 'Kadaster', actorType: 'system', description: 'Dutch Land Registry' }
        },
        // Application Layer
        {
          id: 'process-portal',
          type: 'process',
          position: { x: 280, y: 150 },
          data: { label: 'Application Portal', technology: 'React / Azure CDN', description: 'Online mortgage application UI', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-api',
          type: 'process',
          position: { x: 460, y: 150 },
          data: { label: 'Application API', technology: 'Azure APIM', description: 'REST API for applications', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-doc-collection',
          type: 'process',
          position: { x: 280, y: 290 },
          data: { label: 'Document Collection', technology: 'Azure Functions', description: 'Income docs, ID verification', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-doc-ocr',
          type: 'process',
          position: { x: 460, y: 290 },
          data: { label: 'Document OCR', technology: 'Azure Form Recognizer', description: 'Extract data from payslips, tax returns', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-applications',
          type: 'datastore',
          position: { x: 280, y: 430 },
          data: { label: 'Applications DB', technology: 'Azure SQL', description: 'Application data and status', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-documents',
          type: 'datastore',
          position: { x: 460, y: 430 },
          data: { label: 'Document Store', technology: 'Azure Blob (Encrypted)', description: 'Uploaded documents', dataSensitivity: 'confidential' }
        },
        // Decisioning Zone
        {
          id: 'process-credit-check',
          type: 'process',
          position: { x: 700, y: 150 },
          data: { label: 'Credit Check', technology: 'Azure Functions', description: 'BKR and internal credit history', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-affordability',
          type: 'process',
          position: { x: 880, y: 150 },
          data: { label: 'Affordability Engine', technology: 'Python / Azure ML', description: 'Income verification, DTI calculation', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-valuation',
          type: 'process',
          position: { x: 700, y: 290 },
          data: { label: 'Property Valuation', technology: 'Calcasa / WOZ', description: 'Automated and manual valuation', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-underwriting',
          type: 'process',
          position: { x: 880, y: 290 },
          data: { label: 'Underwriting Engine', technology: 'FICO Origination', description: 'Automated credit decision', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-pricing',
          type: 'process',
          position: { x: 790, y: 430 },
          data: { label: 'Pricing Engine', technology: 'Azure Functions', description: 'Rate calculation and offer generation', dataSensitivity: 'confidential' }
        },
        // Internal Zone
        {
          id: 'process-offer-gen',
          type: 'process',
          position: { x: 1100, y: 150 },
          data: { label: 'Offer Generation', technology: 'DocuSign / Azure', description: 'Mortgage offer document creation', dataSensitivity: 'confidential' }
        },
        {
          id: 'process-booking',
          type: 'process',
          position: { x: 1260, y: 150 },
          data: { label: 'Loan Booking', technology: 'Temenos T24', description: 'Core banking loan account creation', dataSensitivity: 'confidential' }
        },
        {
          id: 'actor-underwriter',
          type: 'actor',
          position: { x: 1180, y: 640 },
          data: { label: 'Underwriter', actorType: 'user', description: 'Manual review for complex cases' }
        },
        {
          id: 'datastore-loans',
          type: 'datastore',
          position: { x: 1100, y: 300 },
          data: { label: 'Loan Master', technology: 'Oracle DB', description: 'Booked mortgage accounts', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-collateral',
          type: 'datastore',
          position: { x: 1260, y: 300 },
          data: { label: 'Collateral Registry', technology: 'Azure SQL', description: 'Property collateral records', dataSensitivity: 'confidential' }
        },
        {
          id: 'datastore-audit',
          type: 'datastore',
          position: { x: 1180, y: 450 },
          data: { label: 'Decision Audit', technology: 'Azure Monitor', description: 'Credit decision trail for compliance', dataSensitivity: 'confidential' }
        },
      ],
      edges: [
        { id: 'e1', source: 'actor-applicant', target: 'process-portal', type: 'dataFlow', data: { label: 'Application Data', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII', 'Financial'] } },
        { id: 'e2', source: 'actor-broker', target: 'process-api', type: 'dataFlow', data: { label: 'Broker Submission', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII', 'Financial'] } },
        { id: 'e3', source: 'process-portal', target: 'process-api', type: 'dataFlow', data: { label: 'API Calls', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII', 'Financial'] } },
        { id: 'e4', source: 'process-api', target: 'process-doc-collection', type: 'dataFlow', data: { label: 'Document Upload', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e5', source: 'process-doc-collection', target: 'process-doc-ocr', type: 'dataFlow', data: { label: 'OCR Processing', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII', 'Financial'] } },
        { id: 'e6', source: 'process-doc-collection', target: 'datastore-documents', type: 'dataFlow', data: { label: 'Document Storage', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e7', source: 'process-api', target: 'datastore-applications', type: 'dataFlow', data: { label: 'Application Data', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['PII', 'Financial'] } },
        { id: 'e8', source: 'process-api', target: 'process-credit-check', type: 'dataFlow', data: { label: 'Credit Request', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII'] } },
        { id: 'e9', source: 'process-credit-check', target: 'actor-bkr', type: 'dataFlow', data: { label: 'BKR Inquiry', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['PII', 'Financial'] } },
        { id: 'e10', source: 'process-credit-check', target: 'process-affordability', type: 'dataFlow', data: { label: 'Credit Score', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e11', source: 'process-doc-ocr', target: 'process-affordability', type: 'dataFlow', data: { label: 'Income Data', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e12', source: 'process-api', target: 'process-valuation', type: 'dataFlow', data: { label: 'Property Details', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e13', source: 'process-valuation', target: 'actor-kadaster', type: 'dataFlow', data: { label: 'Registry Lookup', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e14', source: 'process-affordability', target: 'process-underwriting', type: 'dataFlow', data: { label: 'Affordability Result', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e15', source: 'process-valuation', target: 'process-underwriting', type: 'dataFlow', data: { label: 'LTV Calculation', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e16', source: 'process-underwriting', target: 'process-pricing', type: 'dataFlow', data: { label: 'Risk Decision', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e17', source: 'process-pricing', target: 'process-offer-gen', type: 'dataFlow', data: { label: 'Offer Terms', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e18', source: 'actor-underwriter', target: 'process-underwriting', type: 'dataFlow', data: { label: 'Manual Review', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'Confidential'] } },
        { id: 'e19', source: 'process-offer-gen', target: 'actor-applicant', type: 'dataFlow', data: { label: 'Offer Document', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial', 'PII'] } },
        { id: 'e20', source: 'process-offer-gen', target: 'process-booking', type: 'dataFlow', data: { label: 'Accepted Offer', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e21', source: 'process-booking', target: 'datastore-loans', type: 'dataFlow', data: { label: 'Loan Record', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e22', source: 'process-valuation', target: 'datastore-collateral', type: 'dataFlow', data: { label: 'Collateral Record', protocol: 'SQL', encrypted: true, authenticated: true, dataClassification: ['Financial'] } },
        { id: 'e23', source: 'process-underwriting', target: 'datastore-audit', type: 'dataFlow', data: { label: 'Decision Trail', protocol: 'HTTPS', encrypted: true, authenticated: true, dataClassification: ['Confidential'] } },
      ],
    },
    createdBy: 'system',
    isPublic: true,
    useCount: 76,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },

  // ============ EXISTING TEMPLATES ============
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

const DEFAULT_THREAT_MODELS = [
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

// ============ Initialize from localStorage or defaults ============
const diagrams = loadFromStorage(STORAGE_KEYS.diagrams, DEFAULT_DIAGRAMS)
const threatModels = loadFromStorage(STORAGE_KEYS.threatModels, DEFAULT_THREAT_MODELS)

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
    saveToStorage(STORAGE_KEYS.threatModels, threatModels)
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
    saveToStorage(STORAGE_KEYS.diagrams, diagrams)
    return HttpResponse.json(newDiagram, { status: 201 })
  }),

  // Update diagram (save canvas)
  http.patch(`${API_BASE}/diagrams/:id`, async ({ params, request }) => {
    const { id } = params
    const body = (await request.json()) as Record<string, unknown>
    const index = diagrams.findIndex((d) => d.id === id || d.slug === id)
    if (index === -1) {
      return new HttpResponse(null, { status: 404 })
    }
    const updated = {
      ...diagrams[index],
      ...body,
      updatedAt: new Date().toISOString(),
    }
    diagrams[index] = updated as typeof diagrams[0]
    saveToStorage(STORAGE_KEYS.diagrams, diagrams)
    return HttpResponse.json(updated)
  }),

  // Delete diagram
  http.delete(`${API_BASE}/diagrams/:id`, ({ params }) => {
    const { id } = params
    const index = diagrams.findIndex((d) => d.id === id || d.slug === id)
    if (index === -1) {
      return new HttpResponse(null, { status: 404 })
    }
    diagrams.splice(index, 1)
    saveToStorage(STORAGE_KEYS.diagrams, diagrams)
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
