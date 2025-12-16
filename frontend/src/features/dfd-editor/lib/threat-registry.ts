import type { TechnologyCategory } from './technology-registry'

/**
 * STRIDE Threat Categories
 * - Spoofing: Pretending to be something or someone else
 * - Tampering: Modifying data or code
 * - Repudiation: Denying having performed an action
 * - Information Disclosure: Exposing information to unauthorized entities
 * - Denial of Service: Making a system unavailable
 * - Elevation of Privilege: Gaining capabilities without authorization
 */
export type STRIDECategory =
  | 'spoofing'
  | 'tampering'
  | 'repudiation'
  | 'information_disclosure'
  | 'denial_of_service'
  | 'elevation_of_privilege'

export const STRIDE_CONFIG: Record<
  STRIDECategory,
  { label: string; shortLabel: string; description: string; color: string }
> = {
  spoofing: {
    label: 'Spoofing',
    shortLabel: 'S',
    description: 'Pretending to be something or someone else',
    color: '#ef4444', // red
  },
  tampering: {
    label: 'Tampering',
    shortLabel: 'T',
    description: 'Modifying data or code without authorization',
    color: '#f97316', // orange
  },
  repudiation: {
    label: 'Repudiation',
    shortLabel: 'R',
    description: 'Denying having performed an action',
    color: '#eab308', // yellow
  },
  information_disclosure: {
    label: 'Information Disclosure',
    shortLabel: 'I',
    description: 'Exposing information to unauthorized parties',
    color: '#22c55e', // green
  },
  denial_of_service: {
    label: 'Denial of Service',
    shortLabel: 'D',
    description: 'Making a system unavailable or degraded',
    color: '#3b82f6', // blue
  },
  elevation_of_privilege: {
    label: 'Elevation of Privilege',
    shortLabel: 'E',
    description: 'Gaining unauthorized capabilities or access',
    color: '#8b5cf6', // purple
  },
}

/**
 * Threat definition in the library
 */
export interface ThreatDefinition {
  id: string
  name: string
  description: string
  strideCategory: STRIDECategory
  // Technology categories this threat applies to
  applicableTechCategories: TechnologyCategory[]
  // Specific technology IDs this threat is especially relevant for (optional)
  applicableTechIds?: string[]
}

/**
 * Pre-seeded threat library linked to technology categories
 */
