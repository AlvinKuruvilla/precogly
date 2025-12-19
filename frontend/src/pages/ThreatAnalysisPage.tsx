import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThreatAnalysisView } from '@/features/dfd-editor/components/threat-analysis'
import type { Diagram } from '@/types'

async function fetchDiagram(diagramId: string): Promise<Diagram> {
  const response = await fetch(`/api/diagrams/${diagramId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch diagram')
  }
  return response.json()
}

export function ThreatAnalysisPage() {
  const { id: threatModelId, diagramId } = useParams<{ id: string; diagramId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Check if we came from the DFD editor (state will have fromDFD: true)
  const cameFromDFD = location.state?.fromDFD === true

  const {
    data: diagram,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['diagram', diagramId],
    queryFn: () => fetchDiagram(diagramId!),
    enabled: !!diagramId,
  })

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

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ThreatAnalysisView
        diagramId={diagramId || ''}
        diagramTitle={diagram.title}
        canvasData={{
          nodes: diagram.canvasData?.nodes || [],
          edges: diagram.canvasData?.edges || [],
        }}
        onBack={handleBack}
        backLabel={cameFromDFD ? 'Back to DFD' : 'Back to Threat Model'}
      />
    </div>
  )
}
