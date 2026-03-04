import { useState, useMemo, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, skipToken } from '@tanstack/react-query'
import { ChevronLeft, Loader2, LayoutDashboard, Shield, ChevronDown, Settings, Send, Trash2, BarChart3, FileText, Share2, Plus } from 'lucide-react'
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
  ReferenceImageGallery,
  ReferenceImageUploader,
  ReferenceImageViewer,
  RelationshipCards,
  DFDCarousel,
  SummaryCards,
  SystemContextModal,
  SystemContextCard,
  ManageSystemsModal,
  ManageThreatModelsModal,
  ManagePeopleModal,
  ManageDFDsModal,
  RiskAnalysisTab,
} from '@/components/workspace'
import { MagicLinkDialog } from '@/components/sharing/MagicLinkDialog'
import { useWorkspaceThreatAnalysis } from '@/components/workspace/useWorkspaceThreatAnalysis'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { ComponentView } from '@/features/dfd-editor/components/threat-analysis/ComponentView'
import { TableView } from '@/features/dfd-editor/components/threat-analysis/TableView'
import { AddThreatDialog } from '@/features/dfd-editor/components/threat-analysis/AddThreatDialog'
import { AddCountermeasureDialog } from '@/features/dfd-editor/components/threat-analysis/AddCountermeasureDialog'
import { AddCustomComponentDialog } from '@/features/dfd-editor/components/threat-analysis/AddCustomComponentDialog'
import { useThreatModelThreats, parseCountermeasureId } from '@/api/threats'
import { useAnalysisComponents } from '@/api/components'
import type { ThreatModel, Diagram, System, ScoringMethodKey } from '@/types'
import type { ThreatModelStatus } from '@/types/domain'
import { WORKSPACE_STATUS_CONFIG, VERSION_TRIGGER_CONFIG } from '@/features/dfd-editor/types/threat-analysis'
import type { WorkspaceStatus } from '@/features/dfd-editor/types/threat-analysis'
import type { DiagramNode, DataFlowEdge, CanvasData } from '@/features/dfd-editor/types'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  useDeleteThreatModel,
  useDeleteDFD,
  useUpdateThreatModel,
  useAddThreatModelSystem,
  useRemoveThreatModelSystem,
  useAddReferencedModel,
  useRemoveReferencedModel,
} from '@/api/threat-models'
import { DeleteThreatModelDialog, DeleteDFDDialog } from '@/components/threat-models'
import { useReferenceImages, useUploadReferenceImage, useDeleteReferenceImage } from '@/api/reference-images'

async function fetchThreatModel(id: string): Promise<ThreatModel> {
  return api.get<ThreatModel>(`/threat-models/${id}/`)
}

async function fetchDiagrams(threatModelId: string): Promise<Diagram[]> {
  // Get diagrams associated with this threat model via the dfds field
  const threatModel = await api.get<ThreatModel>(`/threat-models/${threatModelId}/`)
  return (threatModel.dfds || []) as Diagram[]
}

async function fetchSystems(): Promise<System[]> {
  const response = await api.get<{ results: System[] } | System[]>('/systems/')
  return Array.isArray(response) ? response : response.results
}

async function fetchThreatModels(): Promise<ThreatModel[]> {
  const response = await api.get<{ results: ThreatModel[] } | ThreatModel[]>('/threat-models/')
  return Array.isArray(response) ? response : response.results
}

async function createDiagram(threatModelId: string, title: string): Promise<Diagram> {
  return api.post<Diagram>('/diagrams/create_for_threat_model/', {
    threat_model_id: threatModelId,
    name: title,
    canvas_data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
  })
}

type ViewMode = 'component' | 'table'

