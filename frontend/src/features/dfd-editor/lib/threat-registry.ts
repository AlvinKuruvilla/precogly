import type { TechnologyCategory } from './technology-registry'
import type { Protocol } from '../types/diagram'

/**
 * Element types that threats can apply to
 */
export type ThreatElementType = 'component' | 'dataflow'

/**
 * Data flow conditions for threat applicability
 */
export interface DataFlowConditions {
  // Protocols this threat applies to (if empty/undefined, applies to all)
  protocols?: Protocol[]
  // If true, threat only applies when data flow is NOT encrypted
  requiresUnencrypted?: boolean
  // If true, threat only applies when data flow is NOT authenticated
  requiresUnauthenticated?: boolean
}

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
  // Element types this threat applies to (component, dataflow, or both)
  // Defaults to ['component'] if not specified
  applicableElementTypes?: ThreatElementType[]
  // Technology categories this threat applies to (for components)
  applicableTechCategories: TechnologyCategory[]
  // Specific technology IDs this threat is especially relevant for (optional)
  applicableTechIds?: string[]
  // Conditions for data flow threats (protocol, encryption, authentication)
  dataFlowConditions?: DataFlowConditions
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

  // ===========================================
  // DATA FLOW THREATS - GENERIC (All protocols)
  // ===========================================
  {
    id: 'threat-df-dos',
    name: 'Data Flow Denial of Service',
    description: 'An attacker could flood the data channel to disrupt communication between components',
    strideCategory: 'denial_of_service',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
  },
  {
    id: 'threat-df-traffic-analysis',
    name: 'Traffic Analysis',
    description: 'Traffic patterns could reveal sensitive information about system behavior even if data is encrypted',
    strideCategory: 'information_disclosure',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
  },
  {
    id: 'threat-df-replay',
    name: 'Replay Attack',
    description: 'An attacker could capture and replay valid data transmissions to perform unauthorized actions',
    strideCategory: 'spoofing',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
  },

  // ===========================================
  // DATA FLOW THREATS - UNENCRYPTED PROTOCOLS
  // ===========================================
  {
    id: 'threat-df-plaintext-credentials',
    name: 'Plaintext Credential Interception',
    description: 'Credentials transmitted in cleartext can be intercepted by network attackers using packet sniffing',
    strideCategory: 'information_disclosure',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      requiresUnencrypted: true,
    },
  },
  {
    id: 'threat-df-session-hijacking',
    name: 'Session Token Theft',
    description: 'Session tokens sent over unencrypted connections can be stolen and used to impersonate users',
    strideCategory: 'spoofing',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      requiresUnencrypted: true,
    },
  },
  {
    id: 'threat-df-eavesdropping',
    name: 'Data Eavesdropping',
    description: 'Sensitive data transmitted without encryption can be intercepted and read by attackers',
    strideCategory: 'information_disclosure',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      requiresUnencrypted: true,
    },
  },
  {
    id: 'threat-df-mitm',
    name: 'Man-in-the-Middle Attack',
    description: 'An attacker can intercept and modify data in transit when encryption is not used',
    strideCategory: 'tampering',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      requiresUnencrypted: true,
    },
  },

  // ===========================================
  // DATA FLOW THREATS - UNAUTHENTICATED FLOWS
  // ===========================================
  {
    id: 'threat-df-unauthorized-access',
    name: 'Unauthorized Data Access',
    description: 'Without authentication, any party can send or receive data on this channel',
    strideCategory: 'spoofing',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      requiresUnauthenticated: true,
    },
  },
  {
    id: 'threat-df-data-injection',
    name: 'Malicious Data Injection',
    description: 'Without authentication, attackers can inject malicious data into the communication channel',
    strideCategory: 'tampering',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      requiresUnauthenticated: true,
    },
  },

  // ===========================================
  // DATA FLOW THREATS - HTTP SPECIFIC
  // ===========================================
  {
    id: 'threat-df-http-header-injection',
    name: 'HTTP Header Injection',
    description: 'Attackers could inject malicious HTTP headers to manipulate requests or responses',
    strideCategory: 'tampering',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['HTTP', 'HTTPS'],
    },
  },
  {
    id: 'threat-df-cors-misconfiguration',
    name: 'CORS Misconfiguration Exploitation',
    description: 'Overly permissive CORS policies could allow malicious websites to access sensitive API data',
    strideCategory: 'information_disclosure',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['HTTP', 'HTTPS'],
    },
  },
  {
    id: 'threat-df-cookie-hijacking',
    name: 'Cookie Hijacking',
    description: 'Session cookies transmitted over HTTP can be stolen via network sniffing or XSS attacks',
    strideCategory: 'spoofing',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['HTTP'],
      requiresUnencrypted: true,
    },
  },
  {
    id: 'threat-df-http-response-splitting',
    name: 'HTTP Response Splitting',
    description: 'Attackers could inject CRLF characters to split HTTP responses and inject malicious content',
    strideCategory: 'tampering',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['HTTP', 'HTTPS'],
    },
  },

  // ===========================================
  // DATA FLOW THREATS - HTTPS/TLS SPECIFIC
  // ===========================================
  {
    id: 'threat-df-ssl-stripping',
    name: 'SSL Stripping Attack',
    description: 'Attacker downgrades HTTPS to HTTP to intercept traffic if HSTS is not properly configured',
    strideCategory: 'tampering',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['HTTPS'],
    },
  },
  {
    id: 'threat-df-cert-validation-bypass',
    name: 'Certificate Validation Bypass',
    description: 'Improper certificate validation could allow attackers to perform MITM attacks with fake certificates',
    strideCategory: 'spoofing',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['HTTPS', 'gRPC'],
    },
  },

  // ===========================================
  // DATA FLOW THREATS - WEBSOCKET SPECIFIC
  // ===========================================
  {
    id: 'threat-df-cswsh',
    name: 'Cross-Site WebSocket Hijacking',
    description: 'Malicious websites could establish WebSocket connections using victim credentials if origin validation is weak',
    strideCategory: 'spoofing',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['WebSocket'],
    },
  },
  {
    id: 'threat-df-websocket-injection',
    name: 'WebSocket Frame Injection',
    description: 'Attackers could inject malicious frames into WebSocket communications to manipulate application state',
    strideCategory: 'tampering',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['WebSocket'],
    },
  },

  // ===========================================
  // DATA FLOW THREATS - MESSAGE QUEUE SPECIFIC
  // ===========================================
  {
    id: 'threat-df-unauthorized-subscription',
    name: 'Unauthorized Topic Subscription',
    description: 'Attackers could subscribe to message topics to receive sensitive data intended for other consumers',
    strideCategory: 'information_disclosure',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['MQTT', 'AMQP'],
    },
  },
  {
    id: 'threat-df-message-poisoning',
    name: 'Message Queue Poisoning',
    description: 'Attackers could publish malicious messages to queues to disrupt consumers or trigger vulnerabilities',
    strideCategory: 'tampering',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['MQTT', 'AMQP'],
    },
  },
  {
    id: 'threat-df-message-replay',
    name: 'Message Replay Attack',
    description: 'Captured messages could be replayed to duplicate transactions or commands',
    strideCategory: 'spoofing',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['MQTT', 'AMQP'],
    },
  },

  // ===========================================
  // DATA FLOW THREATS - SQL SPECIFIC
  // ===========================================
  {
    id: 'threat-df-sql-connection-exposure',
    name: 'Database Connection String Exposure',
    description: 'Database credentials in connection strings could be intercepted if transmitted insecurely',
    strideCategory: 'information_disclosure',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['SQL'],
      requiresUnencrypted: true,
    },
  },
  {
    id: 'threat-df-sql-query-interception',
    name: 'SQL Query Interception',
    description: 'Unencrypted database queries could expose sensitive data and query patterns to network attackers',
    strideCategory: 'information_disclosure',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['SQL'],
      requiresUnencrypted: true,
    },
  },

  // ===========================================
  // DATA FLOW THREATS - gRPC SPECIFIC
  // ===========================================
  {
    id: 'threat-df-grpc-metadata-tampering',
    name: 'gRPC Metadata Tampering',
    description: 'Attackers could modify gRPC metadata headers to bypass authentication or authorization checks',
    strideCategory: 'tampering',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['gRPC'],
    },
  },
  {
    id: 'threat-df-grpc-reflection',
    name: 'gRPC Reflection Abuse',
    description: 'Enabled gRPC reflection could expose service definitions to attackers for reconnaissance',
    strideCategory: 'information_disclosure',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['gRPC'],
    },
  },

  // ===========================================
  // DATA FLOW THREATS - TCP/UDP SPECIFIC
  // ===========================================
  {
    id: 'threat-df-tcp-session-hijacking',
    name: 'TCP Session Hijacking',
    description: 'Attackers could predict TCP sequence numbers to hijack established connections',
    strideCategory: 'spoofing',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['TCP'],
    },
  },
  {
    id: 'threat-df-udp-spoofing',
    name: 'UDP Packet Spoofing',
    description: 'UDP lacks connection state, making it trivial to spoof source addresses for attacks',
    strideCategory: 'spoofing',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['UDP'],
    },
  },
  {
    id: 'threat-df-udp-amplification',
    name: 'UDP Amplification Attack',
    description: 'Attackers could abuse UDP services to amplify DDoS attacks against third parties',
    strideCategory: 'denial_of_service',
    applicableElementTypes: ['dataflow'],
    applicableTechCategories: [],
    dataFlowConditions: {
      protocols: ['UDP'],
    },
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

/**
 * Get threats applicable to data flows (all data flow threats)
 */
export function getThreatsForDataFlow(): ThreatDefinition[] {
  return THREAT_DEFINITIONS.filter((threat) =>
    threat.applicableElementTypes?.includes('dataflow')
  )
}

/**
 * Data flow properties for threat filtering
 */
export interface DataFlowProperties {
  protocol?: Protocol
  encrypted?: boolean
  authenticated?: boolean
}

/**
 * Get threats applicable to a specific data flow based on its properties
 */
export function getThreatsForDataFlowByProperties(
  properties: DataFlowProperties
): ThreatDefinition[] {
  const { protocol, encrypted, authenticated } = properties

  return THREAT_DEFINITIONS.filter((threat) => {
    // Must be a data flow threat
    if (!threat.applicableElementTypes?.includes('dataflow')) {
      return false
    }

    const conditions = threat.dataFlowConditions

    // If no conditions, threat applies to all data flows
    if (!conditions) {
      return true
    }

    // Check protocol condition
    if (conditions.protocols && conditions.protocols.length > 0) {
      // If threat specifies protocols, the data flow must use one of them
      if (!protocol || !conditions.protocols.includes(protocol)) {
        return false
      }
    }

    // Check encryption condition
    if (conditions.requiresUnencrypted === true) {
      // Threat only applies to unencrypted flows
      // If encrypted is true, this threat doesn't apply
      if (encrypted === true) {
        return false
      }
    }

    // Check authentication condition
    if (conditions.requiresUnauthenticated === true) {
      // Threat only applies to unauthenticated flows
      // If authenticated is true, this threat doesn't apply
      if (authenticated === true) {
        return false
      }
    }

    return true
  })
}

/**
 * Check if a threat applies to a specific element type
 */
export function isThreatApplicableToElementType(
  threat: ThreatDefinition,
  elementType: ThreatElementType
): boolean {
  // If applicableElementTypes is not specified, defaults to 'component' only
  const types = threat.applicableElementTypes || ['component']
  return types.includes(elementType)
}
