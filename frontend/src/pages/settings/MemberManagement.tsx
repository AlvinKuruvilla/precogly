/**
 * Organization member management page.
 */

import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useOrganizationMembers } from '@/api/organizations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export function MemberManagement() {
  const { currentOrganization, isLoading: workspaceLoading } = useWorkspace()
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembers(
    currentOrganization?.id ?? 0
  )

  if (workspaceLoading || membersLoading) {
    return <div>Loading...</div>
  }

  if (!currentOrganization) {
    return <div>No organization selected.</div>
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-800',
    security_team: 'bg-blue-100 text-blue-800',
    champion: 'bg-green-100 text-green-800',
    viewer: 'bg-gray-100 text-gray-800',
  }

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    security_team: 'Security Team',
    champion: 'Champion',
    viewer: 'Viewer',
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.userEmail}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[member.role] ?? 'bg-gray-100'}>
                        {roleLabels[member.role] ?? member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.joinedAt)}
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