export const THREAT_DEFINITIONS: ThreatDefinition[] = [
  // ===========================================
  // SPOOFING THREATS
  // ===========================================
  {
    id: 'threat-identity-spoofing',
    name: 'Identity Spoofing',
    description: 'An attacker could impersonate a legitimate user or system to gain unauthorized access',
    strideCategory: 'spoofing',
    applicableTechCategories: ['auth', 'backend', 'networking'],
  },
  {
    id: 'threat-session-hijacking',
    name: 'Session Hijacking',
    description: 'An attacker could steal or forge session tokens to impersonate authenticated users',
    strideCategory: 'spoofing',
    applicableTechCategories: ['auth', 'backend', 'frontend'],
  },
  {
    id: 'threat-credential-theft',
    name: 'Credential Theft',
    description: 'Attackers could steal user credentials through phishing, keylogging, or credential stuffing',
    strideCategory: 'spoofing',
    applicableTechCategories: ['auth', 'backend'],
  },
  {
    id: 'threat-api-key-compromise',
    name: 'API Key Compromise',
    description: 'API keys could be exposed in code repositories, logs, or network traffic',
    strideCategory: 'spoofing',
    applicableTechCategories: ['backend', 'networking'],
  },
  {
    id: 'threat-certificate-spoofing',
    name: 'Certificate Spoofing',
    description: 'Man-in-the-middle attacks using forged or stolen certificates',
    strideCategory: 'spoofing',
    applicableTechCategories: ['networking', 'infrastructure'],
  },

  // ===========================================
  // TAMPERING THREATS
  // ===========================================
  {
    id: 'threat-sql-injection',
    name: 'SQL Injection',
    description: 'Attackers could inject malicious SQL to read, modify, or delete database records',
    strideCategory: 'tampering',
    applicableTechCategories: ['database', 'backend'],
  },
  {
    id: 'threat-data-tampering',
    name: 'Data Tampering',
    description: 'Unauthorized modification of data in transit or at rest',
    strideCategory: 'tampering',
    applicableTechCategories: ['database', 'storage', 'messaging'],
  },
  {
    id: 'threat-message-tampering',
    name: 'Message Tampering',
    description: 'Messages in queues or event streams could be modified by unauthorized parties',
    strideCategory: 'tampering',
    applicableTechCategories: ['messaging'],
  },
  {
    id: 'threat-config-tampering',
    name: 'Configuration Tampering',
    description: 'Unauthorized modification of application or infrastructure configuration',
    strideCategory: 'tampering',
    applicableTechCategories: ['infrastructure', 'compute'],
  },
  {
    id: 'threat-code-injection',
    name: 'Code Injection',
    description: 'Injection of malicious code through user inputs (XSS, command injection)',
    strideCategory: 'tampering',
    applicableTechCategories: ['backend', 'frontend'],
  },
  {
    id: 'threat-parameter-manipulation',
    name: 'Parameter Manipulation',
    description: 'Attackers could modify request parameters to bypass access controls',
    strideCategory: 'tampering',
    applicableTechCategories: ['backend', 'networking'],
  },

  // ===========================================
  // REPUDIATION THREATS
  // ===========================================
  {
    id: 'threat-action-repudiation',
    name: 'Repudiation of Actions',
    description: 'Users could deny having performed transactions or actions without proper audit trails',
    strideCategory: 'repudiation',
    applicableTechCategories: ['backend', 'database', 'monitoring'],
  },
  {
    id: 'threat-log-tampering',
    name: 'Log Tampering',
    description: 'Attackers could modify or delete logs to hide their activities',
    strideCategory: 'repudiation',
    applicableTechCategories: ['monitoring', 'storage'],
  },
  {
    id: 'threat-insufficient-logging',
    name: 'Insufficient Logging',
    description: 'Lack of comprehensive logging makes it impossible to trace malicious activities',
    strideCategory: 'repudiation',
    applicableTechCategories: ['backend', 'database', 'monitoring'],
  },

  // ===========================================
  // INFORMATION DISCLOSURE THREATS
  // ===========================================
  {
    id: 'threat-data-leak',
    name: 'Sensitive Data Exposure',
    description: 'Sensitive data could be exposed through insecure storage, transmission, or error messages',
    strideCategory: 'information_disclosure',
    applicableTechCategories: ['database', 'storage', 'backend'],
  },
  {
    id: 'threat-network-sniffing',
    name: 'Network Sniffing',
    description: 'Unencrypted network traffic could be intercepted to steal sensitive information',
    strideCategory: 'information_disclosure',
    applicableTechCategories: ['networking', 'messaging'],
  },
  {
    id: 'threat-error-disclosure',
    name: 'Information Disclosure via Errors',
    description: 'Detailed error messages could reveal system internals to attackers',
    strideCategory: 'information_disclosure',
    applicableTechCategories: ['backend', 'frontend'],
  },
  {
    id: 'threat-cache-poisoning',
    name: 'Cache Data Leakage',
    description: 'Sensitive data in caches could be accessed by unauthorized parties',
    strideCategory: 'information_disclosure',
    applicableTechCategories: ['cache'],
  },
  {
    id: 'threat-backup-exposure',
    name: 'Backup Data Exposure',
    description: 'Database backups or storage snapshots could be accessed without authorization',
    strideCategory: 'information_disclosure',
    applicableTechCategories: ['storage', 'database'],
  },
  {
    id: 'threat-metadata-leakage',
    name: 'Metadata Leakage',
    description: 'System metadata, headers, or debug information could reveal sensitive details',
    strideCategory: 'information_disclosure',
    applicableTechCategories: ['backend', 'networking'],
  },

  // ===========================================
  // DENIAL OF SERVICE THREATS
  // ===========================================
  {
    id: 'threat-ddos',
    name: 'DDoS Attack',
    description: 'Distributed denial of service attacks could overwhelm the system',
    strideCategory: 'denial_of_service',
    applicableTechCategories: ['networking', 'compute', 'backend'],
  },
  {
    id: 'threat-resource-exhaustion',
    name: 'Resource Exhaustion',
    description: 'Attackers could exhaust CPU, memory, disk, or network resources',
    strideCategory: 'denial_of_service',
    applicableTechCategories: ['compute', 'database', 'cache'],
  },
  {
    id: 'threat-queue-flooding',
    name: 'Message Queue Flooding',
    description: 'Flooding message queues with malicious messages to disrupt processing',
    strideCategory: 'denial_of_service',
    applicableTechCategories: ['messaging'],
  },
  {
    id: 'threat-database-dos',
    name: 'Database DoS',
    description: 'Complex queries or connection exhaustion could make databases unavailable',
    strideCategory: 'denial_of_service',
    applicableTechCategories: ['database'],
  },
  {
    id: 'threat-storage-exhaustion',
    name: 'Storage Exhaustion',
    description: 'Filling up storage capacity to prevent legitimate operations',
    strideCategory: 'denial_of_service',
    applicableTechCategories: ['storage', 'database'],
  },

  // ===========================================
  // ELEVATION OF PRIVILEGE THREATS
  // ===========================================
  {
    id: 'threat-privilege-escalation',
    name: 'Privilege Escalation',
    description: 'Attackers could gain higher privileges than authorized through vulnerabilities',
    strideCategory: 'elevation_of_privilege',
    applicableTechCategories: ['auth', 'backend', 'compute'],
  },
  {
    id: 'threat-broken-access-control',
    name: 'Broken Access Control',
    description: 'Bypassing authorization checks to access unauthorized resources',
    strideCategory: 'elevation_of_privilege',
    applicableTechCategories: ['backend', 'database', 'storage'],
  },
  {
    id: 'threat-insecure-deserialization',
    name: 'Insecure Deserialization',
    description: 'Exploiting deserialization vulnerabilities to execute arbitrary code',
    strideCategory: 'elevation_of_privilege',
    applicableTechCategories: ['backend', 'messaging'],
  },
  {
    id: 'threat-container-escape',
    name: 'Container Escape',
    description: 'Breaking out of container isolation to access the host system',
    strideCategory: 'elevation_of_privilege',
    applicableTechCategories: ['compute', 'infrastructure'],
  },
  {
    id: 'threat-iam-misconfiguration',
    name: 'IAM Misconfiguration',
    description: 'Overly permissive IAM policies could allow unauthorized access',
    strideCategory: 'elevation_of_privilege',
    applicableTechCategories: ['auth', 'infrastructure'],
  },
]

