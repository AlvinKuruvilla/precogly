/**
 * Organization member management page with role change and removal.
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  useOrganizationMembers,
  useRemoveOrgMember,
  useUpdateOrgMemberRole,
} from '@/features/organization/api/organizations'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, AlertCircle } from 'lucide-react'
import type { ApiError } from '@/lib/api'

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
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    membershipId: number
    userEmail: string
    currentRole: string
    newRole: string
    isLastSecurityTeam: boolean
  } | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<{
    userId: number
    userEmail: string
  } | null>(null)
  const removeMemberMutation = useRemoveOrgMember()
  const updateRoleMutation = useUpdateOrgMemberRole()

  const securityTeamCount = useMemo(
    () => members.filter((member) => member.role === 'security_team').length,
    [members]
  )

  if (workspaceLoading || membersLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
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
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentOrganization) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No organization selected</p>
            <p className="text-sm text-muted-foreground mt-1">
              Select an organization from the workspace switcher to manage its members.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleRemove = (userId: number, userEmail: string) => {
    setPendingRemoval({ userId, userEmail })
  }

  const confirmRemoval = () => {
    if (!pendingRemoval) return
    removeMemberMutation.mutate(
      {
        orgId: currentOrganization.id,
        userId: pendingRemoval.userId,
      },
      {
        onSuccess: () => {
          toast.success('Member removed successfully.')
        },
        onError: (error) => {
          const errData = (error as ApiError)?.data as Record<string, unknown> | undefined
          const message = (errData?.detail as string) || 'Failed to remove member.'
          toast.error(message)
        },
        onSettled: () => setPendingRemoval(null),
      }
    )
  }

  const handleRoleChange = (
    membershipId: number,
    userEmail: string,
    currentRole: string,
    newRole: string
  ) => {
    if (currentRole === newRole) return
    setPendingRoleChange({
      membershipId,
      userEmail,
      currentRole,
      newRole,
      isLastSecurityTeam:
        currentRole === 'security_team' &&
        newRole !== 'security_team' &&
        securityTeamCount <= 1,
    })
  }

  const confirmRoleChange = () => {
    if (!pendingRoleChange || pendingRoleChange.isLastSecurityTeam) return
    updateRoleMutation.mutate(
      {
        membershipId: pendingRoleChange.membershipId,
        role: pendingRoleChange.newRole,
      },
      {
        onSuccess: () => {
          toast.success('Member role updated successfully.')
        },
        onError: (error) => {
          const errData = (error as ApiError)?.data as Record<string, unknown> | undefined
          const message =
            (errData?.role as string[])?.[0] ||
            (errData?.detail as string) ||
            'Failed to update member role.'
          toast.error(message)
        },
        onSettled: () => setPendingRoleChange(null),
      }
    )
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
                          onValueChange={(value) =>
                            handleRoleChange(member.id, member.userEmail, member.role, value)
                          }
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            side="bottom"
                            align="start"
                            avoidCollisions={false}
                          >
                            <SelectItem value="security_team">
                              <Badge className={roleColors.security_team}>
                                Security Team
                              </Badge>
                            </SelectItem>
                            <SelectItem value="member">
                              <Badge className={roleColors.member}>
                                Member
                              </Badge>
                            </SelectItem>
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
                          onClick={() => handleRemove(member.user, member.userEmail)}
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

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {pendingRemoval?.userEmail} from {currentOrganization.name}. They
              will lose access to all teams and threat models in this organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoval} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingRoleChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRoleChange(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRoleChange?.isLastSecurityTeam
                ? 'Cannot change this role'
                : 'Change organization role?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRoleChange?.isLastSecurityTeam ? (
                <>
                  {pendingRoleChange.userEmail} is the only Security Team member in this
                  organization. At least one member must remain on the Security Team so
                  organization settings do not become locked.
                </>
              ) : pendingRoleChange ? (
                <>
                  This will change {pendingRoleChange.userEmail} from{' '}
                  {roleLabels[pendingRoleChange.currentRole] ?? pendingRoleChange.currentRole} to{' '}
                  {roleLabels[pendingRoleChange.newRole] ?? pendingRoleChange.newRole}. Security
                  Team members can manage organization settings, teams, members, and library
                  imports. Members keep standard organization access without those admin
                  permissions.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {pendingRoleChange?.isLastSecurityTeam ? 'Close' : 'Cancel'}
            </AlertDialogCancel>
            {!pendingRoleChange?.isLastSecurityTeam && (
              <AlertDialogAction onClick={confirmRoleChange}>
                Confirm change
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
