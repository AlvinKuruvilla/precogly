/**
 * Sample Technology Registry
 *
 * This provides a baseline set of technologies for autocomplete.
 * In production, this would be loaded from an API or database.
 */

import type { TechnologyEntry, TechnologyRegistry } from '../types/technology'

// ═══════════════════════════════════════════════════════════════════════════
// AWS TECHNOLOGIES
// ═══════════════════════════════════════════════════════════════════════════

const awsTechnologies: TechnologyEntry[] = [
  // RDS variants
  {
    id: 'aws:rds:postgresql',
    displayName: 'Amazon RDS for PostgreSQL',
    provider: 'aws',
    category: 'datastore',
    description: 'Managed PostgreSQL database on AWS',
    inherits: 'aws:rds',
    inherentThreats: [
      { id: 'sql-injection', severity: 'high' },
      { id: 'privilege-escalation', severity: 'medium' },
      { id: 'data-exposure', severity: 'high' },
    ],
    providedControls: [
      { id: 'encryption-at-rest', when: '#encrypted_at_rest' },
      { id: 'encryption-in-transit', when: '#encrypted_in_transit' },
      { id: 'automated-backups', default: true },
      { id: 'multi-az', when: 'multi-az-enabled' },
    ],
    recommendedControls: [
      { id: 'parameterized-queries', mitigates: 'sql-injection' },
      { id: 'least-privilege-accounts', mitigates: 'privilege-escalation' },
      { id: 'vpc-security-groups', mitigates: 'unauthorized-access' },
    ],
    documentation: 'https://aws.amazon.com/rds/postgresql/',
  },
  {
    id: 'aws:rds:mysql',
    displayName: 'Amazon RDS for MySQL',
    provider: 'aws',
    category: 'datastore',
    description: 'Managed MySQL database on AWS',
    inherits: 'aws:rds',
    inherentThreats: [
      { id: 'sql-injection', severity: 'high' },
      { id: 'privilege-escalation', severity: 'medium' },
    ],
    providedControls: [
      { id: 'encryption-at-rest', when: '#encrypted_at_rest' },
      { id: 'encryption-in-transit', when: '#encrypted_in_transit' },
      { id: 'automated-backups', default: true },
    ],
    recommendedControls: [
      { id: 'parameterized-queries', mitigates: 'sql-injection' },
    ],
    documentation: 'https://aws.amazon.com/rds/mysql/',
  },

  // S3
  {
    id: 'aws:s3',
    displayName: 'Amazon S3',
    provider: 'aws',
    category: 'storage',
    description: 'Object storage service',
    inherentThreats: [
      { id: 'bucket-misconfiguration', severity: 'critical' },
      { id: 'data-exposure', severity: 'high' },
      { id: 'unauthorized-access', severity: 'high' },
    ],
    providedControls: [
      { id: 'encryption-at-rest', when: '#encrypted_at_rest' },
      { id: 'versioning', when: 'versioning-enabled' },
      { id: 'access-logging', when: 'logging-enabled' },
    ],
    recommendedControls: [
      { id: 'block-public-access', mitigates: 'bucket-misconfiguration' },
      { id: 'bucket-policies', mitigates: 'unauthorized-access' },
      { id: 'iam-roles', mitigates: 'credential-exposure' },
    ],
    documentation: 'https://aws.amazon.com/s3/',
  },

  // Lambda
  {
    id: 'aws:lambda',
    displayName: 'AWS Lambda',
    provider: 'aws',
    category: 'compute',
    description: 'Serverless compute service',
    inherentThreats: [
      { id: 'code-injection', severity: 'high' },
      { id: 'privilege-escalation', severity: 'medium' },
      { id: 'cold-start-latency', severity: 'low' },
    ],
    providedControls: [
      { id: 'vpc-isolation', when: 'vpc-enabled' },
      { id: 'ephemeral-storage', default: true },
    ],
    recommendedControls: [
      { id: 'least-privilege-iam', mitigates: 'privilege-escalation' },
      { id: 'input-validation', mitigates: 'code-injection' },
      { id: 'secrets-manager', mitigates: 'credential-exposure' },
    ],
    documentation: 'https://aws.amazon.com/lambda/',
  },

  // ElastiCache
  {
    id: 'aws:elasticache:redis',
    displayName: 'Amazon ElastiCache for Redis',
    provider: 'aws',
    category: 'datastore',
    description: 'Managed Redis cache service',
    inherentThreats: [
      { id: 'cache-poisoning', severity: 'medium' },
      { id: 'unauthorized-access', severity: 'high' },
      { id: 'data-exposure', severity: 'medium' },
    ],
    providedControls: [
      { id: 'encryption-at-rest', when: '#encrypted_at_rest' },
      { id: 'encryption-in-transit', when: '#encrypted_in_transit' },
      { id: 'auth-token', when: 'auth-enabled' },
    ],
    recommendedControls: [
      { id: 'vpc-security-groups', mitigates: 'unauthorized-access' },
    ],
    documentation: 'https://aws.amazon.com/elasticache/redis/',
  },

  // API Gateway
  {
    id: 'aws:api-gateway',
    displayName: 'Amazon API Gateway',
    provider: 'aws',
    category: 'api',
    description: 'Managed API gateway service',
    inherentThreats: [
      { id: 'api-abuse', severity: 'medium' },
      { id: 'injection-attacks', severity: 'high' },
      { id: 'dos-attack', severity: 'medium' },
    ],
    providedControls: [
      { id: 'rate-limiting', default: true },
      { id: 'request-validation', when: 'validation-enabled' },
      { id: 'waf-integration', when: 'waf-enabled' },
    ],
    recommendedControls: [
      { id: 'api-keys', mitigates: 'api-abuse' },
      { id: 'cognito-authorizer', mitigates: 'unauthorized-access' },
      { id: 'request-throttling', mitigates: 'dos-attack' },
    ],
    documentation: 'https://aws.amazon.com/api-gateway/',
  },

  // DynamoDB
  {
    id: 'aws:dynamodb',
    displayName: 'Amazon DynamoDB',
    provider: 'aws',
    category: 'datastore',
    description: 'Managed NoSQL database',
    inherentThreats: [
      { id: 'nosql-injection', severity: 'high' },
      { id: 'data-exposure', severity: 'high' },
    ],
    providedControls: [
      { id: 'encryption-at-rest', default: true },
      { id: 'point-in-time-recovery', when: 'pitr-enabled' },
    ],
    recommendedControls: [
      { id: 'fine-grained-access', mitigates: 'unauthorized-access' },
      { id: 'input-validation', mitigates: 'nosql-injection' },
    ],
    documentation: 'https://aws.amazon.com/dynamodb/',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// AZURE TECHNOLOGIES
// ═══════════════════════════════════════════════════════════════════════════

const azureTechnologies: TechnologyEntry[] = [
  {
    id: 'azure:sql',
    displayName: 'Azure SQL Database',
    provider: 'azure',
    category: 'datastore',
    description: 'Managed SQL database on Azure',
    inherentThreats: [
      { id: 'sql-injection', severity: 'high' },
      { id: 'privilege-escalation', severity: 'medium' },
    ],
    providedControls: [
      { id: 'transparent-data-encryption', default: true },
      { id: 'advanced-threat-protection', when: 'atp-enabled' },
    ],
    recommendedControls: [
      { id: 'parameterized-queries', mitigates: 'sql-injection' },
      { id: 'azure-ad-auth', mitigates: 'credential-exposure' },
    ],
    documentation: 'https://azure.microsoft.com/services/sql-database/',
  },
  {
    id: 'azure:cosmos-db',
    displayName: 'Azure Cosmos DB',
    provider: 'azure',
    category: 'datastore',
    description: 'Globally distributed NoSQL database',
    inherentThreats: [
      { id: 'nosql-injection', severity: 'high' },
      { id: 'data-exposure', severity: 'high' },
    ],
    providedControls: [
      { id: 'encryption-at-rest', default: true },
      { id: 'geo-redundancy', when: 'geo-redundancy-enabled' },
    ],
    recommendedControls: [
      { id: 'rbac', mitigates: 'unauthorized-access' },
    ],
    documentation: 'https://azure.microsoft.com/services/cosmos-db/',
  },
  {
    id: 'azure:blob',
    displayName: 'Azure Blob Storage',
    provider: 'azure',
    category: 'storage',
    description: 'Object storage for Azure',
    inherentThreats: [
      { id: 'container-misconfiguration', severity: 'critical' },
      { id: 'data-exposure', severity: 'high' },
    ],
    providedControls: [
      { id: 'encryption-at-rest', default: true },
      { id: 'soft-delete', when: 'soft-delete-enabled' },
    ],
    recommendedControls: [
      { id: 'private-endpoints', mitigates: 'unauthorized-access' },
      { id: 'sas-tokens', mitigates: 'credential-exposure' },
    ],
    documentation: 'https://azure.microsoft.com/services/storage/blobs/',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// GCP TECHNOLOGIES
// ═══════════════════════════════════════════════════════════════════════════

const gcpTechnologies: TechnologyEntry[] = [
  {
    id: 'gcp:cloud-sql:postgresql',
    displayName: 'Cloud SQL for PostgreSQL',
    provider: 'gcp',
    category: 'datastore',
    description: 'Managed PostgreSQL on Google Cloud',
    inherentThreats: [
      { id: 'sql-injection', severity: 'high' },
      { id: 'privilege-escalation', severity: 'medium' },
    ],
    providedControls: [
      { id: 'encryption-at-rest', default: true },
      { id: 'automated-backups', default: true },
    ],
    recommendedControls: [
      { id: 'cloud-sql-proxy', mitigates: 'unauthorized-access' },
      { id: 'iam-auth', mitigates: 'credential-exposure' },
    ],
    documentation: 'https://cloud.google.com/sql/docs/postgres',
  },
  {
    id: 'gcp:cloud-storage',
    displayName: 'Google Cloud Storage',
    provider: 'gcp',
    category: 'storage',
    description: 'Object storage for Google Cloud',
    inherentThreats: [
      { id: 'bucket-misconfiguration', severity: 'critical' },
      { id: 'data-exposure', severity: 'high' },
    ],
    providedControls: [
      { id: 'encryption-at-rest', default: true },
      { id: 'versioning', when: 'versioning-enabled' },
    ],
    recommendedControls: [
      { id: 'uniform-bucket-access', mitigates: 'misconfiguration' },
      { id: 'signed-urls', mitigates: 'unauthorized-access' },
    ],
    documentation: 'https://cloud.google.com/storage',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// SELF-HOSTED TECHNOLOGIES
// ═══════════════════════════════════════════════════════════════════════════

const techTechnologies: TechnologyEntry[] = [
  // Databases
  {
    id: 'tech:postgresql',
    displayName: 'PostgreSQL',
    provider: 'tech',
    category: 'datastore',
    description: 'Open-source relational database',
    inherentThreats: [
      { id: 'sql-injection', severity: 'high' },
      { id: 'privilege-escalation', severity: 'medium' },
      { id: 'misconfiguration', severity: 'medium' },
    ],
    providedControls: [],
    recommendedControls: [
      { id: 'parameterized-queries', mitigates: 'sql-injection' },
      { id: 'ssl-connections', mitigates: 'data-exposure' },
      { id: 'role-based-access', mitigates: 'privilege-escalation' },
    ],
    documentation: 'https://www.postgresql.org/docs/',
  },
  {
    id: 'tech:mysql',
    displayName: 'MySQL',
    provider: 'tech',
    category: 'datastore',
    description: 'Open-source relational database',
    inherentThreats: [
      { id: 'sql-injection', severity: 'high' },
      { id: 'privilege-escalation', severity: 'medium' },
    ],
    providedControls: [],
    recommendedControls: [
      { id: 'parameterized-queries', mitigates: 'sql-injection' },
      { id: 'ssl-connections', mitigates: 'data-exposure' },
    ],
    documentation: 'https://dev.mysql.com/doc/',
  },
  {
    id: 'tech:mongodb',
    displayName: 'MongoDB',
    provider: 'tech',
    category: 'datastore',
    description: 'Document-oriented NoSQL database',
    inherentThreats: [
      { id: 'nosql-injection', severity: 'high' },
      { id: 'misconfiguration', severity: 'critical' },
    ],
    providedControls: [],
    recommendedControls: [
      { id: 'authentication', mitigates: 'unauthorized-access' },
      { id: 'field-level-encryption', mitigates: 'data-exposure' },
    ],
    documentation: 'https://www.mongodb.com/docs/',
  },
  {
    id: 'tech:redis',
    displayName: 'Redis',
    provider: 'tech',
    category: 'datastore',
    description: 'In-memory data structure store',
    inherentThreats: [
      { id: 'unauthorized-access', severity: 'high' },
      { id: 'data-exposure', severity: 'medium' },
    ],
    providedControls: [],
    recommendedControls: [
      { id: 'requirepass', mitigates: 'unauthorized-access' },
      { id: 'tls', mitigates: 'data-exposure' },
      { id: 'acl', mitigates: 'privilege-escalation' },
    ],
    documentation: 'https://redis.io/documentation',
  },

  // Compute / Runtime
  {
    id: 'tech:nodejs',
    displayName: 'Node.js',
    provider: 'tech',
    category: 'compute',
    description: 'JavaScript runtime',
    inherentThreats: [
      { id: 'prototype-pollution', severity: 'high' },
      { id: 'dependency-vulnerabilities', severity: 'high' },
      { id: 'code-injection', severity: 'high' },
    ],
    providedControls: [],
    recommendedControls: [
      { id: 'npm-audit', mitigates: 'dependency-vulnerabilities' },
      { id: 'input-validation', mitigates: 'code-injection' },
      { id: 'helmet', mitigates: 'common-web-vulnerabilities' },
    ],
    documentation: 'https://nodejs.org/docs/',
  },
  {
    id: 'tech:python',
    displayName: 'Python',
    provider: 'tech',
    category: 'compute',
    description: 'Python runtime',
    inherentThreats: [
      { id: 'code-injection', severity: 'high' },
      { id: 'dependency-vulnerabilities', severity: 'high' },
    ],
    providedControls: [],
    recommendedControls: [
      { id: 'pip-audit', mitigates: 'dependency-vulnerabilities' },
      { id: 'input-validation', mitigates: 'code-injection' },
    ],
    documentation: 'https://docs.python.org/',
  },
  {
    id: 'tech:java',
    displayName: 'Java',
    provider: 'tech',
    category: 'compute',
    description: 'Java runtime (JVM)',
    inherentThreats: [
      { id: 'deserialization', severity: 'critical' },
      { id: 'dependency-vulnerabilities', severity: 'high' },
    ],
    providedControls: [
      { id: 'security-manager', when: 'security-manager-enabled' },
    ],
    recommendedControls: [
      { id: 'safe-deserialization', mitigates: 'deserialization' },
      { id: 'dependency-check', mitigates: 'dependency-vulnerabilities' },
    ],
    documentation: 'https://docs.oracle.com/en/java/',
  },
  {
    id: 'tech:go',
    displayName: 'Go',
    provider: 'tech',
    category: 'compute',
    description: 'Go programming language runtime',
    inherentThreats: [
      { id: 'memory-safety', severity: 'low' },
      { id: 'dependency-vulnerabilities', severity: 'medium' },
    ],
    providedControls: [
      { id: 'memory-safety', default: true },
    ],
    recommendedControls: [
      { id: 'govulncheck', mitigates: 'dependency-vulnerabilities' },
    ],
    documentation: 'https://golang.org/doc/',
  },

  // Frontend
  {
    id: 'tech:react',
    displayName: 'React',
    provider: 'tech',
    category: 'frontend',
    description: 'JavaScript UI library',
    inherentThreats: [
      { id: 'xss', severity: 'high' },
      { id: 'dependency-vulnerabilities', severity: 'high' },
    ],
    providedControls: [
      { id: 'jsx-escaping', default: true },
    ],
    recommendedControls: [
      { id: 'content-security-policy', mitigates: 'xss' },
      { id: 'npm-audit', mitigates: 'dependency-vulnerabilities' },
    ],
    documentation: 'https://react.dev/',
  },

  // Web servers
  {
    id: 'tech:nginx',
    displayName: 'Nginx',
    provider: 'tech',
    category: 'networking',
    description: 'Web server and reverse proxy',
    inherentThreats: [
      { id: 'misconfiguration', severity: 'high' },
      { id: 'dos-attack', severity: 'medium' },
    ],
    providedControls: [],
    recommendedControls: [
      { id: 'rate-limiting', mitigates: 'dos-attack' },
      { id: 'security-headers', mitigates: 'common-web-vulnerabilities' },
      { id: 'ssl-hardening', mitigates: 'protocol-vulnerabilities' },
    ],
    documentation: 'https://nginx.org/en/docs/',
  },

  // Container
  {
    id: 'tech:docker',
    displayName: 'Docker',
    provider: 'tech',
    category: 'compute',
    description: 'Container runtime',
    inherentThreats: [
      { id: 'container-escape', severity: 'critical' },
      { id: 'image-vulnerabilities', severity: 'high' },
      { id: 'privilege-escalation', severity: 'high' },
    ],
    providedControls: [
      { id: 'namespace-isolation', default: true },
    ],
    recommendedControls: [
      { id: 'non-root-user', mitigates: 'privilege-escalation' },
      { id: 'image-scanning', mitigates: 'image-vulnerabilities' },
      { id: 'read-only-filesystem', mitigates: 'container-escape' },
    ],
    documentation: 'https://docs.docker.com/',
  },
  {
    id: 'tech:kubernetes',
    displayName: 'Kubernetes',
    provider: 'tech',
    category: 'compute',
    description: 'Container orchestration platform',
    inherentThreats: [
      { id: 'rbac-misconfiguration', severity: 'critical' },
      { id: 'network-exposure', severity: 'high' },
      { id: 'secrets-exposure', severity: 'high' },
    ],
    providedControls: [
      { id: 'rbac', default: true },
      { id: 'network-policies', when: 'network-policies-enabled' },
    ],
    recommendedControls: [
      { id: 'pod-security-standards', mitigates: 'privilege-escalation' },
      { id: 'secrets-management', mitigates: 'secrets-exposure' },
      { id: 'network-segmentation', mitigates: 'network-exposure' },
    ],
    documentation: 'https://kubernetes.io/docs/',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// EXTERNAL (THIRD-PARTY) TECHNOLOGIES
// ═══════════════════════════════════════════════════════════════════════════

const externalTechnologies: TechnologyEntry[] = [
  {
    id: 'external:stripe',
    displayName: 'Stripe',
    provider: 'external',
    category: 'api',
    description: 'Payment processing platform',
    inherentThreats: [
      { id: 'api-key-exposure', severity: 'critical' },
      { id: 'webhook-spoofing', severity: 'high' },
    ],
    providedControls: [
      { id: 'pci-compliance', default: true },
      { id: 'webhook-signatures', default: true },
    ],
    recommendedControls: [
      { id: 'secret-key-protection', mitigates: 'api-key-exposure' },
      { id: 'webhook-verification', mitigates: 'webhook-spoofing' },
    ],
    documentation: 'https://stripe.com/docs',
  },
  {
    id: 'external:auth0',
    displayName: 'Auth0',
    provider: 'external',
    category: 'authentication',
    description: 'Identity management platform',
    inherentThreats: [
      { id: 'token-exposure', severity: 'high' },
      { id: 'misconfiguration', severity: 'medium' },
    ],
    providedControls: [
      { id: 'mfa', when: '#mfa' },
      { id: 'brute-force-protection', default: true },
    ],
    recommendedControls: [
      { id: 'secure-token-storage', mitigates: 'token-exposure' },
      { id: 'rule-review', mitigates: 'misconfiguration' },
    ],
    documentation: 'https://auth0.com/docs',
  },
  {
    id: 'external:twilio',
    displayName: 'Twilio',
    provider: 'external',
    category: 'api',
    description: 'Communication APIs (SMS, Voice, etc.)',
    inherentThreats: [
      { id: 'api-key-exposure', severity: 'critical' },
      { id: 'smishing', severity: 'medium' },
    ],
    providedControls: [],
    recommendedControls: [
      { id: 'api-key-rotation', mitigates: 'api-key-exposure' },
      { id: 'request-validation', mitigates: 'webhook-spoofing' },
    ],
    documentation: 'https://www.twilio.com/docs',
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const allTechnologies: TechnologyEntry[] = [
  ...awsTechnologies,
  ...azureTechnologies,
  ...gcpTechnologies,
  ...techTechnologies,
  ...externalTechnologies,
]

export const technologyRegistry: TechnologyRegistry = Object.fromEntries(
  allTechnologies.map(t => [t.id, t])
)

/**
 * Get all technologies as an array
 */
export function getAllTechnologies(): TechnologyEntry[] {
  return allTechnologies
}

/**
 * Get a technology by its namespaced ID
 */
export function getTechnology(id: string): TechnologyEntry | undefined {
  return technologyRegistry[id]
}

/**
 * Get technologies by provider
 */
export function getTechnologiesByProvider(provider: string): TechnologyEntry[] {
  return allTechnologies.filter(t => t.provider === provider)
}

/**
 * Get technologies by category
 */
export function getTechnologiesByCategory(category: string): TechnologyEntry[] {
  return allTechnologies.filter(t => t.category === category)
}
