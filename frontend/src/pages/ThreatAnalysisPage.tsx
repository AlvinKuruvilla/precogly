import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThreatAnalysisView } from '@/features/dfd-editor/components/threat-analysis'
import type { Diagram, ThreatModel } from '@/types'
import { api } from '@/lib/api'

async function fetchDiagram(diagramId: string): Promise<Diagram> {
  return api.get<Diagram>(`/diagrams/${diagramId}/`)
}

async function fetchThreatModel(threatModelId: string): Promise<ThreatModel> {
  return api.get<ThreatModel>(`/threat-models/${threatModelId}/`)
}

export function ThreatAnalysisPage() {
  const { id: threatModelId, diagramId } = useParams<{ id: string; diagramId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Check if we came from the DFD editor (state will have fromDFD: true)
  const cameFromDFD = location.state?.fromDFD === true

  const {
    data: diagram,
    isLoading: isDiagramLoading,
    isError: isDiagramError,
  } = useQuery({
    queryKey: ['diagram', diagramId],
    queryFn: () => fetchDiagram(diagramId!),
    enabled: !!diagramId,
  })

  const {
    data: threatModel,
    isLoading: isThreatModelLoading,
  } = useQuery({
    queryKey: ['threatModel', threatModelId],
    queryFn: () => fetchThreatModel(threatModelId!),
    enabled: !!threatModelId,
  })

  const isLoading = isDiagramLoading || isThreatModelLoading
  const isError = isDiagramError

  const handleBack = () => {
    if (cameFromDFD) {
      // Go back to DFD editor
      navigate(`/threat-models/${threatModelId}/diagrams/${diagramId}`)
    } else {
      // Go back to threat model detail page (Threats tab)
      navigate(`/threat-models/${threatModelId}?tab=threats`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !diagram) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <p className="text-muted-foreground">Failed to load diagram</p>
        <Button onClick={() => navigate(`/threat-models/${threatModelId}`)}>
          Go to Threat Model
        </Button>
      </div>
    )
  }

  const canvasData = diagram.canvasData

  // DEBUG [6]: Log fetched diagram data
  console.log('[DEBUG 6] ThreatAnalysisPage - diagram data:', {
    diagramId: diagram.id,
    diagramName: diagram.name,
    nodeCount: canvasData?.nodes?.length,
    nodes: canvasData?.nodes?.map((n: Record<string, unknown>) => ({
      id: n.id,
      type: n.type,
      label: (n.data as Record<string, unknown>)?.label,
      technology: (n.data as Record<string, unknown>)?.technology,
      component_id: (n.data as Record<string, unknown>)?.component_id,
      component_library_id: (n.data as Record<string, unknown>)?.component_library_id,
    })),
  })

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ThreatAnalysisView
        threatModelId={threatModelId || ''}
        diagramId={diagramId || ''}
        diagramTitle={diagram.name || ''}
        canvasData={{
          nodes: canvasData?.nodes || [],
          edges: canvasData?.edges || [],
        }}
        selectedFrameworks={threatModel?.frameworks || []}
        onBack={handleBack}
        backLabel={cameFromDFD ? 'Back to DFD' : 'Back to Threat Model'}
      />
    </div>
  )
}
