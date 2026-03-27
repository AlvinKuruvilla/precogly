/**
 * Organization member management page with role change and removal.
 */

import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  useOrganizationMembers,
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
import { Trash2 } from 'lucide-react'

const roleLabels: Record<string, string> = {
  security_team: 'Security Team',
  member: 'Member',
}

const roleColors: Record<string, string> = {
  security_team: 'bg-blue-100 text-blue-800',
  member: 'bg-gray-100 text-gray-800',
}

export function MemberManagement() {
  const { currentOrganization, isLoading: workspaceLoading, isSecurityTeam } = useWorkspace()
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembers(
    currentOrganization?.id ?? 0
  )
  const removeMemberMutation = useRemoveOrgMember()
  const updateRoleMutation = useUpdateOrgMemberRole()

  if (workspaceLoading || membersLoading) {
    return <div>Loading...</div>
  }

  if (!currentOrganization) {
    return <div>No organization selected.</div>
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
      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>
            Members of {currentOrganization.name} and their roles.
            To add organization-level members, use the Django admin panel.
            To invite team members, go to <a href="/settings/teams" className="underline text-foreground">Settings &gt; Teams</a> and manage the team directly.
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
                      {isSecurityTeam ? (
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
                            <SelectItem value="security_team">Security Team</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={roleColors[member.role] ?? 'bg-gray-100'}>
                          {roleLabels[member.role] ?? member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.joinedAt)}
                    </TableCell>
                    <TableCell>
                      {isSecurityTeam && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemove(member.user)}
                          disabled={removeMemberMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
