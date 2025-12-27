import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThreatModelsTable } from '@/components/dashboard'
import { useThreatModels } from '@/api/threat-models'

export function ThreatModels() {
  const { data: threatModels, isLoading } = useThreatModels()

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
          <CardTitle>All Threat Models</CardTitle>
        </CardHeader>
        <CardContent>
          <ThreatModelsTable
            threatModels={threatModels ?? []}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
