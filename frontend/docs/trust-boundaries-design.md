# Trust Boundaries as First-Class Components - Design Document

## Overview

Trust boundaries are modeled as **first-class analyzable components** with their own threats and countermeasures. Data flows explicitly reference which boundary they cross, enabling rich threat analysis at both the boundary and flow level.

---

## Core Concept

```
┌─────────────────────────────────────────────────────────────┐
│                      TRUST BOUNDARY                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Type: WAF                                            │   │
│  │ Vendor: AWS WAF                                      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ THREATS (boundary-specific):                         │   │
│  │  • Rule misconfiguration                             │   │
│  │  • Bypass via malformed requests                     │   │
│  │  • Overly permissive rules                          │   │
│  │  • Missing logging                                   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ COUNTERMEASURES:                                     │   │
│  │  • Regular rule audits                               │   │
│  │  • Managed rule sets                                 │   │
│  │  • WAF logging enabled                               │   │
│  │  • Least-privilege rules                             │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ PROVIDES TO CROSSING FLOWS:                          │   │
│  │  • Input validation                                  │   │
│  │  • Rate limiting                                     │   │
│  │  • SQL injection protection                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

Data Flow: [Browser] ──────────────────────> [API Server]
                           │
                           └── crossesBoundaryId: "waf-1"
                               (inherits WAF's protections)
```

---

## Data Model

### Trust Boundary Types

```typescript
export type TrustBoundaryType =
  // Demarcation boundaries (zones)
  | 'zone_internet'
  | 'zone_dmz'
  | 'zone_internal'
  | 'zone_restricted'
  // Protective control boundaries
  | 'firewall'
  | 'waf'
  | 'api_gateway'
  | 'load_balancer'
  | 'reverse_proxy'
  | 'vpn_gateway'
  | 'ids_ips'
  | 'ddos_protection'
  | 'hsm'
  | 'bastion_host'

export const TRUST_BOUNDARY_CONFIG: Record<TrustBoundaryType, {
  label: string
  category: 'zone' | 'control'
  icon: string
  color: string
  description: string
}> = {
  // Zones
  zone_internet: {
    label: 'Internet/Public Zone',
    category: 'zone',
    icon: 'globe',
    color: '#ef4444',
    description: 'Untrusted external network',
  },
  zone_dmz: {
    label: 'DMZ',
    category: 'zone',
    icon: 'shield-half',
    color: '#f97316',
    description: 'Demilitarized zone between external and internal networks',
  },
  zone_internal: {
    label: 'Internal Network',
    category: 'zone',
    icon: 'building',
    color: '#22c55e',
    description: 'Trusted internal network',
  },
  zone_restricted: {
    label: 'Restricted Zone',
    category: 'zone',
    icon: 'lock',
    color: '#8b5cf6',
    description: 'Highly restricted, sensitive systems',
  },
  // Controls
  firewall: {
    label: 'Firewall',
    category: 'control',
    icon: 'flame',
    color: '#3b82f6',
    description: 'Network firewall controlling traffic between zones',
  },
  waf: {
    label: 'Web Application Firewall',
    category: 'control',
    icon: 'shield-check',
    color: '#3b82f6',
    description: 'Application-layer firewall protecting web applications',
  },
  api_gateway: {
    label: 'API Gateway',
    category: 'control',
    icon: 'door-open',
    color: '#3b82f6',
    description: 'API management and security gateway',
  },
  load_balancer: {
    label: 'Load Balancer',
    category: 'control',
    icon: 'scale',
    color: '#3b82f6',
    description: 'Traffic distribution with optional TLS termination',
  },
  reverse_proxy: {
    label: 'Reverse Proxy',
    category: 'control',
    icon: 'arrow-left-right',
    color: '#3b82f6',
    description: 'Reverse proxy server',
  },
  vpn_gateway: {
    label: 'VPN Gateway',
    category: 'control',
    icon: 'tunnel',
    color: '#3b82f6',
    description: 'VPN termination point',
  },
  ids_ips: {
    label: 'IDS/IPS',
    category: 'control',
    icon: 'eye',
    color: '#3b82f6',
    description: 'Intrusion Detection/Prevention System',
  },
  ddos_protection: {
    label: 'DDoS Protection',
    category: 'control',
    icon: 'shield',
    color: '#3b82f6',
    description: 'DDoS mitigation service',
  },
  hsm: {
    label: 'HSM',
    category: 'control',
    icon: 'key',
    color: '#3b82f6',
    description: 'Hardware Security Module',
  },
  bastion_host: {
    label: 'Bastion Host',
    category: 'control',
    icon: 'terminal',
    color: '#3b82f6',
    description: 'Secure jump server for administrative access',
  },
}
```

