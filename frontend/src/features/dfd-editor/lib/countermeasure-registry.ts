import type { STRIDECategory } from './threat-registry'

/**
 * Compliance/Security Standards
 */
export type SecurityStandard =
  | 'PCI-DSS'
  | 'SOC2'
  | 'ISO27001'
  | 'NIST'
  | 'OWASP'
  | 'GDPR'
  | 'HIPAA'
  | 'DORA'
  | 'CRA'

export const SECURITY_STANDARDS: Record<SecurityStandard, { label: string; description: string }> = {
  'PCI-DSS': {
    label: 'PCI-DSS',
    description: 'Payment Card Industry Data Security Standard',
  },
  SOC2: {
    label: 'SOC 2',
    description: 'Service Organization Control 2',
  },
  ISO27001: {
    label: 'ISO 27001',
    description: 'Information Security Management System',
  },
  NIST: {
    label: 'NIST CSF',
    description: 'NIST Cybersecurity Framework',
  },
  OWASP: {
    label: 'OWASP',
    description: 'Open Web Application Security Project',
  },
  GDPR: {
    label: 'GDPR',
    description: 'General Data Protection Regulation',
  },
  HIPAA: {
    label: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act',
  },
  DORA: {
    label: 'DORA',
    description: 'Digital Operational Resilience Act',
  },
  CRA: {
    label: 'CRA',
    description: 'Cyber Resilience Act',
  },
}

/**
 * Countermeasure definition in the library
 */
export interface CountermeasureDefinition {
  id: string
  name: string
  description: string
  // Threat IDs this countermeasure can mitigate
  mitigatesThreatIds: string[]
  // STRIDE categories this countermeasure addresses (derived from threats)
  strideCategories: STRIDECategory[]
  // Whether this is typically a platform/infrastructure-level control
  isPlatformLevel: boolean
  // Mapped compliance standards
  standards: { standard: SecurityStandard; reference?: string }[]
}

/**
 * Pre-seeded countermeasure library
 */
