import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, ExternalLink, Copy, Check, Clock, Mail, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { System, ThreatModel, Diagram, Framework } from '@/types'
import {
  useTeamMembers,
  useInviteTeamMember,
  useRemoveTeamMember,
  useTeamInvitations,
  useRevokeInvitation,
} from '@/api/organizations'
import type { TeamRole, TeamInvitation } from '@/types/organization'

// ============================================
// Manage Connected Systems Modal
// ============================================

interface ManageSystemsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectedSystems: System[]
  availableSystems: System[]
  onAdd: (systemId: string) => void
  onRemove: (systemId: string) => void
}

export function ManageSystemsModal({
  open,
  onOpenChange,
  connectedSystems,
  availableSystems,
  onAdd,
  onRemove,
}: ManageSystemsModalProps) {
  const [search, setSearch] = useState('')

  const filteredAvailable = availableSystems.filter(
    (s) =>
      !connectedSystems.find((c) => c.id === s.id) &&
      s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Connected Systems</DialogTitle>
          <DialogDescription>
            Add or remove systems connected to this threat model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connected systems */}
          <div>
            <h4 className="text-sm font-medium mb-2">Connected Systems</h4>
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {connectedSystems.length > 0 ? (
                  connectedSystems.map((system) => (
                    <div
                      key={system.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div>
                        <div className="text-sm font-medium">{system.name}</div>
                        {system.owner && (
                          <div className="text-xs text-muted-foreground">
                            {system.owner}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(system.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No systems connected
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Add systems */}
          <div>
            <h4 className="text-sm font-medium mb-2">Add Systems</h4>
            <Input
              placeholder="Search systems..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {filteredAvailable.length > 0 ? (
                  filteredAvailable.map((system) => (
                    <div
                      key={system.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div>
                        <div className="text-sm font-medium">{system.name}</div>
                        {system.owner && (
                          <div className="text-xs text-muted-foreground">
                            {system.owner}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdd(system.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No available systems
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Manage Connected Threat Models Modal
// ============================================

interface ManageThreatModelsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectedModels: ThreatModel[]
  availableModels: ThreatModel[]
  currentModelId: string
  onAdd: (modelId: string) => void
  onRemove: (modelId: string) => void
}

export function ManageThreatModelsModal({
  open,
  onOpenChange,
  connectedModels,
  availableModels,
  currentModelId,
  onAdd,
  onRemove,
}: ManageThreatModelsModalProps) {
  const [search, setSearch] = useState('')

  const filteredAvailable = availableModels.filter(
    (m) =>
      m.id !== currentModelId &&
      !connectedModels.find((c) => c.id === m.id) &&
      m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Connected Threat Models</DialogTitle>
          <DialogDescription>
            Link related threat models to this one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connected models */}
          <div>
            <h4 className="text-sm font-medium mb-2">Connected Models</h4>
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {connectedModels.length > 0 ? (
                  connectedModels.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div className="text-sm font-medium">{model.name}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(model.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No models connected
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Add models */}
          <div>
            <h4 className="text-sm font-medium mb-2">Add Models</h4>
            <Input
              placeholder="Search threat models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {filteredAvailable.length > 0 ? (
                  filteredAvailable.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div className="text-sm font-medium">{model.name}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdd(model.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No available models
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Manage People Modal (Team-based)
// ============================================

interface ManagePeopleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: number
  teamName?: string
}

const ROLE_LABELS: Record<TeamRole, string> = {
  lead: 'Lead',
  member: 'Member',
  viewer: 'Viewer',
}

export function ManagePeopleModal({
  open,
  onOpenChange,
  teamId,
  teamName,
}: ManagePeopleModalProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('member')
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)
  const [lastInviteResult, setLastInviteResult] = useState<{ status: string; inviteUrl?: string; email?: string } | null>(null)
  const [copiedNewLink, setCopiedNewLink] = useState(false)

  // Only fetch when we have a valid teamId
  const hasValidTeam = teamId > 0

  // Fetch team members
  const { data: members = [], isLoading: membersLoading } = useTeamMembers(
    hasValidTeam ? teamId : 0
  )

  // Fetch pending invitations for this team
  const { data: allInvitations = [] } = useTeamInvitations()
  const pendingInvitations = hasValidTeam
    ? allInvitations.filter(
        (inv) => inv.team === teamId && inv.status === 'pending'
      )
    : []

  // Mutations
  const inviteMutation = useInviteTeamMember()
  const removeMutation = useRemoveTeamMember()
  const revokeInvitationMutation = useRevokeInvitation()

  const handleInvite = () => {
    if (!inviteEmail.trim() || !hasValidTeam) return
    setLastInviteResult(null)
    inviteMutation.mutate(
      { teamId, email: inviteEmail.trim(), role: inviteRole },
      {
        onSuccess: (data) => {
          const email = inviteEmail.trim()
          setInviteEmail('')
          if (data.status === 'invited' && data.invitation) {
            setLastInviteResult({ status: 'invited', inviteUrl: data.invitation.inviteUrl, email })
          } else {
            setLastInviteResult({ status: 'added', email })
          }
        },
      }
    )
  }

  const handleCopyNewInviteLink = () => {
    if (!lastInviteResult?.inviteUrl) return
    const fullUrl = `${window.location.origin}${lastInviteResult.inviteUrl}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedNewLink(true)
    setTimeout(() => setCopiedNewLink(false), 2000)
  }

  const handleRemove = (userId: number) => {
    if (confirm('Are you sure you want to remove this member from the team?')) {
      removeMutation.mutate({ teamId, userId })
    }
  }

  const handleCopyInviteLink = (invitation: TeamInvitation) => {
    const fullUrl = `${window.location.origin}${invitation.inviteUrl}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedInviteId(invitation.id)
    setTimeout(() => setCopiedInviteId(null), 2000)
  }

  const handleRevokeInvitation = (invitationId: string) => {
    if (confirm('Are you sure you want to revoke this invitation?')) {
      revokeInvitationMutation.mutate(invitationId)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Team Members</DialogTitle>
          <DialogDescription>
            {hasValidTeam
              ? `Add or remove members from ${teamName || 'this team'}. Invite people by email to collaborate on threat models.`
              : 'No team selected. Please select a team first.'}
          </DialogDescription>
        </DialogHeader>

        {!hasValidTeam ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>You need to select or create a team before managing members.</p>
            <p className="text-sm mt-2">
              Go to Settings &gt; Teams to create your first team.
            </p>
          </div>
        ) : (
        <div className="space-y-4 py-4">
          {/* Invite new member by email */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invite by Email
            </h4>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as TeamRole)}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as TeamRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      <div>
                        <div>{ROLE_LABELS[role]}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? 'Inviting...' : 'Invite'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              If they already have an account, they'll be added immediately. Otherwise,
              you'll get a link to share with them.
            </p>
            {lastInviteResult && (
              <div className="p-3 rounded-md bg-muted text-sm">
                {lastInviteResult.status === 'added' ? (
                  <p className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Member added to the team.
                  </p>
                ) : lastInviteResult.inviteUrl ? (
                  <div className="space-y-2">
                    <p>Invitation created for <span className="font-medium">{lastInviteResult.email}</span>. Share this link:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-background p-2 rounded border truncate">
                        {`${window.location.origin}${lastInviteResult.inviteUrl}`}
                      </code>
                      <Button variant="outline" size="sm" onClick={handleCopyNewInviteLink}>
                        {copiedNewLink ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Pending Invitations
              </h4>
              <ScrollArea className="max-h-[120px] border rounded-md">
                <div className="p-2 space-y-1">
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {invitation.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {ROLE_LABELS[invitation.role]}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Invitation expires {formatDate(invitation.expiresAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCopyInviteLink(invitation)}
                            >
                              {copiedInviteId === invitation.id ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            Copy invite link to share with this person. They can use it to join the team.
                          </TooltipContent>
                        </Tooltip>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          title="Revoke invitation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Current team members */}
          <div>
            <h4 className="text-sm font-medium mb-2">
              Current Members ({members.length})
            </h4>
            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-2 space-y-1">
                {membersLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading members...
                  </div>
                ) : members.length > 0 ? (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {member.userName || member.userEmail}
                        </div>
                        {member.userName && (
                          <div className="text-xs text-muted-foreground truncate">
                            {member.userEmail}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {ROLE_LABELS[member.role]}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(member.user)}
                          disabled={removeMutation.isPending}
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No team members yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Manage DFDs Modal
// ============================================

interface ManageDFDsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threatModelId: string
  dfds: Diagram[]
  onCreateDFD: () => void
  onDeleteDFD: (diagramId: string) => void
}

export function ManageDFDsModal({
  open,
  onOpenChange,
  threatModelId,
  dfds,
  onCreateDFD,
  onDeleteDFD,
}: ManageDFDsModalProps) {
  const navigate = useNavigate()

  const handleEditDFD = (diagramId: string) => {
    onOpenChange(false)
    navigate(`/threat-models/${threatModelId}/diagrams/${diagramId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage DFDs</DialogTitle>
          <DialogDescription>
            Create, edit, or delete data flow diagrams for this threat model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* DFD list */}
          <ScrollArea className="h-[300px] border rounded-md">
            <div className="p-2 space-y-1">
              {dfds.length > 0 ? (
                dfds.map((dfd) => (
                  <div
                    key={dfd.id}
                    className="flex items-center justify-between p-3 hover:bg-muted rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {dfd.name}
                        {dfd.isPrimary ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Primary
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500 ring-1 ring-inset ring-gray-500/10"
                            title="Components not synced to threat analysis"
                          >
                            Reference
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dfd.canvasData?.nodes?.length || 0} nodes &bull;{' '}
                        {dfd.canvasData?.edges?.length || 0} connections
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditDFD(dfd.id)}
                        title="Edit DFD"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditDFD(dfd.id)}
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDeleteDFD(dfd.id)}
                        title="Delete DFD"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No DFDs created yet
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Create new DFD */}
          <Button onClick={onCreateDFD} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Create New DFD
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Manage Compliance Frameworks Modal
// ============================================

interface ManageFrameworksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFrameworks: Array<{ id: number; name: string }>
  availableFrameworks: Framework[]
  onAdd: (frameworkId: number) => void
  onRemove: (frameworkId: number) => void
}

export function ManageFrameworksModal({
  open,
  onOpenChange,
  currentFrameworks,
  availableFrameworks,
  onAdd,
  onRemove,
}: ManageFrameworksModalProps) {
  const [search, setSearch] = useState('')

  const filteredAvailable = availableFrameworks.filter(
    (f) =>
      !currentFrameworks.find((c) => c.id === f.id) &&
      f.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Compliance Frameworks</DialogTitle>
          <DialogDescription>
            Add or remove compliance frameworks for this threat model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current frameworks */}
          <div>
            <h4 className="text-sm font-medium mb-2">Current Frameworks</h4>
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {currentFrameworks.length > 0 ? (
                  currentFrameworks.map((framework) => (
                    <div
                      key={framework.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div className="text-sm font-medium">{framework.name}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(framework.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No frameworks added
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Add frameworks */}
          <div>
            <h4 className="text-sm font-medium mb-2">Add Frameworks</h4>
            <Input
              placeholder="Search frameworks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <ScrollArea className="h-[150px] border rounded-md">
              <div className="p-2 space-y-1">
                {filteredAvailable.length > 0 ? (
                  filteredAvailable.map((framework) => (
                    <div
                      key={framework.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded"
                    >
                      <div>
                        <div className="text-sm font-medium">{framework.name}</div>
                        {framework.version && (
                          <div className="text-xs text-muted-foreground">
                            v{framework.version}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdd(framework.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No available frameworks
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