### Updated TrustBoundaryNodeData

```typescript
export interface TrustBoundaryNodeData extends BaseNodeData {
  // Core properties
  boundaryType: TrustBoundaryType

  // For zones: trust level (kept for backward compatibility)
  trustLevel?: TrustLevel

  // For controls: additional metadata
  vendor?: string           // e.g., "AWS WAF", "Cloudflare", "Palo Alto"
  version?: string          // e.g., "v2.1"
  configurationNotes?: string

  // Visual
  isCollapsed?: boolean     // For zone boundaries that can collapse
}
```

### Updated DataFlowEdgeData

```typescript
export interface DataFlowEdgeData {
  label?: string
  protocol?: Protocol
  dataClassification?: DataClassification[]
  encrypted?: boolean
  authenticated?: boolean

  // NEW: Boundary crossing
  crossesBoundaryId?: string        // ID of the boundary this flow crosses
  crossesBoundaryIds?: string[]     // For flows crossing multiple boundaries

  isNewlyInserted?: boolean
  [key: string]: unknown
}
```

---

## Trust Boundary Threats

### Threat Registry Addition

```typescript
// New threat definitions for trust boundaries
export const TRUST_BOUNDARY_THREATS: ThreatDefinition[] = [
  // ===========================================
  // FIREWALL THREATS
  // ===========================================
  {
    id: 'threat-tb-firewall-misconfig',
    name: 'Firewall Rule Misconfiguration',
    description: 'Incorrectly configured firewall rules may allow unauthorized traffic or block legitimate traffic',
    strideCategory: 'tampering',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['firewall'],
  },
  {
    id: 'threat-tb-firewall-bypass',
    name: 'Firewall Bypass',
    description: 'Attackers may find ways to bypass firewall rules through protocol tunneling or rule gaps',
    strideCategory: 'elevation_of_privilege',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['firewall'],
  },
  {
    id: 'threat-tb-overly-permissive',
    name: 'Overly Permissive Rules',
    description: 'Rules allowing more traffic than necessary increase attack surface',
    strideCategory: 'elevation_of_privilege',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['firewall', 'waf', 'api_gateway'],
  },
  {
    id: 'threat-tb-default-creds',
    name: 'Default Credentials',
    description: 'Security control using default or weak administrative credentials',
    strideCategory: 'spoofing',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['firewall', 'waf', 'api_gateway', 'load_balancer', 'bastion_host'],
  },
  {
    id: 'threat-tb-unpatched',
    name: 'Unpatched Security Control',
    description: 'Security control running outdated firmware/software with known vulnerabilities',
    strideCategory: 'elevation_of_privilege',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['firewall', 'waf', 'api_gateway', 'load_balancer', 'ids_ips'],
  },
  {
    id: 'threat-tb-missing-logging',
    name: 'Insufficient Boundary Logging',
    description: 'Security control not logging traffic or events, hindering incident detection and forensics',
    strideCategory: 'repudiation',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['firewall', 'waf', 'api_gateway', 'load_balancer', 'ids_ips'],
  },

  // ===========================================
  // WAF THREATS
  // ===========================================
  {
    id: 'threat-tb-waf-bypass',
    name: 'WAF Rule Bypass',
    description: 'Attackers may craft malformed requests that bypass WAF detection rules',
    strideCategory: 'tampering',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['waf'],
  },
  {
    id: 'threat-tb-waf-false-negative',
    name: 'WAF False Negatives',
    description: 'WAF rules may fail to detect certain attack patterns, especially zero-day attacks',
    strideCategory: 'tampering',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['waf'],
  },
  {
    id: 'threat-tb-waf-dos',
    name: 'WAF Resource Exhaustion',
    description: 'Complex rule processing may be exploited to cause WAF performance degradation',
    strideCategory: 'denial_of_service',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['waf'],
  },

  // ===========================================
  // API GATEWAY THREATS
  // ===========================================
  {
    id: 'threat-tb-apigw-auth-bypass',
    name: 'API Gateway Auth Bypass',
    description: 'Authentication enforcement may be bypassed through header manipulation or endpoint misconfiguration',
    strideCategory: 'spoofing',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['api_gateway'],
  },
  {
    id: 'threat-tb-apigw-rate-limit-bypass',
    name: 'Rate Limit Bypass',
    description: 'Rate limiting may be bypassed through IP rotation, header spoofing, or distributed requests',
    strideCategory: 'denial_of_service',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['api_gateway'],
  },
  {
    id: 'threat-tb-apigw-key-leakage',
    name: 'API Key Leakage',
    description: 'API keys may be exposed in logs, error messages, or responses',
    strideCategory: 'information_disclosure',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['api_gateway'],
  },

  // ===========================================
  // LOAD BALANCER THREATS
  // ===========================================
  {
    id: 'threat-tb-lb-tls-misconfig',
    name: 'TLS Misconfiguration',
    description: 'Load balancer may be configured with weak cipher suites or outdated TLS versions',
    strideCategory: 'information_disclosure',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['load_balancer', 'reverse_proxy'],
  },
  {
    id: 'threat-tb-lb-health-exposure',
    name: 'Health Check Endpoint Exposure',
    description: 'Health check endpoints may leak internal information or be accessible externally',
    strideCategory: 'information_disclosure',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['load_balancer', 'api_gateway'],
  },
  {
    id: 'threat-tb-lb-session-hijack',
    name: 'Session Affinity Exploitation',
    description: 'Session stickiness implementation may be exploited to target specific backend servers',
    strideCategory: 'spoofing',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['load_balancer'],
  },

  // ===========================================
  // VPN GATEWAY THREATS
  // ===========================================
  {
    id: 'threat-tb-vpn-weak-auth',
    name: 'Weak VPN Authentication',
    description: 'VPN may use weak authentication methods or be vulnerable to credential attacks',
    strideCategory: 'spoofing',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['vpn_gateway'],
  },
  {
    id: 'threat-tb-vpn-split-tunnel',
    name: 'Split Tunneling Risk',
    description: 'Split tunneling configuration may allow traffic to bypass security controls',
    strideCategory: 'elevation_of_privilege',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['vpn_gateway'],
  },

  // ===========================================
  // IDS/IPS THREATS
  // ===========================================
  {
    id: 'threat-tb-ids-evasion',
    name: 'IDS/IPS Evasion',
    description: 'Attackers may use fragmentation, encoding, or timing attacks to evade detection',
    strideCategory: 'tampering',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['ids_ips'],
  },
  {
    id: 'threat-tb-ids-alert-fatigue',
    name: 'Alert Fatigue',
    description: 'High volume of false positives may cause real alerts to be ignored',
    strideCategory: 'repudiation',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['ids_ips'],
  },

  // ===========================================
  // BASTION HOST THREATS
  // ===========================================
  {
    id: 'threat-tb-bastion-compromise',
    name: 'Bastion Host Compromise',
    description: 'Compromised bastion host provides attacker access to internal network',
    strideCategory: 'elevation_of_privilege',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['bastion_host'],
  },
  {
    id: 'threat-tb-bastion-audit',
    name: 'Insufficient Session Auditing',
    description: 'Administrative sessions through bastion may not be properly logged or recorded',
    strideCategory: 'repudiation',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['bastion_host'],
  },

  // ===========================================
  // ZONE BOUNDARY THREATS (for demarcation zones)
  // ===========================================
  {
    id: 'threat-tb-zone-undefined',
    name: 'Undefined Trust Boundary',
    description: 'Unclear or undocumented trust boundaries lead to security gaps',
    strideCategory: 'elevation_of_privilege',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['zone_internet', 'zone_dmz', 'zone_internal', 'zone_restricted'],
  },
  {
    id: 'threat-tb-zone-lateral',
    name: 'Lateral Movement Risk',
    description: 'Once inside a zone, attackers may move freely without additional controls',
    strideCategory: 'elevation_of_privilege',
    applicableElementTypes: ['trustBoundary'],
    applicableBoundaryTypes: ['zone_dmz', 'zone_internal', 'zone_restricted'],
  },
]
```

