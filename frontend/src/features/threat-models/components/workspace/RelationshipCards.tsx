import { Server, FileText, Users, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { System, ThreatModel } from '@/types'

interface ConnectedPack {
  id: number
  name: string
  slug: string
  version: string
  packType: string
}

interface RelationshipCardsProps {
  connectedSystems: System[]
  connectedThreatModels: ThreatModel[]
  connectedPacks: ConnectedPack[]
  teamMemberCount?: number
  teamName?: string
  onManageSystems: () => void
  onManageThreatModels: () => void
  onManagePacks: () => void
  onManagePeople: () => void
}

export function RelationshipCards({
  connectedSystems,
  connectedThreatModels,
  connectedPacks,
  teamMemberCount = 0,
  teamName,
  onManageSystems,
  onManageThreatModels,
  onManagePacks,
  onManagePeople,
}: RelationshipCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Connected Systems */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            Connected Systems
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-1 flex-1">
            {connectedSystems.length > 0 ? (
              connectedSystems.slice(0, 4).map((system) => (
                <div key={system.id} className="text-sm truncate">
                  {system.name}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No systems connected
              </div>
            )}
            {connectedSystems.length > 4 && (
              <div className="text-xs text-muted-foreground">
                +{connectedSystems.length - 4} more
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-500"
            onClick={onManageSystems}
          >
            Manage
          </Button>
        </CardContent>
      </Card>

      {/* Connected Threat Models */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Connected Threat Models
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-1 flex-1">
            {connectedThreatModels.length > 0 ? (
              connectedThreatModels.slice(0, 4).map((model) => (
                <div key={model.id} className="text-sm truncate">
                  {model.name}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No models connected
              </div>
            )}
            {connectedThreatModels.length > 4 && (
              <div className="text-xs text-muted-foreground">
                +{connectedThreatModels.length - 4} more
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-500"
            onClick={onManageThreatModels}
          >
            Manage
          </Button>
        </CardContent>
      </Card>

      {/* Connected Packs */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Connected Packs
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-1 flex-1">
            {connectedPacks.length > 0 ? (
              <div className="text-sm">
                <span className="font-medium">{connectedPacks.length}</span> pack{connectedPacks.length !== 1 ? 's' : ''}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No packs connected
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-500"
            onClick={onManagePacks}
          >
            Manage
          </Button>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-1 flex-1">
            {teamMemberCount > 0 ? (
              <div className="text-sm">
                <span className="font-medium">{teamMemberCount}</span> member{teamMemberCount !== 1 ? 's' : ''}
                {teamName && (
                  <div className="text-xs text-muted-foreground mt-1">
                    in {teamName}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No team members yet
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-500"
            onClick={onManagePeople}
          >
            Manage
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
