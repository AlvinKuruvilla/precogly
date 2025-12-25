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

  // ===========================================
  // DATA FLOW COUNTERMEASURES - ENCRYPTION
  // ===========================================
  {
    id: 'cm-df-tls',
    name: 'TLS Encryption',
    description: 'Use TLS 1.2 or higher for all data in transit with strong cipher suites',
    mitigatesThreatIds: [
      'threat-df-mitm',
      'threat-df-eavesdropping',
      'threat-df-plaintext-credentials',
      'threat-df-session-hijacking',
      'threat-df-cookie-hijacking',
      'threat-df-sql-connection-exposure',
      'threat-df-sql-query-interception',
    ],
    strideCategories: ['tampering', 'information_disclosure', 'spoofing'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '4.1' },
      { standard: 'NIST', reference: 'SC-8' },
      { standard: 'GDPR', reference: 'Art. 32' },
    ],
  },
  {
    id: 'cm-df-mutual-tls',
    name: 'Mutual TLS (mTLS)',
    description: 'Implement mutual TLS authentication to verify both client and server identities',
    mitigatesThreatIds: [
      'threat-df-mitm',
      'threat-df-unauthorized-access',
      'threat-df-replay',
      'threat-df-cert-validation-bypass',
      'threat-df-grpc-metadata-tampering',
    ],
    strideCategories: ['spoofing', 'tampering'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '4.1' },
      { standard: 'NIST', reference: 'SC-8' },
    ],
  },
  {
    id: 'cm-df-hsts',
    name: 'HTTP Strict Transport Security',
    description: 'Enable HSTS to prevent protocol downgrade attacks and force HTTPS connections',
    mitigatesThreatIds: [
      'threat-df-ssl-stripping',
      'threat-df-cookie-hijacking',
    ],
    strideCategories: ['tampering', 'spoofing'],
    isPlatformLevel: true,
    standards: [
      { standard: 'OWASP', reference: 'A02:2021' },
      { standard: 'PCI-DSS', reference: '4.1' },
    ],
  },
  {
    id: 'cm-df-cert-pinning',
    name: 'Certificate Pinning',
    description: 'Pin server certificates to prevent MITM attacks with forged certificates',
    mitigatesThreatIds: [
      'threat-df-cert-validation-bypass',
      'threat-df-mitm',
    ],
    strideCategories: ['spoofing'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A02:2021' },
      { standard: 'NIST', reference: 'SC-17' },
    ],
  },

  // ===========================================
  // DATA FLOW COUNTERMEASURES - AUTHENTICATION
  // ===========================================
  {
    id: 'cm-df-api-authentication',
    name: 'API Authentication',
    description: 'Authenticate all API calls using tokens, API keys, or certificates',
    mitigatesThreatIds: [
      'threat-df-unauthorized-access',
      'threat-df-data-injection',
    ],
    strideCategories: ['spoofing', 'tampering'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A07:2021' },
      { standard: 'PCI-DSS', reference: '8.3' },
    ],
  },
  {
    id: 'cm-df-message-signing',
    name: 'Message Signing',
    description: 'Sign messages with digital signatures to ensure integrity and authenticity',
    mitigatesThreatIds: [
      'threat-df-data-injection',
      'threat-df-mitm',
      'threat-df-replay',
      'threat-df-message-poisoning',
    ],
    strideCategories: ['tampering', 'spoofing'],
    isPlatformLevel: false,
    standards: [
      { standard: 'PCI-DSS', reference: '3.4' },
      { standard: 'NIST', reference: 'SC-13' },
    ],
  },
  {
    id: 'cm-df-replay-protection',
    name: 'Replay Attack Protection',
    description: 'Use nonces, timestamps, or sequence numbers to prevent replay attacks',
    mitigatesThreatIds: [
      'threat-df-replay',
      'threat-df-message-replay',
    ],
    strideCategories: ['spoofing'],
    isPlatformLevel: false,
    standards: [
      { standard: 'NIST', reference: 'SC-23' },
      { standard: 'OWASP', reference: 'A07:2021' },
    ],
  },
  {
    id: 'cm-df-channel-binding',
    name: 'Channel Binding',
    description: 'Bind authentication tokens to the TLS channel to prevent token theft',
    mitigatesThreatIds: [
      'threat-df-mitm',
      'threat-df-replay',
      'threat-df-session-hijacking',
    ],
    strideCategories: ['spoofing', 'tampering'],
    isPlatformLevel: false,
    standards: [
      { standard: 'NIST', reference: 'SC-23' },
    ],
  },

  // ===========================================
  // DATA FLOW COUNTERMEASURES - HTTP SPECIFIC
  // ===========================================
  {
    id: 'cm-df-cors-policy',
    name: 'Strict CORS Policy',
    description: 'Configure restrictive CORS policies to prevent cross-origin attacks',
    mitigatesThreatIds: [
      'threat-df-cors-misconfiguration',
      'threat-df-cswsh',
    ],
    strideCategories: ['information_disclosure', 'spoofing'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A05:2021' },
    ],
  },
  {
    id: 'cm-df-secure-headers',
    name: 'Security Headers',
    description: 'Implement security headers (X-Frame-Options, CSP, X-Content-Type-Options)',
    mitigatesThreatIds: [
      'threat-df-http-header-injection',
      'threat-df-http-response-splitting',
    ],
    strideCategories: ['tampering'],
    isPlatformLevel: true,
    standards: [
      { standard: 'OWASP', reference: 'A05:2021' },
      { standard: 'PCI-DSS', reference: '6.5.10' },
    ],
  },
  {
    id: 'cm-df-secure-cookies',
    name: 'Secure Cookie Attributes',
    description: 'Set Secure, HttpOnly, and SameSite attributes on all session cookies',
    mitigatesThreatIds: [
      'threat-df-cookie-hijacking',
      'threat-df-session-hijacking',
    ],
    strideCategories: ['spoofing', 'information_disclosure'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A07:2021' },
      { standard: 'PCI-DSS', reference: '6.5.10' },
    ],
  },
  {
    id: 'cm-df-input-encoding',
    name: 'Input/Output Encoding',
    description: 'Properly encode inputs and outputs to prevent injection attacks',
    mitigatesThreatIds: [
      'threat-df-http-header-injection',
      'threat-df-http-response-splitting',
    ],
    strideCategories: ['tampering'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A03:2021' },
    ],
  },

  // ===========================================
  // DATA FLOW COUNTERMEASURES - WEBSOCKET
  // ===========================================
  {
    id: 'cm-df-websocket-origin',
    name: 'WebSocket Origin Validation',
    description: 'Validate Origin header on WebSocket handshakes to prevent CSWSH attacks',
    mitigatesThreatIds: [
      'threat-df-cswsh',
    ],
    strideCategories: ['spoofing'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A07:2021' },
    ],
  },
  {
    id: 'cm-df-websocket-auth',
    name: 'WebSocket Authentication',
    description: 'Authenticate WebSocket connections and validate messages',
    mitigatesThreatIds: [
      'threat-df-cswsh',
      'threat-df-websocket-injection',
    ],
    strideCategories: ['spoofing', 'tampering'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A07:2021' },
    ],
  },

  // ===========================================
  // DATA FLOW COUNTERMEASURES - MESSAGE QUEUES
  // ===========================================
  {
    id: 'cm-df-queue-auth',
    name: 'Message Queue Authentication',
    description: 'Require authentication for all queue publish and subscribe operations',
    mitigatesThreatIds: [
      'threat-df-unauthorized-subscription',
      'threat-df-message-poisoning',
    ],
    strideCategories: ['spoofing', 'information_disclosure'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '8.3' },
      { standard: 'SOC2', reference: 'CC6.1' },
    ],
  },
  {
    id: 'cm-df-queue-acl',
    name: 'Queue Access Control Lists',
    description: 'Implement fine-grained ACLs to restrict topic/queue access per client',
    mitigatesThreatIds: [
      'threat-df-unauthorized-subscription',
      'threat-df-message-poisoning',
    ],
    strideCategories: ['information_disclosure', 'tampering'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '7.1' },
      { standard: 'SOC2', reference: 'CC6.1' },
    ],
  },

  // ===========================================
  // DATA FLOW COUNTERMEASURES - gRPC
  // ===========================================
  {
    id: 'cm-df-grpc-interceptors',
    name: 'gRPC Interceptors',
    description: 'Use gRPC interceptors to validate metadata and enforce security policies',
    mitigatesThreatIds: [
      'threat-df-grpc-metadata-tampering',
    ],
    strideCategories: ['tampering'],
    isPlatformLevel: false,
    standards: [
      { standard: 'OWASP', reference: 'A04:2021' },
    ],
  },
  {
    id: 'cm-df-grpc-reflection-disable',
    name: 'Disable gRPC Reflection',
    description: 'Disable gRPC reflection in production to prevent service enumeration',
    mitigatesThreatIds: [
      'threat-df-grpc-reflection',
    ],
    strideCategories: ['information_disclosure'],
    isPlatformLevel: true,
    standards: [
      { standard: 'OWASP', reference: 'A05:2021' },
    ],
  },

  // ===========================================
  // DATA FLOW COUNTERMEASURES - TCP/UDP
  // ===========================================
  {
    id: 'cm-df-tcp-randomization',
    name: 'TCP Sequence Randomization',
    description: 'Use strong randomization for TCP initial sequence numbers',
    mitigatesThreatIds: [
      'threat-df-tcp-session-hijacking',
    ],
    strideCategories: ['spoofing'],
    isPlatformLevel: true,
    standards: [
      { standard: 'NIST', reference: 'SC-7' },
    ],
  },
  {
    id: 'cm-df-source-validation',
    name: 'Source Address Validation',
    description: 'Implement ingress filtering to prevent IP spoofing attacks',
    mitigatesThreatIds: [
      'threat-df-udp-spoofing',
      'threat-df-udp-amplification',
    ],
    strideCategories: ['spoofing', 'denial_of_service'],
    isPlatformLevel: true,
    standards: [
      { standard: 'NIST', reference: 'SC-7' },
    ],
  },
  {
    id: 'cm-df-response-rate-limit',
    name: 'Response Rate Limiting',
    description: 'Limit UDP response rates to prevent amplification attacks',
    mitigatesThreatIds: [
      'threat-df-udp-amplification',
    ],
    strideCategories: ['denial_of_service'],
    isPlatformLevel: true,
    standards: [
      { standard: 'NIST', reference: 'SC-5' },
    ],
  },

  // ===========================================
  // DATA FLOW COUNTERMEASURES - GENERAL
  // ===========================================
  {
    id: 'cm-df-traffic-encryption',
    name: 'Traffic Padding/Encryption',
    description: 'Use traffic padding or encrypted tunnels to prevent traffic analysis',
    mitigatesThreatIds: ['threat-df-traffic-analysis'],
    strideCategories: ['information_disclosure'],
    isPlatformLevel: true,
    standards: [
      { standard: 'NIST', reference: 'SC-8' },
    ],
  },
  {
    id: 'cm-df-rate-limiting',
    name: 'Data Flow Rate Limiting',
    description: 'Implement rate limiting and throttling on data channels',
    mitigatesThreatIds: ['threat-df-dos'],
    strideCategories: ['denial_of_service'],
    isPlatformLevel: true,
    standards: [
      { standard: 'OWASP', reference: 'A04:2021' },
      { standard: 'DORA', reference: 'Art. 9' },
    ],
  },

  // ===========================================
  // TRUST BOUNDARY COUNTERMEASURES - FIREWALL
  // ===========================================
  {
    id: 'cm-tb-rule-review',
    name: 'Regular Rule Review',
    description: 'Periodic review and audit of firewall rules to remove unnecessary permissions',
    mitigatesThreatIds: ['threat-tb-firewall-misconfig', 'threat-tb-overly-permissive'],
    strideCategories: ['tampering', 'elevation_of_privilege'],
    isPlatformLevel: false,
    standards: [
      { standard: 'PCI-DSS', reference: '1.1.7' },
      { standard: 'NIST', reference: 'CM-7' },
    ],
  },
  {
    id: 'cm-tb-change-management',
    name: 'Change Management Process',
    description: 'Formal change management for security control configuration changes',
    mitigatesThreatIds: ['threat-tb-firewall-misconfig', 'threat-tb-waf-bypass'],
    strideCategories: ['tampering'],
    isPlatformLevel: false,
    standards: [
      { standard: 'PCI-DSS', reference: '1.1.1' },
      { standard: 'SOC2', reference: 'CC8.1' },
    ],
  },
  {
    id: 'cm-tb-default-deny',
    name: 'Default Deny Policy',
    description: 'Implement default-deny rules, explicitly allowing only required traffic',
    mitigatesThreatIds: ['threat-tb-overly-permissive', 'threat-tb-firewall-bypass'],
    strideCategories: ['elevation_of_privilege'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '1.2.1' },
      { standard: 'NIST', reference: 'SC-7' },
    ],
  },
  {
    id: 'cm-tb-credential-mgmt',
    name: 'Security Control Credential Management',
    description: 'Change default credentials, enforce strong passwords, use MFA for admin access',
    mitigatesThreatIds: ['threat-tb-default-creds'],
    strideCategories: ['spoofing'],
    isPlatformLevel: false,
    standards: [
      { standard: 'PCI-DSS', reference: '2.1' },
      { standard: 'NIST', reference: 'IA-5' },
    ],
  },
  {
    id: 'cm-tb-patch-mgmt',
    name: 'Security Control Patching',
    description: 'Regular patching and updates for security control firmware/software',
    mitigatesThreatIds: ['threat-tb-unpatched'],
    strideCategories: ['elevation_of_privilege'],
    isPlatformLevel: false,
    standards: [
      { standard: 'PCI-DSS', reference: '6.2' },
      { standard: 'NIST', reference: 'SI-2' },
    ],
  },
  {
    id: 'cm-tb-boundary-logging',
    name: 'Boundary Traffic Logging',
    description: 'Enable comprehensive logging of traffic and events at security boundaries',
    mitigatesThreatIds: ['threat-tb-missing-logging', 'threat-tb-ids-alert-fatigue'],
    strideCategories: ['repudiation'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '10.1' },
      { standard: 'SOC2', reference: 'CC7.2' },
    ],
  },

  // ===========================================
  // TRUST BOUNDARY COUNTERMEASURES - WAF
  // ===========================================
  {
    id: 'cm-tb-managed-rules',
    name: 'Managed Rule Sets',
    description: 'Use vendor-managed or OWASP rule sets with regular updates',
    mitigatesThreatIds: ['threat-tb-waf-bypass', 'threat-tb-waf-false-negative'],
    strideCategories: ['tampering'],
    isPlatformLevel: true,
    standards: [
      { standard: 'OWASP', reference: 'A03:2021' },
    ],
  },
  {
    id: 'cm-tb-waf-learning',
    name: 'WAF Learning Mode',
    description: 'Use learning/training mode to tune rules before enforcement',
    mitigatesThreatIds: ['threat-tb-waf-false-negative'],
    strideCategories: ['tampering'],
    isPlatformLevel: false,
    standards: [],
  },
  {
    id: 'cm-tb-request-limits',
    name: 'Request Size Limits',
    description: 'Configure request size and complexity limits to prevent resource exhaustion',
    mitigatesThreatIds: ['threat-tb-waf-dos'],
    strideCategories: ['denial_of_service'],
    isPlatformLevel: true,
    standards: [
      { standard: 'OWASP', reference: 'A04:2021' },
    ],
  },

  // ===========================================
  // TRUST BOUNDARY COUNTERMEASURES - API GATEWAY
  // ===========================================
  {
    id: 'cm-tb-apigw-auth-enforcement',
    name: 'Strict Auth Enforcement',
    description: 'Enforce authentication on all endpoints, validate tokens server-side',
    mitigatesThreatIds: ['threat-tb-apigw-auth-bypass'],
    strideCategories: ['spoofing'],
    isPlatformLevel: true,
    standards: [
      { standard: 'OWASP', reference: 'A07:2021' },
      { standard: 'PCI-DSS', reference: '8.3' },
    ],
  },
  {
    id: 'cm-tb-distributed-rate-limit',
    name: 'Distributed Rate Limiting',
    description: 'Implement rate limiting across multiple dimensions (IP, user, API key)',
    mitigatesThreatIds: ['threat-tb-apigw-rate-limit-bypass'],
    strideCategories: ['denial_of_service'],
    isPlatformLevel: true,
    standards: [
      { standard: 'OWASP', reference: 'A04:2021' },
    ],
  },
  {
    id: 'cm-tb-key-redaction',
    name: 'API Key Redaction',
    description: 'Redact API keys from logs, errors, and responses',
    mitigatesThreatIds: ['threat-tb-apigw-key-leakage'],
    strideCategories: ['information_disclosure'],
    isPlatformLevel: false,
    standards: [
      { standard: 'PCI-DSS', reference: '3.4' },
    ],
  },

  // ===========================================
  // TRUST BOUNDARY COUNTERMEASURES - TLS/LOAD BALANCER
  // ===========================================
  {
    id: 'cm-tb-tls-config',
    name: 'Strong TLS Configuration',
    description: 'Use TLS 1.2+, disable weak ciphers, enable PFS',
    mitigatesThreatIds: ['threat-tb-lb-tls-misconfig'],
    strideCategories: ['information_disclosure'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '4.1' },
      { standard: 'NIST', reference: 'SC-8' },
    ],
  },
  {
    id: 'cm-tb-health-security',
    name: 'Health Check Security',
    description: 'Restrict health check endpoints to internal access, minimize information disclosure',
    mitigatesThreatIds: ['threat-tb-lb-health-exposure'],
    strideCategories: ['information_disclosure'],
    isPlatformLevel: false,
    standards: [],
  },

  // ===========================================
  // TRUST BOUNDARY COUNTERMEASURES - VPN
  // ===========================================
  {
    id: 'cm-tb-vpn-mfa',
    name: 'VPN Multi-Factor Authentication',
    description: 'Require MFA for all VPN connections',
    mitigatesThreatIds: ['threat-tb-vpn-weak-auth'],
    strideCategories: ['spoofing'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '8.3' },
      { standard: 'NIST', reference: 'IA-2' },
    ],
  },
  {
    id: 'cm-tb-full-tunnel',
    name: 'Full Tunnel VPN',
    description: 'Use full tunnel mode to route all traffic through VPN when connected',
    mitigatesThreatIds: ['threat-tb-vpn-split-tunnel'],
    strideCategories: ['elevation_of_privilege'],
    isPlatformLevel: true,
    standards: [],
  },

  // ===========================================
  // TRUST BOUNDARY COUNTERMEASURES - IDS/IPS
  // ===========================================
  {
    id: 'cm-tb-ids-tuning',
    name: 'IDS/IPS Tuning',
    description: 'Regular tuning of signatures and thresholds to reduce false positives',
    mitigatesThreatIds: ['threat-tb-ids-evasion', 'threat-tb-ids-alert-fatigue'],
    strideCategories: ['tampering', 'repudiation'],
    isPlatformLevel: false,
    standards: [],
  },
  {
    id: 'cm-tb-ids-protocol-analysis',
    name: 'Protocol Analysis',
    description: 'Enable deep protocol analysis to detect evasion techniques',
    mitigatesThreatIds: ['threat-tb-ids-evasion'],
    strideCategories: ['tampering'],
    isPlatformLevel: true,
    standards: [],
  },

  // ===========================================
  // TRUST BOUNDARY COUNTERMEASURES - BASTION HOST
  // ===========================================
  {
    id: 'cm-tb-bastion-hardening',
    name: 'Bastion Host Hardening',
    description: 'Minimal software, restricted access, regular patching, no persistent storage',
    mitigatesThreatIds: ['threat-tb-bastion-compromise'],
    strideCategories: ['elevation_of_privilege'],
    isPlatformLevel: false,
    standards: [
      { standard: 'NIST', reference: 'CM-7' },
    ],
  },
  {
    id: 'cm-tb-session-recording',
    name: 'Session Recording',
    description: 'Record all administrative sessions through bastion for audit',
    mitigatesThreatIds: ['threat-tb-bastion-audit'],
    strideCategories: ['repudiation'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '10.2' },
    ],
  },

  // ===========================================
  // TRUST BOUNDARY COUNTERMEASURES - HSM
  // ===========================================
  {
    id: 'cm-tb-hsm-access-control',
    name: 'HSM Access Control',
    description: 'Implement strict role-based access control for HSM operations',
    mitigatesThreatIds: ['threat-tb-hsm-access-control', 'threat-tb-hsm-key-extraction'],
    strideCategories: ['elevation_of_privilege', 'information_disclosure'],
    isPlatformLevel: true,
    standards: [
      { standard: 'PCI-DSS', reference: '3.5' },
    ],
  },

  // ===========================================
  // TRUST BOUNDARY COUNTERMEASURES - DDOS
  // ===========================================
  {
    id: 'cm-tb-ddos-origin-protection',
    name: 'Origin Protection',
    description: 'Hide origin IPs and use always-on protection for critical services',
    mitigatesThreatIds: ['threat-tb-ddos-bypass'],
    strideCategories: ['denial_of_service'],
    isPlatformLevel: true,
    standards: [
      { standard: 'DORA', reference: 'Art. 9' },
    ],
  },
  {
    id: 'cm-tb-ddos-cost-management',
    name: 'DDoS Cost Management',
    description: 'Set spending limits and alerts for cloud-based DDoS protection services',
    mitigatesThreatIds: ['threat-tb-ddos-cost'],
    strideCategories: ['denial_of_service'],
    isPlatformLevel: true,
    standards: [],
  },

  // ===========================================
  // TRUST BOUNDARY COUNTERMEASURES - ZONES
  // ===========================================
  {
    id: 'cm-tb-zone-documentation',
    name: 'Trust Boundary Documentation',
    description: 'Document all trust boundaries, their purpose, and security requirements',
    mitigatesThreatIds: ['threat-tb-zone-undefined'],
    strideCategories: ['elevation_of_privilege'],
    isPlatformLevel: false,
    standards: [
      { standard: 'PCI-DSS', reference: '1.1.2' },
    ],
  },
  {
    id: 'cm-tb-micro-segmentation',
    name: 'Micro-Segmentation',
    description: 'Implement micro-segmentation within zones to limit lateral movement',
    mitigatesThreatIds: ['threat-tb-zone-lateral'],
    strideCategories: ['elevation_of_privilege'],
    isPlatformLevel: true,
    standards: [
      { standard: 'NIST', reference: 'SC-7' },
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