### Updated ThreatDefinition Interface

```typescript
export interface ThreatDefinition {
  id: string
  name: string
  description: string
  strideCategory: STRIDECategory
  applicableElementTypes?: ThreatElementType[]  // Now includes 'trustBoundary'
  applicableTechCategories: TechnologyCategory[]
  applicableTechIds?: string[]
  dataFlowConditions?: DataFlowConditions

  // NEW: For trust boundary threats
  applicableBoundaryTypes?: TrustBoundaryType[]
}

// Update ThreatElementType
export type ThreatElementType = 'component' | 'dataflow' | 'trustBoundary'
```

---

## Trust Boundary Countermeasures

### Countermeasure Registry Addition

```typescript
export const TRUST_BOUNDARY_COUNTERMEASURES: CountermeasureDefinition[] = [
  // ===========================================
  // FIREWALL COUNTERMEASURES
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
  // WAF COUNTERMEASURES
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
  // API GATEWAY COUNTERMEASURES
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
  // TLS/LOAD BALANCER COUNTERMEASURES
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
  // VPN COUNTERMEASURES
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
  // IDS/IPS COUNTERMEASURES
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
  // BASTION HOST COUNTERMEASURES
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
  // ZONE COUNTERMEASURES
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
```

---

## Protections Provided to Crossing Flows

