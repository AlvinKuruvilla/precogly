/**
 * Public view for threat models shared via magic link.
 * No authentication required. Shows read-only view of threat model data.
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMagicLinkAccess } from '@/api/organizations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReadOnlyDFDViewer } from '@/components/shared/ReadOnlyDFDViewer'
import type { ThreatModelStats } from '@/types/organization'
import {
  AlertCircle,
  Clock,
  Eye,
  Lock,
  CheckCircle2,
  Circle,
  Layers,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Bookmark,
  User,
} from 'lucide-react'

// Using flexible types for API response - actual node/edge data comes from backend
interface DFD {
  id: number
  name: string
  canvasData?: {
    nodes?: unknown[]
    edges?: unknown[]
  }
}

interface ThreatModelData {
  id: number
  name: string
  description: string
  version: string
  status: string
  criticality: string
  workspaceData?: {
    systemContext?: {
      description?: string
      assets?: Array<{ name: string; description?: string }>
      outOfScopeItems?: string[]
    }
  }
  dfds?: DFD[]
}

// Progress checklist items with labels
// Note: Backend returns snake_case but DRF converts to camelCase at API boundary
const PROGRESS_ITEMS = [
  { id: 'assetsDefined', label: 'Primary assets defined' },
  { id: 'componentsIdentified', label: 'Components identified' },
  { id: 'trustBoundariesIdentified', label: 'Trust boundaries identified' },
  { id: 'dataFlowsDefined', label: 'Data flows defined' },
  { id: 'ownersAssigned', label: 'Owners assigned' },
  { id: 'threatsLinkedComponents', label: 'Threats linked to components' },
  { id: 'threatsLinkedFlows', label: 'Threats linked to flows' },
  { id: 'countermeasuresAssigned', label: 'Countermeasures assigned' },
] as const

export function SharedThreatModelView() {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, error } = useMagicLinkAccess(token ?? '')
  const [expandedDFDId, setExpandedDFDId] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading threat model...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="mt-4 text-xl font-semibold">Link Not Valid</h2>
              <p className="mt-2 text-muted-foreground">
                This share link has expired, been revoked, or doesn't exist.
              </p>
              <Link
                to="/login"
                className="mt-4 inline-block text-primary hover:underline"
              >
                Sign in to Precogly
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { threatModel, stats, expiresAt, isAuthenticated, savedToAccount } = data
  const tm = threatModel as ThreatModelData
  const serverStats = stats as ThreatModelStats

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Use server-provided stats, fall back to client-side computation if not available
  const componentStats = serverStats?.components ?? {
    total: 0,
    processes: 0,
    datastores: 0,
    actors: 0,
    boundaries: 0,
  }

  const threatStats = serverStats?.threats ?? {
    total: 0,
    exposed: 0,
    mitigated: 0,
  }

  const countermeasureStats = serverStats?.countermeasures ?? {
    total: 0,
    verified: 0,
    gaps: 0,
  }

  const progressValues = serverStats?.progress ?? {}

  const systemContext = tm.workspaceData?.systemContext
  const dfds = tm.dfds ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">Precogly</span>
              <Badge variant="outline" className="ml-2">
                <Eye className="h-3 w-3 mr-1" />
                Read Only
              </Badge>
              {savedToAccount && (
                <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700">
                  <Bookmark className="h-3 w-3 mr-1" />
                  Saved to your account
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Link expires {formatDate(expiresAt)}</span>
              </div>
              {isAuthenticated && (
                <Link
                  to="/threat-models"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <User className="h-4 w-4" />
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Title Section */}
          <div>
            <h1 className="text-3xl font-bold">{tm.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">v{tm.version}</Badge>
              <Badge>{tm.status}</Badge>
              <Badge variant="secondary">{tm.criticality}</Badge>
            </div>
            {tm.description && (
              <p className="mt-3 text-muted-foreground">{tm.description}</p>
            )}
          </div>

          {/* Completion Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Completion Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PROGRESS_ITEMS.map((item) => {
                  const isChecked = progressValues[item.id as keyof typeof progressValues]
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      {isChecked ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          isChecked ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats Cards - Matching the authenticated view */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* In-Scope Components */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">In-Scope Components</span>
                </div>
                <p className="text-4xl font-bold">{componentStats.total}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {componentStats.processes} processes{' '}
                  {componentStats.datastores} datastores{' '}
                  {componentStats.actors} actors
                </p>
                <p className="text-sm text-muted-foreground">
                  {componentStats.boundaries} boundaries
                </p>
              </CardContent>
            </Card>

            {/* Threats */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Threats</span>
                </div>
                <p className="text-4xl font-bold">{threatStats.total}</p>
                <div className="flex items-center gap-4 mt-1">
                  {threatStats.exposed > 0 && (
                    <span className="flex items-center gap-1 text-sm">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {threatStats.exposed} exposed
                    </span>
                  )}
                  {threatStats.mitigated > 0 && (
                    <span className="flex items-center gap-1 text-sm">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {threatStats.mitigated} mitigated
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Countermeasures */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Countermeasures</span>
                </div>
                <p className="text-4xl font-bold">{countermeasureStats.total}</p>
                <div className="flex items-center gap-4 mt-1">
                  {countermeasureStats.verified > 0 && (
                    <span className="flex items-center gap-1 text-sm">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {countermeasureStats.verified} verified
                    </span>
                  )}
                  {countermeasureStats.gaps > 0 && (
                    <span className="flex items-center gap-1 text-sm">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {countermeasureStats.gaps} gaps
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Context */}
          <Card>
            <CardHeader>
              <CardTitle>System Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {systemContext?.description ? (
                <div>
                  <h4 className="font-medium mb-1">Overview</h4>
                  <p className="text-muted-foreground text-sm">
                    {systemContext.description}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No system context description provided.
                </p>
              )}

              {systemContext?.assets && systemContext.assets.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Primary Assets</h4>
                  <ul className="space-y-1">
                    {systemContext.assets.map((asset, index) => (
                      <li
                        key={index}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-primary">•</span>
                        <span>
                          <strong>{asset.name}</strong>
                          {asset.description && `: ${asset.description}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {systemContext?.outOfScopeItems &&
                systemContext.outOfScopeItems.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Out of Scope</h4>
                    <ul className="space-y-1">
                      {systemContext.outOfScopeItems.map((item, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-muted-foreground">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* DFD List */}
          {dfds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Data Flow Diagrams
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dfds.map((dfd) => {
                  const nodeCount = dfd.canvasData?.nodes?.length ?? 0
                  const edgeCount = dfd.canvasData?.edges?.length ?? 0
                  const isExpanded = expandedDFDId === dfd.id

                  return (
                    <div key={dfd.id} className="border rounded-lg overflow-hidden">
                      {/* DFD Header - Clickable */}
                      <button
                        onClick={() => setExpandedDFDId(isExpanded ? null : dfd.id)}
                        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div>
                          <h4 className="font-medium">{dfd.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {nodeCount} components, {edgeCount} data flows
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {isExpanded ? 'Hide diagram' : 'View diagram'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* DFD Viewer - Shown when expanded */}
                      {isExpanded && dfd.canvasData && (
                        <div className="border-t">
                          <div className="p-2 bg-muted/20 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Pan and zoom to explore the diagram
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedDFDId(null)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Close
                            </Button>
                          </div>
                          <ReadOnlyDFDViewer
                            canvasData={dfd.canvasData as { nodes?: unknown[]; edges?: unknown[] }}
                            className="h-[500px] w-full"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Sign in prompt or logged-in user actions */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-center">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Saved to your Shared with Me list</span>
                    </div>
                    <p className="text-muted-foreground">
                      You can access this model anytime from your dashboard.
                    </p>
                    <Link
                      to="/threat-models"
                      className="mt-3 inline-block text-primary font-medium hover:underline"
                    >
                      Go to your Threat Models
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      Want to save this model or create your own?
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <Link
                        to={`/login?redirect=/share/${token}`}
                        className="text-primary font-medium hover:underline"
                      >
                        Sign in
                      </Link>
                      <span className="text-muted-foreground">or</span>
                      <Link
                        to={`/signup?redirect=/share/${token}`}
                        className="text-primary font-medium hover:underline"
                      >
                        Create an account
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