/**
 * Get threats applicable to a technology category
 */
export function getThreatsForCategory(category: TechnologyCategory): ThreatDefinition[] {
  return THREAT_DEFINITIONS.filter((threat) =>
    threat.applicableTechCategories.includes(category)
  )
}

/**
 * Get threats applicable to a specific technology
 */
export function getThreatsForTechnology(techId: string, category: TechnologyCategory): ThreatDefinition[] {
  return THREAT_DEFINITIONS.filter((threat) => {
    // Check if explicitly listed for this tech
    if (threat.applicableTechIds?.includes(techId)) return true
    // Check if applicable to this category
    return threat.applicableTechCategories.includes(category)
  })
}

/**
 * Get threats by STRIDE category
 */
export function getThreatsBySTRIDE(strideCategory: STRIDECategory): ThreatDefinition[] {
  return THREAT_DEFINITIONS.filter((threat) => threat.strideCategory === strideCategory)
}

/**
 * Get a threat definition by ID
 */
export function getThreatById(id: string): ThreatDefinition | undefined {
  return THREAT_DEFINITIONS.find((threat) => threat.id === id)
}

/**
 * Get suggested threats for a component based on its technology
 */
export function getSuggestedThreatsForComponent(
  techId: string | undefined,
  techCategory: TechnologyCategory | undefined
): ThreatDefinition[] {
  if (!techCategory) return []

  const threats = new Set<ThreatDefinition>()

  // Add threats for the technology category
  getThreatsForCategory(techCategory).forEach((t) => threats.add(t))

  // Add threats specific to the technology if provided
  if (techId) {
    getThreatsForTechnology(techId, techCategory).forEach((t) => threats.add(t))
  }

  return Array.from(threats)
}