When a data flow crosses a protective control boundary, certain countermeasures are automatically provided:

```typescript
export const BOUNDARY_PROVIDED_COUNTERMEASURES: Record<TrustBoundaryType, string[]> = {
  // Zones don't provide countermeasures (they're just demarcations)
  zone_internet: [],
  zone_dmz: [],
  zone_internal: [],
  zone_restricted: [],

  // Protective controls provide countermeasures to flows crossing them
  firewall: [
    'cm-df-rate-limiting',
    'cm-df-source-validation',
    'cm-infrastructure-security',
  ],
  waf: [
    'cm-df-secure-headers',
    'cm-df-input-encoding',
    'cm-df-cors-policy',
    'cm-input-validation',
    'cm-df-rate-limiting',
  ],
  api_gateway: [
    'cm-df-api-authentication',
    'cm-df-rate-limiting',
    'cm-df-cors-policy',
    'cm-authorization-controls',
  ],
  load_balancer: [
    'cm-df-tls',
    'cm-ddos-protection',
  ],
  reverse_proxy: [
    'cm-df-tls',
    'cm-df-secure-headers',
  ],
  vpn_gateway: [
    'cm-df-tls',
    'cm-df-mutual-tls',
  ],
  ids_ips: [
    'cm-security-monitoring',
  ],
  ddos_protection: [
    'cm-ddos-protection',
    'cm-df-rate-limiting',
  ],
  hsm: [
    'cm-encryption-at-rest',
    'cm-api-key-management',
  ],
  bastion_host: [
    'cm-security-logging',
  ],
}
```

---

## Threat Analysis Flow

### 1. Component Threats (existing)
- Process nodes: Technology-based threats
- Datastore nodes: Technology-based threats
- **Trust boundary nodes: Boundary-type-based threats** (NEW)

### 2. Data Flow Threats (existing + enhanced)
- Protocol-specific threats (existing)
- Encryption/auth-based threats (existing)
- **Boundary crossing context** (NEW):
  - If flow has `crossesBoundaryId`, look up that boundary
  - Apply provided countermeasures from the boundary
  - Mark those countermeasures as "Platform (provided by {boundary.label})"

### 3. Initialization Logic Update

