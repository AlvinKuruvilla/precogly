import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Plus,
  FileText,
  Calendar,
  Shield,
  ShieldAlert,
  Box,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  LayoutDashboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { ThreatModel, Diagram, System } from '@/types'

async function fetchThreatModel(id: string): Promise<ThreatModel> {
  const response = await fetch(`/api/threat-models/${id}`)
  if (!response.ok) throw new Error('Failed to fetch threat model')
  return response.json()
}

async function fetchDiagrams(threatModelId: string): Promise<Diagram[]> {
  const response = await fetch(`/api/threat-models/${threatModelId}/diagrams`)
  if (!response.ok) throw new Error('Failed to fetch diagrams')
  return response.json()
}

async function fetchSystems(): Promise<System[]> {
  const response = await fetch('/api/systems')
  if (!response.ok) throw new Error('Failed to fetch systems')
  return response.json()
}

async function createDiagram(threatModelId: string, title: string): Promise<Diagram> {
  const response = await fetch('/api/diagrams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      threatModelId,
      title,
      canvasData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    }),
  })
  if (!response.ok) throw new Error('Failed to create diagram')
  return response.json()
}

async function fetchThreatModels(): Promise<ThreatModel[]> {
  const response = await fetch('/api/threat-models')
  if (!response.ok) throw new Error('Failed to fetch threat models')
  return response.json()
}

const criticalityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
}

export function ThreatModelDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get current tab from URL or default to 'overview'
  const currentTab = searchParams.get('tab') || 'overview'

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value })
  }

  const {
    data: threatModel,
    isLoading: isLoadingModel,
    isError: isErrorModel,
  } = useQuery({
    queryKey: ['threat-model', id],
    queryFn: () => fetchThreatModel(id!),
    enabled: !!id,
  })

  const { data: diagrams, isLoading: isLoadingDiagrams } = useQuery({
    queryKey: ['diagrams', id],
    queryFn: () => fetchDiagrams(id!),
    enabled: !!id,
  })

  const { data: systems } = useQuery({
    queryKey: ['systems'],
    queryFn: fetchSystems,
  })

  const { data: allThreatModels } = useQuery({
    queryKey: ['threat-models'],
    queryFn: fetchThreatModels,
  })

  // Create diagram mutation
  const createDiagramMutation = useMutation({
    mutationFn: (title: string) => createDiagram(id!, title),
    onSuccess: (newDiagram) => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', id] })
      navigate(`/threat-models/${id}/diagrams/${newDiagram.id}`)
    },
  })

  const handleCreateDiagram = () => {
    const title = `Data Flow Diagram ${(diagrams?.length || 0) + 1}`
    createDiagramMutation.mutate(title)
  }

  // Get linked system names
  const linkedSystems = systems?.filter((s) =>
    threatModel?.systemIds?.includes(s.id)
  )

  // Get referenced model names
  const referencedModels = allThreatModels?.filter((m) =>
    threatModel?.referencedModelIds?.includes(m.id)
  )

  if (isLoadingModel) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isErrorModel || !threatModel) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Threat model not found</p>
        <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{threatModel.name}</h1>
              {threatModel.criticality && (
                <Badge
                  variant="outline"
                  className={criticalityColors[threatModel.criticality]}
                >
                  {threatModel.criticality}
                </Badge>
              )}
            </div>
            {threatModel.description && (
              <p className="text-muted-foreground mt-1 max-w-2xl">
                {threatModel.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created {new Date(threatModel.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {diagrams?.length || 0} diagram{diagrams?.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Threat Model
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Threat Model
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="diagrams" className="gap-2">
            <FileText className="h-4 w-4" />
            Diagrams
          </TabsTrigger>
          <TabsTrigger value="threats" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Threats & Countermeasures
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Frameworks */}
            {threatModel.frameworks && threatModel.frameworks.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Frameworks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {threatModel.frameworks.map((framework) => (
                      <Badge key={framework} variant="secondary">
                        {framework}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Linked Systems */}
            {linkedSystems && linkedSystems.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    Linked Systems
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {linkedSystems.map((system) => (
                      <div key={system.id} className="text-sm">
                        <div className="font-medium">{system.name}</div>
                        {system.description && (
                          <div className="text-muted-foreground text-xs">
                            {system.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Referenced Models */}
            {referencedModels && referencedModels.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Referenced Models
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {referencedModels.map((model) => (
                      <Link
                        key={model.id}
                        to={`/threat-models/${model.id}`}
                        className="block text-sm hover:underline"
                      >
                        {model.name}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Details</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline">{threatModel.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>
                    {new Date(threatModel.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>
                    {new Date(threatModel.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Diagrams Tab */}
        <TabsContent value="diagrams">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Data Flow Diagrams</h2>
              <Button size="sm" onClick={handleCreateDiagram} disabled={createDiagramMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                {createDiagramMutation.isPending ? 'Creating...' : 'New Diagram'}
              </Button>
            </div>

            {isLoadingDiagrams ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : diagrams && diagrams.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {diagrams.map((diagram) => (
                  <Link
                    key={diagram.id}
                    to={`/threat-models/${id}/diagrams/${diagram.id}`}
                  >
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{diagram.title}</CardTitle>
                        {diagram.description && (
                          <CardDescription>{diagram.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {diagram.canvasData?.nodes?.length || 0} nodes
                          </span>
                          <span>
                            {diagram.canvasData?.edges?.length || 0} connections
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Updated{' '}
                          {new Date(diagram.updatedAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-1">No diagrams yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a data flow diagram to start threat modeling
                  </p>
                  <Button size="sm" onClick={handleCreateDiagram} disabled={createDiagramMutation.isPending}>
                    <Plus className="h-4 w-4 mr-2" />
                    {createDiagramMutation.isPending ? 'Creating...' : 'Create First Diagram'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Threats & Countermeasures Tab */}
        <TabsContent value="threats">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Threats & Countermeasures</h2>
            </div>

            {isLoadingDiagrams ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : diagrams && diagrams.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {diagrams.map((diagram) => (
                  <Link
                    key={diagram.id}
                    to={`/threat-models/${id}/diagrams/${diagram.id}/threats`}
                  >
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-base">{diagram.title}</CardTitle>
                        </div>
                        {diagram.description && (
                          <CardDescription>{diagram.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {diagram.canvasData?.nodes?.filter(
                              (n: { type: string }) => n.type === 'process' || n.type === 'datastore'
                            ).length || 0} analyzable components
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Click to view threats and countermeasures
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <ShieldAlert className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-1">No diagrams to analyze</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a data flow diagram first, then you can identify threats and countermeasures
                  </p>
                  <Button size="sm" onClick={() => handleTabChange('diagrams')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Go to Diagrams
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
