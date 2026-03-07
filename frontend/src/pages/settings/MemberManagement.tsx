/**
 * Organization member management page with invite, role change, and removal.
 */

import { useState } from 'react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  useOrganizationMembers,
  useAddOrgMember,
  useRemoveOrgMember,
  useUpdateOrgMemberRole,
} from '@/api/organizations'
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
import { UserPlus, Trash2, Loader2 } from 'lucide-react'
import type { OrganizationRole } from '@/types/organization'

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  security_team: 'Security Team',
  champion: 'Champion',
  viewer: 'Viewer',
}

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  security_team: 'bg-blue-100 text-blue-800',
  champion: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
}

export function MemberManagement() {
  const { currentOrganization, isLoading: workspaceLoading } = useWorkspace()
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembers(
    currentOrganization?.id ?? 0
  )
  const addMemberMutation = useAddOrgMember()
  const removeMemberMutation = useRemoveOrgMember()
  const updateRoleMutation = useUpdateOrgMemberRole()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('viewer')
  const [inviteError, setInviteError] = useState('')

  if (workspaceLoading || membersLoading) {
    return <div>Loading...</div>
  }

  if (!currentOrganization) {
    return <div>No organization selected.</div>
  }

  const handleInvite = () => {
    if (!inviteEmail) return
    setInviteError('')

    // The backend add-member endpoint requires a user ID.
    // For now, show a message directing to team-level invites for new users.
    addMemberMutation.mutate(
      { orgId: currentOrganization.id, userId: 0, role: inviteRole },
      {
        onError: () => {
          setInviteError(
            'Could not add member. Use team invitations to invite users by email.'
          )
        },
      }
    )
  }

  const handleRemove = (userId: number) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    removeMemberMutation.mutate({
      orgId: currentOrganization.id,
      userId,
    })
  }

  const handleRoleChange = (membershipId: number, newRole: string) => {
    updateRoleMutation.mutate({ membershipId, role: newRole })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Invite Section */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Member</CardTitle>
          <CardDescription>
            Add members to {currentOrganization.name}. Use team-level invitations to invite new users by email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-lg">
            <Input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Select
              value={inviteRole}
              onValueChange={(value) => setInviteRole(value as OrganizationRole)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="security_team">Security Team</SelectItem>
                <SelectItem value="champion">Champion</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={addMemberMutation.isPending || !inviteEmail}>
              {addMemberMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </Button>
          </div>
          {inviteError && (
            <p className="text-xs text-destructive mt-2">{inviteError}</p>
          )}
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>
            Members of {currentOrganization.name} and their roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground">No members found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.userEmail}</TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member.id, value)}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-36">
                          <Badge className={roleColors[member.role] ?? 'bg-gray-100'}>
                            {roleLabels[member.role] ?? member.role}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="security_team">Security Team</SelectItem>
                          <SelectItem value="champion">Champion</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.joinedAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(member.user)}
                        disabled={removeMemberMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