```typescript
function initializeThreatsForDiagram(
  diagramId: string,
  nodes: DiagramNode[],
  edges: DataFlowEdge[]
): ComponentThreat[] {
  const componentThreats: ComponentThreat[] = []

  // 1. Process nodes (existing)
  // ... existing logic for process/datastore nodes ...

  // 2. Trust boundary nodes (NEW)
  const boundaryNodes = nodes.filter(n => n.type === 'trustBoundary')
  boundaryNodes.forEach((node) => {
    const boundaryData = node.data as TrustBoundaryNodeData
    const boundaryThreats = getThreatsForBoundaryType(boundaryData.boundaryType)

    boundaryThreats.forEach((threatDef) => {
      // Create threat with countermeasures
      // ... similar to existing logic ...
    })
  })

  // 3. Data flows (existing + enhanced)
  edges.forEach((edge) => {
    const edgeData = edge.data || {}
    const dataFlowThreats = getThreatsForDataFlowByProperties({
      protocol: edgeData.protocol,
      encrypted: edgeData.encrypted,
      authenticated: edgeData.authenticated,
    })

    // NEW: If flow crosses a boundary, get provided countermeasures
    let providedCountermeasureIds: string[] = []
    if (edgeData.crossesBoundaryId) {
      const boundary = nodes.find(n => n.id === edgeData.crossesBoundaryId)
      if (boundary && boundary.type === 'trustBoundary') {
        const boundaryData = boundary.data as TrustBoundaryNodeData
        providedCountermeasureIds = BOUNDARY_PROVIDED_COUNTERMEASURES[boundaryData.boundaryType] || []
      }
    }

    dataFlowThreats.forEach((threatDef) => {
      const countermeasureDefs = getCountermeasuresForThreat(threatDef.id)

      const countermeasures = countermeasureDefs.map((cmDef) => ({
        // ... existing fields ...
        // NEW: Check if this countermeasure is provided by the boundary
        status: cmDef.isPlatformLevel || providedCountermeasureIds.includes(cmDef.id)
          ? 'platform'
          : 'gap',
        providedBy: providedCountermeasureIds.includes(cmDef.id)
          ? { boundaryId: edgeData.crossesBoundaryId, boundaryType: boundaryData.boundaryType }
          : undefined,
      }))

      // ... rest of threat creation ...
    })
  })

  return componentThreats
}
```

---

## UI Changes

### 1. Node Palette Update
Add trust boundary section with both zones and controls:

```
ZONES
├── 🌐 Internet/Public
├── 🛡️ DMZ
├── 🏢 Internal
└── 🔒 Restricted

SECURITY CONTROLS
├── 🔥 Firewall
├── 🛡️ WAF
├── 🚪 API Gateway
├── ⚖️ Load Balancer
├── 🔐 VPN Gateway
├── 👁️ IDS/IPS
├── 🌊 DDoS Protection
├── 🔑 HSM
└── 💻 Bastion Host
```

### 2. Properties Panel for Trust Boundaries
When a trust boundary is selected:
- Boundary Type (dropdown)
- For controls: Vendor, Version, Configuration Notes
- List of threats applicable to this boundary type
- List of countermeasures provided to crossing flows

### 3. Data Flow Properties Panel
- Add "Crosses Boundary" dropdown
- Shows list of trust boundaries in the diagram
- Selected boundary affects countermeasure auto-application

### 4. Threat Analysis View
- Trust boundaries appear in the first column alongside components and data flows
- Selecting a boundary shows its specific threats and countermeasures
- For data flows: countermeasures provided by boundaries shown with badge "Provided by {WAF}"

### 5. Visual Representation
- Zones: Dashed rectangle containers (existing)
- Controls: Hexagonal or shield-shaped nodes with control-type icon
- Different colors for zones vs controls

---

## Implementation Phases

### Phase 1: Data Model & UI Foundation
- Add `TrustBoundaryType` enum with zones and controls
- Update `TrustBoundaryNodeData` with `boundaryType`
- Add `crossesBoundaryId` to `DataFlowEdgeData`
- Update properties panels
- New visual rendering for control boundaries

### Phase 2: Trust Boundary Threats
- Add `TRUST_BOUNDARY_THREATS` to threat registry
- Add `applicableBoundaryTypes` to `ThreatDefinition`
- Update `initializeThreatsForDiagram` to create boundary threats
- Update ComponentView to show trust boundaries in threat analysis

### Phase 3: Provided Countermeasures
- Add `BOUNDARY_PROVIDED_COUNTERMEASURES` mapping
- Update threat initialization to auto-apply provided countermeasures
- Show "Provided by {boundary}" badge in UI
- Lock provided countermeasures to 'platform' status

### Phase 4: Flow-Boundary Relationship UI
- Add boundary selector to data flow properties
- Visual indicator on flows showing which boundary they cross
- Auto-detect boundary crossing based on source/target zones (optional)

---

## Summary

This model treats trust boundaries as first-class citizens:

| Aspect | Description |
|--------|-------------|
| **Own Threats** | Misconfiguration, bypass, weak credentials, etc. |
| **Own Countermeasures** | Rule review, change management, hardening, etc. |
| **Provides to Flows** | Countermeasures inherited by data flows crossing the boundary |
| **Explicit Relationship** | Data flows reference which boundary they cross |

This accurately models that:
1. Security controls are themselves attack surfaces
2. Security controls provide protection to traffic flowing through them
3. Different control types have different threats and capabilities