export function ThreatModelDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentTeam } = useWorkspace()

  // View state
  const [activeTab, setActiveTab] = useState<string>('overview')
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
  const [shareLinkDialogOpen, setShareLinkDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteDFDDialogOpen, setDeleteDFDDialogOpen] = useState(false)
  const [dfdToDelete, setDfdToDelete] = useState<{ id: string; name: string } | null>(null)

  // Add threat/countermeasure dialog states
  const [addThreatDialogOpen, setAddThreatDialogOpen] = useState(false)
  const [addCountermeasureDialogOpen, setAddCountermeasureDialogOpen] = useState(false)
  const [addComponentDialogOpen, setAddComponentDialogOpen] = useState(false)

  // Reference image states
  const [referenceImageViewerOpen, setReferenceImageViewerOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  // Mutations
  const deleteMutation = useDeleteThreatModel()
  const deleteDFDMutation = useDeleteDFD()
  const updateThreatModelMutation = useUpdateThreatModel()
  const addSystemMutation = useAddThreatModelSystem()
  const removeSystemMutation = useRemoveThreatModelSystem()
  const addReferencedModelMutation = useAddReferencedModel()
  const removeReferencedModelMutation = useRemoveReferencedModel()

  // Reference images
  const { data: referenceImages = [] } = useReferenceImages(id || null)
  const uploadImageMutation = useUploadReferenceImage()
  const deleteImageMutation = useDeleteReferenceImage()


  // Data fetching
  const {
    data: threatModel,
    isLoading: isLoadingModel,
    isError: isErrorModel,
  } = useQuery({
    queryKey: ['threat-model', id],
    queryFn: id ? () => fetchThreatModel(id) : skipToken,
  })

  const { data: diagrams = [] } = useQuery({
    queryKey: ['diagrams', id],
    queryFn: id ? () => fetchDiagrams(id) : skipToken,
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
    currentVersion,
    previousVersions,
    progressChecklist,
    summaries,
    isLoadingThreats,
    updateCountermeasureStatus,
    updateCountermeasurePriority,
    assignOwner,
    dismissThreat,
    restoreThreat,
    addCountermeasure,
    removeCountermeasure,
    restoreCountermeasure,
    toggleChecklistItem,
  } = useWorkspaceThreatAnalysis(id, diagrams)

  // Status is read directly from the threat model
  const status = (threatModel?.status ?? 'draft') as WorkspaceStatus

  // Fetch threat model threats data (for nodeComponentMap)
  const { data: threatData, refetch: refetchThreats } = useThreatModelThreats(id)
  const nodeComponentMap = threatData?.nodeComponentMap || {}

  // Fetch analysis-only components (linked directly to threat model, not via DFD canvas)
  const { data: analysisComponents = [] } = useAnalysisComponents(id ?? null)


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

  // Aggregate canvas data from all diagrams or selected diagram
  const aggregatedCanvasData = useMemo((): CanvasData => {
    const diagramsToUse = selectedDiagramId
      ? diagrams.filter((d) => d.id === selectedDiagramId)
      : diagrams

    const nodes: DiagramNode[] = []
    const edges: DataFlowEdge[] = []

    diagramsToUse.forEach((diagram) => {
      const canvasData = diagram.canvasData
      if (canvasData) {
        nodes.push(...(canvasData.nodes || []))
        edges.push(...(canvasData.edges || []))
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
    // Get components from DFD canvas nodes
    const canvasComponents = aggregatedCanvasData.nodes.filter(
      (node) => node.type === 'process' || node.type === 'datastore' ||
        node.type === 'humanActor' || node.type === 'systemActor'
    )

    // Get IDs of components already on canvas to avoid duplicates
    const canvasComponentIds = new Set(
      canvasComponents
        .map((node) => node.data?.component_id)
        .filter(Boolean)
    )

    // Create synthetic DiagramNode objects for analysis-only components
    // Only include components not already on canvas (when not filtering by specific DFD)
    const analysisOnlyNodes: DiagramNode[] = !selectedDiagramId
      ? analysisComponents
          .filter((comp) => !canvasComponentIds.has(comp.id))
          .map((comp) => ({
            id: `analysis-${comp.id}`,
            type: comp.category === 'process' ? 'process' :
                  comp.category === 'datastore' ? 'datastore' :
                  comp.category === 'human_actor' ? 'humanActor' :
                  comp.category === 'system_actor' ? 'systemActor' : 'process',
            position: { x: 0, y: 0 },
            data: {
              label: comp.name,
              component_id: comp.id,
              isAnalysisOnly: true,
            },
          }))
      : []

    return [...canvasComponents, ...analysisOnlyNodes]
  }, [aggregatedCanvasData.nodes, analysisComponents, selectedDiagramId])

  const trustZones = useMemo(() => {
    return aggregatedCanvasData.nodes.filter((node) => node.type === 'trustZone')
  }, [aggregatedCanvasData.nodes])

  const dataFlows = useMemo(() => {
    return aggregatedCanvasData.edges
  }, [aggregatedCanvasData.edges])

  // Get selected component threat
  const selectedComponentThreat = useMemo(() => {
    if (!selectedThreatId) return null
    return filteredComponentThreats.find((ct) => ct.id === selectedThreatId) || null
  }, [filteredComponentThreats, selectedThreatId])

  // Get backend info for selected component (for AddThreatDialog)
  const selectedBackendInfo = useMemo(() => {
    if (!selectedComponentId) return null

    // Check if it's a data flow (edge)
    const isDataflow = dataFlows.some(df => df.id === selectedComponentId)

    if (isDataflow) {
      // For data flows, find a threat that has this edge ID to get the dataflow backend ID
      const flowThreat = filteredComponentThreats.find(
        t => t.componentId === selectedComponentId && t.threatType === 'dataflow'
      )
      if (flowThreat?.backendComponentId) {
        const edge = dataFlows.find(df => df.id === selectedComponentId)
        return {
          backendId: flowThreat.backendComponentId,
          type: 'dataflow' as const,
          name: edge?.data?.label || `${edge?.source} → ${edge?.target}` || 'Data Flow',
        }
      }
      return null
    }

    // Check if it's an analysis-only component (ID starts with "analysis-")
    if (selectedComponentId.startsWith('analysis-')) {
      const backendId = parseInt(selectedComponentId.replace('analysis-', ''), 10)
      const analysisComp = analysisComponents.find(c => c.id === backendId)
      if (analysisComp) {
        return {
          backendId,
          type: 'component' as const,
          name: analysisComp.name,
        }
      }
      return null
    }

    // For canvas components, use the nodeComponentMap
    const mapping = nodeComponentMap[selectedComponentId]
    if (mapping) {
      const node = aggregatedCanvasData.nodes.find(n => n.id === selectedComponentId)
      const nodeName = node ? String(node.data.label) : selectedComponentId
      return {
        backendId: mapping.componentId,
        type: 'component' as const,
        name: nodeName,
      }
    }

    return null
  }, [selectedComponentId, dataFlows, filteredComponentThreats, nodeComponentMap, aggregatedCanvasData.nodes, analysisComponents])

  // Get backend info for selected threat (for AddCountermeasureDialog)
  const selectedThreatBackendInfo = useMemo(() => {
    if (!selectedComponentThreat) return null
    if (!selectedComponentThreat.backendThreatId) return null

    // Parse threatLibraryId from threatId (format: "lib-{id}")
    const threatLibraryId = selectedComponentThreat.threatId.startsWith('lib-')
      ? parseInt(selectedComponentThreat.threatId.slice(4), 10)
      : null

    return {
      backendId: selectedComponentThreat.backendThreatId,
      type: selectedComponentThreat.threatType || 'component',
      name: selectedComponentThreat.threatName || 'Unknown Threat',
      threatLibraryId,
    }
  }, [selectedComponentThreat])

  // Handlers
  const handleStatusChange = (newStatus: WorkspaceStatus) => {
    if (id) {
      updateThreatModelMutation.mutate({ id, data: { status: newStatus as ThreatModelStatus } as Partial<ThreatModel> })
    }
  }

  const handleSubmitForReview = () => {
    if (id) {
      updateThreatModelMutation.mutate({ id, data: { status: 'pendingReview' as ThreatModelStatus } as Partial<ThreatModel> })
    }
  }

  const handleCreateDFD = () => {
    const title = `Data Flow Diagram ${(diagrams?.length || 0) + 1}`
    createDiagramMutation.mutate(title)
  }

  const handleDeleteDFD = (diagramId: string) => {
    const diagram = diagrams.find((d) => String(d.id) === String(diagramId))
    if (diagram) {
      setDfdToDelete({ id: String(diagram.id), name: diagram.name || 'Untitled DFD' })
      setDeleteDFDDialogOpen(true)
    }
  }

  const handleConfirmDeleteDFD = (deleteOrphanedComponents: boolean) => {
    if (dfdToDelete) {
      deleteDFDMutation.mutate(
        { dfdId: dfdToDelete.id, deleteOrphanedComponents },
        {
          onSuccess: () => {
            setDeleteDFDDialogOpen(false)
            setDfdToDelete(null)
            // Refresh diagrams list
            queryClient.invalidateQueries({ queryKey: ['diagrams', id] })
            queryClient.invalidateQueries({ queryKey: ['threat-model', id] })
          },
        }
      )
    }
  }

  const handleDeleteThreatModel = () => {
    if (id) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          setDeleteDialogOpen(false)
          navigate('/threat-models')
        },
      })
    }
  }

  const handleScoringMethodChange = (method: ScoringMethodKey) => {
    if (id) {
      updateThreatModelMutation.mutate({ id, data: { riskScoringMethod: method } as Partial<ThreatModel> })
    }
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
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">Workspace</span>
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

            {/* Share button */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setShareLinkDialogOpen(true)}
            >
              <Share2 className="h-3 w-3" />
              <span className="hidden sm:inline">Share</span>
            </Button>

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

            {/* Delete button */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-3 w-3" />
              <span className="hidden sm:inline">Delete</span>
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b bg-muted/30 px-6">
          <div className="flex items-center justify-between">
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
            <TabsTrigger
              value="risk-analysis"
              className="h-12 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Risk Analysis
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="h-12 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
            >
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>
          </div>
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
              teamMemberCount={currentTeam?.memberCount ?? 0}
              teamName={currentTeam?.name}
              dfds={diagrams}
              onManageSystems={() => setManageSystemsModalOpen(true)}
              onManageThreatModels={() => setManageThreatModelsModalOpen(true)}
              onManagePeople={() => setManagePeopleModalOpen(true)}
              onManageDFDs={() => setManageDFDsModalOpen(true)}
            />
          </div>

          {/* System Context Card */}
          <SystemContextCard
            threatModelId={id!}
            onEdit={() => setSystemContextModalOpen(true)}
          />

          {/* Summary Cards */}
          <SummaryCards
            components={summaries.componentSummary}
            threats={summaries.threatSummary}
            countermeasures={summaries.countermeasureSummary}
            onComponentsClick={() => setActiveTab('threats')}
            onThreatsClick={() => setActiveTab('threats')}
            onCountermeasuresClick={() => setActiveTab('threats')}
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

          {/* Reference Images */}
          <div className="border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">Reference Images</h3>
            <p className="text-sm text-muted-foreground">
              Upload diagrams, whiteboard photos, or architecture screenshots for reference
            </p>

            <ReferenceImageUploader
              onUpload={async (file, description) => {
                await uploadImageMutation.mutateAsync({
                  threatModelId: id!,
                  file,
                  description,
                })
              }}
              isUploading={uploadImageMutation.isPending}
            />

            {referenceImages.length > 0 && (
              <div className="pt-4">
                <ReferenceImageGallery
                  images={referenceImages}
                  onImageClick={(index) => {
                    setSelectedImageIndex(index)
                    setReferenceImageViewerOpen(true)
                  }}
                  onDelete={async (imageId) => {
                    await deleteImageMutation.mutateAsync(imageId)
                  }}
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Threat Analysis Tab */}
        <TabsContent value="threats" className="flex-1 flex flex-col m-0 min-h-0">
          {isLoadingThreats ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* DFD Filter + View Toggle Bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <h2 className="font-semibold">Threat Analysis</h2>
                  {/* DFD Filter - only show if DFDs exist */}
                  {diagrams.length > 0 && (
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
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Add Component Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddComponentDialogOpen(true)}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Component
                  </Button>
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
                    trustZones={trustZones}
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
                    onAddCustomThreat={() => setAddThreatDialogOpen(true)}
                    onDismissThreat={dismissThreat}
                    onRestoreThreat={restoreThreat}
                    onAddCustomCountermeasure={() => setAddCountermeasureDialogOpen(true)}
                    onRemoveCountermeasure={removeCountermeasure}
                    onRestoreCountermeasure={restoreCountermeasure}
                    onCountermeasurePriorityChange={updateCountermeasurePriority}
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
          )}
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk-analysis" className="flex-1 overflow-auto m-0">
          <RiskAnalysisTab
            threatModelId={id!}
            componentThreats={componentThreats}
            riskScoringMethod={threatModel.riskScoringMethod ?? 'tm_library'}
            onScoringMethodChange={handleScoringMethodChange}
          />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="flex-1 flex items-center justify-center m-0">
          <div className="text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Reports</h2>
            <p className="text-muted-foreground">Coming Soon</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <SystemContextModal
        open={systemContextModalOpen}
        onOpenChange={setSystemContextModalOpen}
        threatModelId={id!}
      />

      <ManageSystemsModal
        open={manageSystemsModalOpen}
        onOpenChange={setManageSystemsModalOpen}
        connectedSystems={linkedSystems}
        availableSystems={systems}
        onAdd={(systemId) => addSystemMutation.mutate({ threatModelId: id!, systemId: Number(systemId) })}
        onRemove={(systemId) => removeSystemMutation.mutate({ threatModelId: id!, systemId: Number(systemId) })}
      />

      <ManageThreatModelsModal
        open={manageThreatModelsModalOpen}
        onOpenChange={setManageThreatModelsModalOpen}
        connectedModels={referencedModels}
        availableModels={allThreatModels}
        currentModelId={id!}
        onAdd={(modelId) => addReferencedModelMutation.mutate({ threatModelId: id!, targetModelId: Number(modelId) })}
        onRemove={(modelId) => removeReferencedModelMutation.mutate({ threatModelId: id!, targetModelId: Number(modelId) })}
      />

      <ManagePeopleModal
        open={managePeopleModalOpen}
        onOpenChange={setManagePeopleModalOpen}
        teamId={currentTeam?.id ?? 0}
        teamName={currentTeam?.name}
      />

      <ManageDFDsModal
        open={manageDFDsModalOpen}
        onOpenChange={setManageDFDsModalOpen}
        threatModelId={id!}
        dfds={diagrams}
        onCreateDFD={handleCreateDFD}
        onDeleteDFD={handleDeleteDFD}
      />

      <DeleteThreatModelDialog
        threatModel={threatModel}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteThreatModel}
        isDeleting={deleteMutation.isPending}
      />

      <DeleteDFDDialog
        dfdId={dfdToDelete?.id ?? null}
        dfdName={dfdToDelete?.name ?? ''}
        open={deleteDFDDialogOpen}
        onOpenChange={(open: boolean) => {
          setDeleteDFDDialogOpen(open)
          if (!open) setDfdToDelete(null)
        }}
        onConfirm={handleConfirmDeleteDFD}
        isDeleting={deleteDFDMutation.isPending}
      />

      <MagicLinkDialog
        threatModelId={parseInt(id!, 10)}
        threatModelName={threatModel.name}
        open={shareLinkDialogOpen}
        onOpenChange={setShareLinkDialogOpen}
      />

      {/* Add Threat Dialog */}
      {selectedBackendInfo && (
        <AddThreatDialog
          open={addThreatDialogOpen}
          onOpenChange={setAddThreatDialogOpen}
          targetId={selectedBackendInfo.backendId}
          targetType={selectedBackendInfo.type}
          targetName={selectedBackendInfo.name}
          onSuccess={() => {
            refetchThreats()
          }}
        />
      )}

      {/* Add Countermeasure Dialog */}
      {selectedThreatBackendInfo && (
        <AddCountermeasureDialog
          open={addCountermeasureDialogOpen}
          onOpenChange={setAddCountermeasureDialogOpen}
          threatId={selectedThreatBackendInfo.backendId}
          threatType={selectedThreatBackendInfo.type as 'component' | 'dataflow'}
          threatName={selectedThreatBackendInfo.name}
          threatLibraryId={selectedThreatBackendInfo.threatLibraryId}
          onSuccess={() => {
            refetchThreats()
          }}
        />
      )}

      {/* Add Custom Component Dialog */}
      <AddCustomComponentDialog
        open={addComponentDialogOpen}
        onOpenChange={setAddComponentDialogOpen}
        threatModelId={id!}
        onSuccess={() => {
          refetchThreats()
        }}
      />

      {/* Reference Image Viewer */}
      <ReferenceImageViewer
        images={referenceImages}
        initialIndex={selectedImageIndex}
        open={referenceImageViewerOpen}
        onOpenChange={setReferenceImageViewerOpen}
      />
    </div>
  )
}