export const COUNTERMEASURE_DEFINITIONS: CountermeasureDefinition[] = [
  // ===========================================
  // AUTHENTICATION & IDENTITY
  // ===========================================
  {
    id: 'cm-strong-authentication',
    name: 'Strong Authentication',
    description: 'Implement robust authentication mechanisms including multi-factor authentication',
    mitigatesThreatIds: ['threat-identity-spoofing', 'threat-credential-theft', 'threat-session-hijacking'],
    strideCategories: ['spoofing'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '8.3' },
      { standard: 'SOC2', reference: 'CC6.1' },
      { standard: 'NIST', reference: 'PR.AC-1' },
      { standard: 'OWASP', reference: 'A07:2021' },
    ],
  },
  {
    id: 'cm-authorization-controls',
    name: 'Authorization Controls',
    description: 'Verify permissions before granting access to resources or actions',
    mitigatesThreatIds: ['threat-broken-access-control', 'threat-privilege-escalation'],
    strideCategories: ['spoofing', 'elevation_of_privilege'],
    isPlatformLevel: false,
    standards: [
      { standard: 'PCI-DSS', reference: '7.1' },
      { standard: 'SOC2', reference: 'CC6.1' },
      { standard: 'OWASP', reference: 'A01:2021' },
    ],
  },
  {
    id: 'cm-session-management',
    name: 'Secure Session Management',
    description: 'Implement secure session handling with timeouts, rotation, and invalidation',
    mitigatesThreatIds: ['threat-session-hijacking', 'threat-identity-spoofing'],
    strideCategories: ['spoofing'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A07:2021' },
      { standard: 'PCI-DSS', reference: '8.6' },
    ],
  },
  {
    id: 'cm-api-key-management',
    name: 'API Key Management',
    description: 'Secure storage, rotation, and revocation of API keys',
    mitigatesThreatIds: ['threat-api-key-compromise'],
    strideCategories: ['spoofing'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '3.5' },
      { standard: 'NIST', reference: 'PR.AC-1' },
    ],
  },

  // ===========================================
  // INPUT VALIDATION & DATA INTEGRITY
  // ===========================================
  {
    id: 'cm-input-validation',
    name: 'Input Validation',
    description: 'Validate and sanitize all user inputs to prevent injection attacks',
    mitigatesThreatIds: ['threat-sql-injection', 'threat-code-injection', 'threat-parameter-manipulation'],
    strideCategories: ['tampering'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A03:2021' },
      { standard: 'PCI-DSS', reference: '6.5.1' },
    ],
  },
  {
    id: 'cm-parameterized-queries',
    name: 'Parameterized Queries',
    description: 'Use parameterized queries or prepared statements for database access',
    mitigatesThreatIds: ['threat-sql-injection'],
    strideCategories: ['tampering'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A03:2021' },
      { standard: 'PCI-DSS', reference: '6.5.1' },
    ],
  },
  {
    id: 'cm-data-integrity',
    name: 'Data Integrity Controls',
    description: 'Implement checksums, digital signatures, or HMACs to detect tampering',
    mitigatesThreatIds: ['threat-data-tampering', 'threat-message-tampering'],
    strideCategories: ['tampering'],
    isPlatformLevel: false,
    standards: [
      { standard: 'PCI-DSS', reference: '3.4' },
      { standard: 'ISO27001', reference: 'A.12.2' },
    ],
  },
  {
    id: 'cm-secure-deserialization',
    name: 'Secure Deserialization',
    description: 'Validate and sanitize serialized data before deserialization',
    mitigatesThreatIds: ['threat-insecure-deserialization'],
    strideCategories: ['tampering', 'elevation_of_privilege'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A08:2021' },
    ],
  },

  // ===========================================
  // LOGGING & MONITORING
  // ===========================================
  {
    id: 'cm-security-logging',
    name: 'Security Logging',
    description: 'Log security-relevant events with sufficient detail for forensics',
    mitigatesThreatIds: ['threat-action-repudiation', 'threat-insufficient-logging'],
    strideCategories: ['repudiation'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '10.2' },
      { standard: 'SOC2', reference: 'CC7.2' },
      { standard: 'OWASP', reference: 'A09:2021' },
    ],
  },
  {
    id: 'cm-security-monitoring',
    name: 'Security Monitoring',
    description: 'Monitor for suspicious activities and security anomalies',
    mitigatesThreatIds: ['threat-action-repudiation', 'threat-log-tampering'],
    strideCategories: ['repudiation'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '10.6' },
      { standard: 'SOC2', reference: 'CC7.2' },
      { standard: 'DORA', reference: 'Art. 10' },
    ],
  },
  {
    id: 'cm-tamper-proof-logs',
    name: 'Tamper-Proof Logging',
    description: 'Store logs in immutable, tamper-proof storage with integrity verification',
    mitigatesThreatIds: ['threat-log-tampering'],
    strideCategories: ['repudiation'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '10.5' },
      { standard: 'ISO27001', reference: 'A.12.4' },
    ],
  },

  // ===========================================
  // ENCRYPTION & DATA PROTECTION
  // ===========================================
  {
    id: 'cm-encryption-at-rest',
    name: 'Encryption at Rest',
    description: 'Encrypt sensitive data stored in databases, files, and backups',
    mitigatesThreatIds: ['threat-data-leak', 'threat-backup-exposure'],
    strideCategories: ['information_disclosure'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '3.4' },
      { standard: 'GDPR', reference: 'Art. 32' },
      { standard: 'HIPAA', reference: '164.312(a)(2)(iv)' },
    ],
  },
  {
    id: 'cm-encryption-in-transit',
    name: 'Encryption in Transit',
    description: 'Use TLS/SSL for all network communications',
    mitigatesThreatIds: ['threat-network-sniffing', 'threat-data-leak', 'threat-certificate-spoofing'],
    strideCategories: ['information_disclosure', 'spoofing'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '4.1' },
      { standard: 'GDPR', reference: 'Art. 32' },
      { standard: 'OWASP', reference: 'A02:2021' },
    ],
  },
  {
    id: 'cm-data-masking',
    name: 'Data Masking',
    description: 'Mask sensitive data in logs, error messages, and non-production environments',
    mitigatesThreatIds: ['threat-error-disclosure', 'threat-data-leak', 'threat-metadata-leakage'],
    strideCategories: ['information_disclosure'],
    isPlatformLevel: false,
    standards: [
      { standard: 'PCI-DSS', reference: '3.3' },
      { standard: 'GDPR', reference: 'Art. 25' },
    ],
  },
  {
    id: 'cm-cache-security',
    name: 'Cache Security',
    description: 'Implement proper cache controls and avoid caching sensitive data',
    mitigatesThreatIds: ['threat-cache-poisoning'],
    strideCategories: ['information_disclosure'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A02:2021' },
    ],
  },

  // ===========================================
  // AVAILABILITY & RESILIENCE
  // ===========================================
  {
    id: 'cm-ddos-protection',
    name: 'DDoS Protection',
    description: 'Implement DDoS mitigation at network and application layers',
    mitigatesThreatIds: ['threat-ddos'],
    strideCategories: ['denial_of_service'],
    isPlatformLevel: true,
    standards: [
      { standard: 'DORA', reference: 'Art. 9' },
      { standard: 'NIST', reference: 'PR.DS-4' },
    ],
  },
  {
    id: 'cm-rate-limiting',
    name: 'Rate Limiting',
    description: 'Implement rate limiting to prevent resource exhaustion',
    mitigatesThreatIds: ['threat-ddos', 'threat-resource-exhaustion', 'threat-database-dos'],
    strideCategories: ['denial_of_service'],
    isPlatformLevel: true,
    standards: [
      { standard: 'OWASP', reference: 'A04:2021' },
    ],
  },
  {
    id: 'cm-resource-quotas',
    name: 'Resource Quotas',
    description: 'Set resource limits and quotas to prevent exhaustion attacks',
    mitigatesThreatIds: ['threat-resource-exhaustion', 'threat-storage-exhaustion', 'threat-queue-flooding'],
    strideCategories: ['denial_of_service'],
    isPlatformLevel: true,
    standards: [
      { standard: 'NIST', reference: 'PR.DS-4' },
    ],
  },
  {
    id: 'cm-query-optimization',
    name: 'Query Optimization',
    description: 'Implement query timeouts, pagination, and complexity limits',
    mitigatesThreatIds: ['threat-database-dos'],
    strideCategories: ['denial_of_service'],
    isPlatformLevel: false,
    standards: [
      { standard: 'PCI-DSS', reference: '6.5.6' },
    ],
  },

  // ===========================================
  // ACCESS CONTROL & PRIVILEGE
  // ===========================================
  {
    id: 'cm-least-privilege',
    name: 'Least Privilege',
    description: 'Grant minimum necessary permissions for each role and service',
    mitigatesThreatIds: ['threat-privilege-escalation', 'threat-broken-access-control', 'threat-iam-misconfiguration'],
    strideCategories: ['elevation_of_privilege'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '7.1' },
      { standard: 'SOC2', reference: 'CC6.1' },
      { standard: 'NIST', reference: 'PR.AC-4' },
    ],
  },
  {
    id: 'cm-rbac',
    name: 'Role-Based Access Control',
    description: 'Implement RBAC with clearly defined roles and permissions',
    mitigatesThreatIds: ['threat-broken-access-control', 'threat-privilege-escalation'],
    strideCategories: ['elevation_of_privilege'],
    isPlatformLevel: false,
    standards: [
      { standard: 'PCI-DSS', reference: '7.2' },
      { standard: 'SOC2', reference: 'CC6.2' },
    ],
  },
  {
    id: 'cm-container-security',
    name: 'Container Security',
    description: 'Implement container hardening, image scanning, and runtime security',
    mitigatesThreatIds: ['threat-container-escape', 'threat-config-tampering'],
    strideCategories: ['elevation_of_privilege', 'tampering'],
    isPlatformLevel: true,
    standards: [
      { standard: 'NIST', reference: 'PR.DS-6' },
    ],
  },
  {
    id: 'cm-infrastructure-security',
    name: 'Infrastructure Security',
    description: 'Harden infrastructure with security groups, network policies, and segmentation',
    mitigatesThreatIds: ['threat-iam-misconfiguration', 'threat-config-tampering'],
    strideCategories: ['elevation_of_privilege', 'tampering'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '1.3' },
      { standard: 'NIST', reference: 'PR.AC-5' },
    ],
  },
]

