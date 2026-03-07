import { Link } from 'react-router-dom'
import { Plus, Share2, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ThreatModelsTable } from '@/components/dashboard'
import { useThreatModels } from '@/api/threat-models'
import { useSharedWithMe, useRemoveSharedWithMe } from '@/api/organizations'
import { useWorkspace } from '@/contexts/WorkspaceContext'

export function ThreatModels() {
  const { currentTeam } = useWorkspace()
  const { data: threatModels, isLoading } = useThreatModels(currentTeam?.id)
  const { data: sharedModels, isLoading: isLoadingShared } = useSharedWithMe()
  const removeSharedMutation = useRemoveSharedWithMe()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Threat Models</h1>
          <p className="text-muted-foreground">
            View and manage your threat models.
          </p>
        </div>
        <Link to="/threat-models/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Threat Model
          </Button>
        </Link>
      </div>

      {/* Threat Models Table */}
      <Card>
        <CardHeader>
          <CardTitle>My Threat Models</CardTitle>
        </CardHeader>
        <CardContent>
          <ThreatModelsTable
            threatModels={threatModels ?? []}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Shared with Me Section */}
      {!isLoadingShared && sharedModels && sharedModels.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Shared with Me</CardTitle>
            </div>
            <CardDescription>
              Threat models shared with you via magic links. You have read-only access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sharedModels.map((shared) => (
                <div
                  key={shared.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{shared.threatModelName}</h4>
                      <Badge variant="outline" className="text-xs">v{shared.threatModelVersion}</Badge>
                      <Badge variant="secondary" className="text-xs">{shared.threatModelStatus}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{shared.organizationName}</span>
                      {shared.sharedBy && (
                        <span>Shared by {shared.sharedBy.name}</span>
                      )}
                      <span>Last viewed {formatDate(shared.lastAccessedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {shared.shareUrl ? (
                      <Link to={shared.shareUrl}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Link expired
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeSharedMutation.mutate(shared.id)}
                      disabled={removeSharedMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
