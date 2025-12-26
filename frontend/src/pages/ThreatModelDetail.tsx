import { useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Loader2, LayoutDashboard, Shield, ChevronDown, Settings, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ProgressChecklist,
  RelationshipCards,
  DFDCarousel,
  SummaryCards,
  SystemContextModal,
  ManageSystemsModal,
  ManageThreatModelsModal,
  ManagePeopleModal,
  ManageDFDsModal,
} from '@/components/workspace'
import { useWorkspaceThreatAnalysis } from '@/components/workspace/useWorkspaceThreatAnalysis'
import { ComponentView } from '@/features/dfd-editor/components/threat-analysis/ComponentView'
import { TableView } from '@/features/dfd-editor/components/threat-analysis/TableView'
import type { ThreatModel, Diagram, System } from '@/types'
import type { TeamMember, WorkspaceStatus } from '@/features/dfd-editor/types/threat-analysis'
import { WORKSPACE_STATUS_CONFIG, VERSION_TRIGGER_CONFIG } from '@/features/dfd-editor/types/threat-analysis'
import type { DiagramNode, DataFlowEdge, CanvasData } from '@/features/dfd-editor/types'
import { cn } from '@/lib/utils'

// Mock team members data (same as in ComponentView)
const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', firstName: 'Sarah', lastName: 'Chen', email: 'sarah.chen@company.com', role: 'Security Engineer' },
  { id: '2', firstName: 'Michael', lastName: 'Rodriguez', email: 'michael.rodriguez@company.com', role: 'DevOps Lead' },
  { id: '3', firstName: 'Emily', lastName: 'Johnson', email: 'emily.johnson@company.com', role: 'Platform Engineer' },
  { id: '4', firstName: 'David', lastName: 'Kim', email: 'david.kim@company.com', role: 'Security Architect' },
  { id: '5', firstName: 'Jessica', lastName: 'Williams', email: 'jessica.williams@company.com', role: 'SRE' },
  { id: '6', firstName: 'James', lastName: 'Brown', email: 'james.brown@company.com', role: 'Backend Engineer' },
  { id: '7', firstName: 'Amanda', lastName: 'Davis', email: 'amanda.davis@company.com', role: 'Infrastructure Lead' },
  { id: '8', firstName: 'Robert', lastName: 'Martinez', email: 'robert.martinez@company.com', role: 'Cloud Engineer' },
  { id: '9', firstName: 'Lisa', lastName: 'Anderson', email: 'lisa.anderson@company.com', role: 'Security Analyst' },
  { id: '10', firstName: 'Christopher', lastName: 'Taylor', email: 'christopher.taylor@company.com', role: 'Tech Lead' },
]

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