/**
 * Get countermeasures that mitigate a specific threat
 */
export function getCountermeasuresForThreat(threatId: string): CountermeasureDefinition[] {
  return COUNTERMEASURE_DEFINITIONS.filter((cm) =>
    cm.mitigatesThreatIds.includes(threatId)
  )
}

/**
 * Get countermeasures by STRIDE category
 */
export function getCountermeasuresBySTRIDE(strideCategory: STRIDECategory): CountermeasureDefinition[] {
  return COUNTERMEASURE_DEFINITIONS.filter((cm) =>
    cm.strideCategories.includes(strideCategory)
  )
}

/**
 * Get countermeasures by security standard
 */
export function getCountermeasuresByStandard(standard: SecurityStandard): CountermeasureDefinition[] {
  return COUNTERMEASURE_DEFINITIONS.filter((cm) =>
    cm.standards.some((s) => s.standard === standard)
  )
}

/**
 * Get a countermeasure by ID
 */
export function getCountermeasureById(id: string): CountermeasureDefinition | undefined {
  return COUNTERMEASURE_DEFINITIONS.find((cm) => cm.id === id)
}

/**
 * Get platform-level countermeasures
 */
export function getPlatformCountermeasures(): CountermeasureDefinition[] {
  return COUNTERMEASURE_DEFINITIONS.filter((cm) => cm.isPlatformLevel)
}

/**
 * Get application-level countermeasures
 */
export function getApplicationCountermeasures(): CountermeasureDefinition[] {
  return COUNTERMEASURE_DEFINITIONS.filter((cm) => !cm.isPlatformLevel)
}
