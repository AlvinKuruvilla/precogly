/**
 * Organization settings page.
 */

import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export function OrganizationSettings() {
  const { currentOrganization, isLoading } = useWorkspace()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!currentOrganization) {
    return <div>No organization selected.</div>
  }

  const planColors = {
    free: 'bg-gray-100 text-gray-800',
    pro: 'bg-blue-100 text-blue-800',
    enterprise: 'bg-purple-100 text-purple-800',
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Information about your current organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={currentOrganization.name}
              disabled
              className="max-w-md"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-domain">Domain</Label>
            <Input
              id="org-domain"
              value={currentOrganization.domain || 'Not set'}
              disabled
              className="max-w-md"
            />
          </div>

          <div className="space-y-2">
            <Label>Plan</Label>
            <div>
              <Badge className={planColors[currentOrganization.plan]}>
                {currentOrganization.plan.charAt(0).toUpperCase() +
                  currentOrganization.plan.slice(1)}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Business Unit Label</Label>
            <Input
              value={currentOrganization.businessUnitLabel}
              disabled
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              The label used for grouping teams (e.g., "Department", "Product Area").
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
