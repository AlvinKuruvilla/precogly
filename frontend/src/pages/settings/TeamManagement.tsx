/**
 * Team management page.
 */

import { useState } from 'react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useTeams, useTeamMembers, useInviteTeamMember, useRemoveTeamMember } from '@/api/organizations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserPlus, Trash2 } from 'lucide-react'
import type { TeamListItem, TeamRole } from '@/types/organization'

export function TeamManagement() {
  const { currentOrganization, isLoading: workspaceLoading } = useWorkspace()
  const { data: teams = [], isLoading: teamsLoading } = useTeams(currentOrganization?.id)

  const [selectedTeam, setSelectedTeam] = useState<TeamListItem | null>(null)

  if (workspaceLoading || teamsLoading) {
    return <div>Loading...</div>
  }

  if (!currentOrganization) {
    return <div>No organization selected.</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
          <CardDescription>
            Manage teams in {currentOrganization.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <p className="text-muted-foreground">No teams found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>{currentOrganization.businessUnitLabel}</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">
                      {team.name}
                      {team.isDefault && (
                        <Badge variant="outline" className="ml-2">
                          Default
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {team.businessUnitName ?? '-'}
                    </TableCell>
                    <TableCell>{team.memberCount}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTeam(team)}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Team Members Dialog */}
      {selectedTeam && (
        <TeamMembersDialog
          team={selectedTeam}
          open={!!selectedTeam}
          onOpenChange={(open) => !open && setSelectedTeam(null)}
        />
      )}
    </div>
  )
}

interface TeamMembersDialogProps {
  team: TeamListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

function TeamMembersDialog({ team, open, onOpenChange }: TeamMembersDialogProps) {
  const { data: members = [], isLoading } = useTeamMembers(team.id)
  const { mutate: inviteMember, isPending: isInviting } = useInviteTeamMember()
  const { mutate: removeMember, isPending: isRemoving } = useRemoveTeamMember()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('member')

  const roleColors: Record<string, string> = {
    lead: 'bg-purple-100 text-purple-800',
    member: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-800',
  }

  const handleInvite = () => {
    if (!inviteEmail) return
    inviteMember(
      { teamId: team.id, email: inviteEmail, role: inviteRole },
      {
        onSuccess: () => {
          setInviteEmail('')
          setInviteRole('member')
        },
      }
    )
  }

  const handleRemove = (userId: number) => {
    if (confirm('Are you sure you want to remove this member from the team?')) {
      removeMember({ teamId: team.id, userId })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Team: {team.name}</DialogTitle>
          <DialogDescription>
            Add or remove members from this team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invite form */}
          <div className="space-y-2">
            <Label>Invite Member</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as TeamRole)}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={isInviting || !inviteEmail}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              If the user doesn't have an account, they'll receive an invite link.
            </p>
          </div>

          {/* Members list */}
          <div className="space-y-2">
            <Label>Current Members</Label>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : members.length === 0 ? (
              <p className="text-muted-foreground text-sm">No members yet.</p>
            ) : (
              <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2"
                  >
                    <div>
                      <p className="font-medium text-sm">{member.userName}</p>
                      <p className="text-xs text-muted-foreground">{member.userEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={roleColors[member.role]}>
                        {member.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(member.user)}
                        disabled={isRemoving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