async function fetchThreatModels(): Promise<ThreatModel[]> {
  const response = await fetch('/api/threat-models')
  if (!response.ok) throw new Error('Failed to fetch threat models')
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

type ViewMode = 'component' | 'table'

export function ThreatModelDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('component')
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(null)
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null)

  // Modal state
  const [systemContextModalOpen, setSystemContextModalOpen] = useState(false)
  const [manageSystemsModalOpen, setManageSystemsModalOpen] = useState(false)
  const [manageThreatModelsModalOpen, setManageThreatModelsModalOpen] = useState(false)
  const [managePeopleModalOpen, setManagePeopleModalOpen] = useState(false)
  const [manageDFDsModalOpen, setManageDFDsModalOpen] = useState(false)


  // Data fetching
  const {
    data: threatModel,
    isLoading: isLoadingModel,
    isError: isErrorModel,
  } = useQuery({
    queryKey: ['threat-model', id],
    queryFn: () => fetchThreatModel(id!),
    enabled: !!id,
  })

  const { data: diagrams = [] } = useQuery({
    queryKey: ['diagrams', id],
    queryFn: () => fetchDiagrams(id!),
    enabled: !!id,
  })

  const { data: systems = [] } = useQuery({
    queryKey: ['systems'],
    queryFn: fetchSystems,
  })

  const { data: allThreatModels = [] } = useQuery({
    queryKey: ['threat-models'],
    queryFn: fetchThreatModels,
  })

  // Workspace threat analysis state
  const {
    componentThreats,
    status,
    currentVersion,
    previousVersions,
    systemContext,
    progressChecklist,
    summaries,
    updateCountermeasureStatus,
    assignOwner,
    dismissThreat,
    restoreThreat,
    addCountermeasure,
    removeCountermeasure,
    updateStatus,
    updateSystemContext,
    toggleChecklistItem,
  } = useWorkspaceThreatAnalysis(id!, diagrams)

  // Create diagram mutation
  const createDiagramMutation = useMutation({
    mutationFn: (title: string) => createDiagram(id!, title),
    onSuccess: (newDiagram) => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', id] })
      navigate(`/threat-models/${id}/diagrams/${newDiagram.id}`)
    },
  })

  // Get linked systems
  const linkedSystems = useMemo(() => {
    return systems.filter((s) => threatModel?.systemIds?.includes(s.id))
  }, [systems, threatModel?.systemIds])

  // Get referenced threat models
  const referencedModels = useMemo(() => {
    return allThreatModels.filter((m) =>
      threatModel?.referencedModelIds?.includes(m.id)
    )
  }, [allThreatModels, threatModel?.referencedModelIds])

  // Get assigned people (from countermeasure owners)
  const assignedPeople = useMemo(() => {
    const ownerEmails = new Set<string>()
    componentThreats.forEach((ct) => {
      ct.countermeasures.forEach((cm) => {
        if (cm.owner) ownerEmails.add(cm.owner)
      })
    })
    return TEAM_MEMBERS.filter((m) => ownerEmails.has(m.email))
  }, [componentThreats])

  // Aggregate canvas data from all diagrams or selected diagram
  const aggregatedCanvasData = useMemo((): CanvasData => {
    const diagramsToUse = selectedDiagramId
      ? diagrams.filter((d) => d.id === selectedDiagramId)
      : diagrams

    const nodes: DiagramNode[] = []
    const edges: DataFlowEdge[] = []

    diagramsToUse.forEach((diagram) => {
      if (diagram.canvasData) {
        nodes.push(...(diagram.canvasData.nodes || []))
        edges.push(...(diagram.canvasData.edges || []))
      }
    })

    return { nodes, edges }
  }, [diagrams, selectedDiagramId])

  // Filter component threats by selected diagram
  const filteredComponentThreats = useMemo(() => {
    if (!selectedDiagramId) return componentThreats
    return componentThreats.filter(
      (ct) => ct.sourceDiagramId === selectedDiagramId || ct.diagramId === selectedDiagramId
    )
  }, [componentThreats, selectedDiagramId])

  // Get analyzable components, trust boundaries, and data flows
  const analyzableComponents = useMemo(() => {
    return aggregatedCanvasData.nodes.filter(
      (node) => node.type === 'process' || node.type === 'datastore'
    )
  }, [aggregatedCanvasData.nodes])

  const trustBoundaries = useMemo(() => {
    return aggregatedCanvasData.nodes.filter((node) => node.type === 'trustBoundary')
  }, [aggregatedCanvasData.nodes])

  const dataFlows = useMemo(() => {
    return aggregatedCanvasData.edges
  }, [aggregatedCanvasData.edges])

  // Get selected component threat
  const selectedComponentThreat = useMemo(() => {
    if (!selectedThreatId) return null
    return filteredComponentThreats.find((ct) => ct.id === selectedThreatId) || null
  }, [filteredComponentThreats, selectedThreatId])

  // Handlers
  const handleStatusChange = (newStatus: WorkspaceStatus) => {
    updateStatus(newStatus)
  }

  const handleSubmitForReview = () => {
    updateStatus('in_review')
  }

  const handleCreateDFD = () => {
    const title = `Data Flow Diagram ${(diagrams?.length || 0) + 1}`
    createDiagramMutation.mutate(title)
  }

  const handleDeleteDFD = (diagramId: string) => {
    // TODO: Implement delete via API
    console.log('Delete DFD:', diagramId)
  }

  // Loading state
  if (isLoadingModel) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (isErrorModel || !threatModel) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Threat model not found</p>
        <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
      </div>
    )
  }

  const statusConfig = WORKSPACE_STATUS_CONFIG[status]
  const triggerConfig = VERSION_TRIGGER_CONFIG[currentVersion.trigger]

  return (
    <div className="flex flex-col h-[calc(100vh-44px)]">
      {/* Compact Header */}
      <div className="flex-shrink-0 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: Breadcrumb + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/threat-models"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              Threat Models
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="font-semibold truncate">{threatModel.name}</h1>
          </div>

          {/* Right: Status + Version + Actions */}
          <div className="flex items-center gap-3">
            {/* Version dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                  v{currentVersion.version}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs">
                  {triggerConfig.label} trigger
                </DropdownMenuItem>
                {previousVersions.length > 0 && (
                  <>
                    <DropdownMenuItem disabled className="text-xs font-medium mt-1">
                      Previous
                    </DropdownMenuItem>
                    {previousVersions.map((v) => (
                      <DropdownMenuItem key={v.version} className="text-xs">
                        v{v.version} - {VERSION_TRIGGER_CONFIG[v.trigger].label}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn('cursor-pointer text-xs', statusConfig.bgColor)}
                >
                  {statusConfig.label}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(WORKSPACE_STATUS_CONFIG) as WorkspaceStatus[]).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="text-xs"
                  >
                    <Badge
                      variant="outline"
                      className={cn('text-xs', WORKSPACE_STATUS_CONFIG[s].bgColor)}
                    >
                      {WORKSPACE_STATUS_CONFIG[s].label}
                    </Badge>
                    {s === status && <span className="ml-2 text-muted-foreground">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* System Context button */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setSystemContextModalOpen(true)}
            >
              <Settings className="h-3 w-3" />
              <span className="hidden sm:inline">System Context</span>
            </Button>

            {/* Submit button */}
            {status === 'draft' && (
              <Button
                size="sm"
                className="h-7 px-3 text-xs gap-1 bg-amber-500 hover:bg-amber-600"
                onClick={handleSubmitForReview}
              >
                <Send className="h-3 w-3" />
                <span className="hidden sm:inline">Submit for Review</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab-based Content */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <div className="border-b bg-muted/30 px-6">
          <TabsList className="h-12 bg-transparent p-0 gap-4">
            <TabsTrigger
              value="overview"
              className="h-12 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="threats"
              className="h-12 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
            >
              <Shield className="h-4 w-4" />
              Threat Analysis
              {summaries.threatSummary.exposed > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                  {summaries.threatSummary.exposed}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="flex-1 overflow-auto m-0 p-6 space-y-6">
          {/* Completion Status + Relationship Cards */}
          <div className="grid grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">Completion Status</h3>
              <ProgressChecklist
                items={progressChecklist}
                onToggle={toggleChecklistItem}
              />
            </div>
            <RelationshipCards
              connectedSystems={linkedSystems}
              connectedThreatModels={referencedModels}
              people={assignedPeople}
              dfds={diagrams}
              onManageSystems={() => setManageSystemsModalOpen(true)}
              onManageThreatModels={() => setManageThreatModelsModalOpen(true)}
              onManagePeople={() => setManagePeopleModalOpen(true)}
              onManageDFDs={() => setManageDFDsModalOpen(true)}
            />
          </div>

          {/* Summary Cards */}
          <SummaryCards
            components={summaries.componentSummary}
            threats={summaries.threatSummary}
            countermeasures={summaries.countermeasureSummary}
          />

          {/* DFD Carousel */}
          {diagrams.length > 0 ? (
            <DFDCarousel
              diagrams={diagrams}
              selectedDiagramId={selectedDiagramId}
              onSelectDiagram={setSelectedDiagramId}
              onEditDiagram={(diagramId) => navigate(`/threat-models/${id}/diagrams/${diagramId}`)}
              onCreateDiagram={handleCreateDFD}
              isCreating={createDiagramMutation.isPending}
            />
          ) : (
            <div className="border rounded-lg p-12 text-center">
              <p className="text-muted-foreground mb-4">
                No DFDs created yet. Create a data flow diagram to start threat modeling.
              </p>
              <Button onClick={handleCreateDFD} disabled={createDiagramMutation.isPending}>
                {createDiagramMutation.isPending ? 'Creating...' : 'Create First DFD'}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Threat Analysis Tab */}
        <TabsContent value="threats" className="flex-1 flex flex-col m-0 min-h-0">
          {diagrams.length > 0 ? (
            <>
              {/* DFD Filter + View Toggle Bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <h2 className="font-semibold">Threat Analysis</h2>
                  {/* DFD Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Filter by DFD:</span>
                    <select
                      value={selectedDiagramId || ''}
                      onChange={(e) => setSelectedDiagramId(e.target.value || null)}
                      className="text-sm border rounded-md px-2 py-1 bg-background"
                    >
                      <option value="">All DFDs</option>
                      {diagrams.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center rounded-lg border bg-background p-1">
                  <Button
                    variant={viewMode === 'component' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('component')}
                    className={cn(
                      'rounded-md px-3',
                      viewMode === 'component' ? '' : 'hover:bg-transparent'
                    )}
                  >
                    Component View
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className={cn(
                      'rounded-md px-3',
                      viewMode === 'table' ? '' : 'hover:bg-transparent'
                    )}
                  >
                    Table View
                  </Button>
                </div>
              </div>

              {/* Threat Analysis Content - fills remaining space */}
              <div className="flex-1 min-h-0">
                {viewMode === 'component' ? (
                  <ComponentView
                    canvasData={aggregatedCanvasData}
                    analyzableComponents={analyzableComponents}
                    trustBoundaries={trustBoundaries}
                    dataFlows={dataFlows}
                    componentThreats={filteredComponentThreats}
                    selectedFrameworks={threatModel.frameworks || []}
                    selectedComponentId={selectedComponentId}
                    selectedThreatId={selectedThreatId}
                    selectedComponentThreat={selectedComponentThreat}
                    onSelectComponent={setSelectedComponentId}
                    onSelectThreat={setSelectedThreatId}
                    onCountermeasureStatusChange={updateCountermeasureStatus}
                    onAssignOwner={assignOwner}
                    onAddCustomThreat={() => {}}
                    onDismissThreat={dismissThreat}
                    onRestoreThreat={restoreThreat}
                    onAddCustomCountermeasure={addCountermeasure}
                    onRemoveCountermeasure={removeCountermeasure}
                  />
                ) : (
                  <TableView
                    canvasData={aggregatedCanvasData}
                    componentThreats={filteredComponentThreats}
                    onCountermeasureStatusChange={updateCountermeasureStatus}
                    onSelectThreat={(componentId, threatId) => {
                      setSelectedComponentId(componentId)
                      setSelectedThreatId(threatId)
                      setViewMode('component')
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  No DFDs created yet. Create a data flow diagram to start threat analysis.
                </p>
                <Button onClick={handleCreateDFD} disabled={createDiagramMutation.isPending}>
                  {createDiagramMutation.isPending ? 'Creating...' : 'Create First DFD'}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <SystemContextModal
        open={systemContextModalOpen}
        onOpenChange={setSystemContextModalOpen}
        systemContext={systemContext}
        onSave={updateSystemContext}
      />

      <ManageSystemsModal
        open={manageSystemsModalOpen}
        onOpenChange={setManageSystemsModalOpen}
        connectedSystems={linkedSystems}
        availableSystems={systems}
        onAdd={(systemId) => console.log('Add system:', systemId)}
        onRemove={(systemId) => console.log('Remove system:', systemId)}
      />

      <ManageThreatModelsModal
        open={manageThreatModelsModalOpen}
        onOpenChange={setManageThreatModelsModalOpen}
        connectedModels={referencedModels}
        availableModels={allThreatModels}
        currentModelId={id!}
        onAdd={(modelId) => console.log('Add model:', modelId)}
        onRemove={(modelId) => console.log('Remove model:', modelId)}
      />

      <ManagePeopleModal
        open={managePeopleModalOpen}
        onOpenChange={setManagePeopleModalOpen}
        people={assignedPeople}
        availablePeople={TEAM_MEMBERS}
        onAdd={(personId) => console.log('Add person:', personId)}
        onRemove={(personId) => console.log('Remove person:', personId)}
      />

      <ManageDFDsModal
        open={manageDFDsModalOpen}
        onOpenChange={setManageDFDsModalOpen}
        threatModelId={id!}
        dfds={diagrams}
        onCreateDFD={handleCreateDFD}
        onDeleteDFD={handleDeleteDFD}
      />
    </div>
  )
}
