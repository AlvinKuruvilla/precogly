/**
 * Organization and Team types for user management.
 */

// Role types
export type OrganizationRole = 'admin' | 'security_team' | 'champion' | 'viewer'
export type TeamRole = 'lead' | 'member' | 'viewer'

// Organization
export interface Organization {
  id: number
  name: string
  domain: string
  plan: 'free' | 'pro' | 'enterprise'
  businessUnitLabel: string
  memberCount: number
  createdAt: string
  updatedAt: string
}

// Business Unit (flexible grouping layer)
export interface BusinessUnit {
  id: number
  organization: number
  name: string
  code: string
  description: string
  parent: number | null
  teamCount: number
  createdAt: string
  updatedAt: string
}

// Team
export interface Team {
  id: number
  organization: number
  businessUnit: number | null
  businessUnitName: string | null
  name: string
  code: string
  description: string
  memberCount: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// Team list item (lightweight)
export interface TeamListItem {
  id: number
  name: string
  code: string
  businessUnitName: string | null
  memberCount: number
  isDefault: boolean
}

// Memberships
export interface OrganizationMembership {
  id: number
  organization: number
  organizationName: string
  user: number
  userEmail: string
  role: OrganizationRole
  joinedAt: string
  createdAt: string
  updatedAt: string
}

export interface TeamMembership {
  id: number
  team: number
  teamName: string
  user: number
  userEmail: string
  userName: string
  role: TeamRole
  joinedAt: string
  createdAt: string
  updatedAt: string
}

// Team Invitation
export interface TeamInvitation {
  id: string
  team: number
  teamName: string
  organizationName: string
  email: string
  role: TeamRole
  token: string
  inviteUrl: string
  invitedBy: number | null
  invitedByEmail: string | null
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
  updatedAt: string
}

// Magic Link
export interface MagicLink {
  id: string
  threatModel: number
  threatModelName: string
  token: string
  url: string
  expiresAt: string
  accessedCount: number
  isRevoked: boolean
  createdAt: string
  updatedAt: string
}

// API response types
export interface InviteMemberResponse {
  status: 'added' | 'invited'
  membership?: TeamMembership
  invitation?: TeamInvitation
}

export interface JoinTeamResponse {
  joined: boolean
  membership: TeamMembership
}

export interface AcceptInvitationResponse {
  status: 'accepted'
  membership: TeamMembership
}

export interface InvitationDetailsResponse {
  invitation: TeamInvitation
  requiresSignup: boolean
}

export interface ThreatModelStats {
  components: {
    total: number
    processes: number
    datastores: number
    actors: number
    boundaries: number
  }
  threats: {
    total: number
    exposed: number
    mitigated: number
  }
  countermeasures: {
    total: number
    verified: number
    gaps: number
  }
  // Note: Backend returns snake_case but DRF converts to camelCase at API boundary
  progress: {
    assetsDefined: boolean
    componentsIdentified: boolean
    trustBoundariesIdentified: boolean
    dataFlowsDefined: boolean
    ownersAssigned: boolean
    threatsLinkedComponents: boolean
    threatsLinkedFlows: boolean
    countermeasuresAssigned: boolean
  }
}

export interface MagicLinkAccessResponse {
  threatModel: unknown // ThreatModel type from threat-models
  stats: ThreatModelStats
  readOnly: boolean
  expiresAt: string
  isAuthenticated: boolean
  savedToAccount: boolean
}

// Shared with Me - threat models shared via magic link
export interface SharedWithMe {
  id: number
  threatModelId: number
  threatModelName: string
  threatModelDescription: string
  threatModelStatus: string
  threatModelVersion: string
  organizationName: string
  sharedBy: {
    email: string
    name: string
  } | null
  shareUrl: string | null
  firstAccessedAt: string
  lastAccessedAt: string
  accessCount: number
}
