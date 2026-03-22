import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCards, ThreatModelsTable } from '@/components/dashboard'
import { useDashboardStats, useThreatModels } from '@/api/threat-models'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { CreateThreatModelDialog } from '@/components/threat-models'

export function Dashboard() {
  const { currentTeam } = useWorkspace()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: threatModels, isLoading: modelsLoading } = useThreatModels(currentTeam?.id)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your threat models and compliance status.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Threat Model
        </Button>
      </div>

      {/* Stats Cards */}
      <StatsCards
        stats={stats ?? { total: 0 }}
        isLoading={statsLoading}
      />

      {/* Threat Models Table */}
      <Card>
        <CardHeader>
          <CardTitle>Threat Models</CardTitle>
        </CardHeader>
        <CardContent>
          <ThreatModelsTable
            threatModels={threatModels ?? []}
            isLoading={modelsLoading}
          />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateThreatModelDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}
