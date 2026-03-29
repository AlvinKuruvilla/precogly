/**
 * Organization settings page — editable.
 */

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useUpdateOrganization } from '@/features/organization/api/organizations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Check } from 'lucide-react'

export function OrganizationSettings() {
  const { currentOrganization, isLoading, refresh, isSecurityTeam } = useWorkspace()
  const updateOrgMutation = useUpdateOrganization()

  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Sync form state when org loads
  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name)
      setDomain(currentOrganization.domain || '')
    }
  }, [currentOrganization])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!currentOrganization) {
    return <div>No organization selected.</div>
  }

  const hasChanges =
    name !== currentOrganization.name ||
    domain !== (currentOrganization.domain || '')

  const handleSave = () => {
    setSaveSuccess(false)
    updateOrgMutation.mutate(
      {
        id: currentOrganization.id,
        data: { name, domain },
      },
      {
        onSuccess: () => {
          setSaveSuccess(true)
          refresh()
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Update your organization settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-md"
              readOnly={!isSecurityTeam}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-domain">Domain</Label>
            <Input
              id="org-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              className="max-w-md"
              readOnly={!isSecurityTeam}
            />
          </div>

          {isSecurityTeam && (
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateOrgMutation.isPending}
            >
              {updateOrgMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
            {saveSuccess && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
