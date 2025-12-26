import { Server, FileText, Users, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { System, ThreatModel, Diagram } from '@/types'
import type { TeamMember } from '@/features/dfd-editor/types/threat-analysis'

interface RelationshipCardsProps {
  connectedSystems: System[]
  connectedThreatModels: ThreatModel[]
  people: TeamMember[]
  dfds: Diagram[]
  onManageSystems: () => void
  onManageThreatModels: () => void
  onManagePeople: () => void
  onManageDFDs: () => void
}

export function RelationshipCards({
  connectedSystems,
  connectedThreatModels,
  people,
  dfds,
  onManageSystems,
  onManageThreatModels,
  onManagePeople,
  onManageDFDs,
}: RelationshipCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
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

      {/* People */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            People
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-1 flex-1">
            {people.length > 0 ? (
              people.slice(0, 4).map((person) => (
                <div key={person.id} className="text-sm truncate">
                  {person.firstName} {person.lastName}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No people assigned
              </div>
            )}
            {people.length > 4 && (
              <div className="text-xs text-muted-foreground">
                +{people.length - 4} more
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

      {/* DFDs */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            DFDs
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-1 flex-1">
            {dfds.length > 0 ? (
              dfds.slice(0, 4).map((dfd) => (
                <div key={dfd.id} className="text-sm truncate">
                  {dfd.title}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No DFDs created
              </div>
            )}
            {dfds.length > 4 && (
              <div className="text-xs text-muted-foreground">
                +{dfds.length - 4} more
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-500"
            onClick={onManageDFDs}
          >
            Manage
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
