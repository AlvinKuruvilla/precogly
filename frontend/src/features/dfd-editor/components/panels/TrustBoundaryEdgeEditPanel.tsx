import { memo, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { X, Trash2, ArrowLeftRight, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type { TrustBoundaryEdge, TrustBoundaryEdgeData } from '../../types'
import { ACCESS_CONTROL_METHODS, AUTHENTICATION_METHODS } from '../../types'
import type { AccessControlMethod, AuthenticationMethod } from '../../types'

interface TrustBoundaryEdgeEditPanelProps {
  edge: TrustBoundaryEdge
  onClose: () => void
}

export const TrustBoundaryEdgeEditPanel = memo(function TrustBoundaryEdgeEditPanel({
  edge,
  onClose,
}: TrustBoundaryEdgeEditPanelProps) {
  const { setEdges, getNodes } = useReactFlow()
  const [showTokenConfig, setShowTokenConfig] = useState(false)
  const [showLogoutConfig, setShowLogoutConfig] = useState(false)

  const nodes = getNodes()
  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)

  const updateEdgeData = (updates: Partial<TrustBoundaryEdgeData>) => {
    setEdges((edges) =>
      edges.map((e) =>
        e.id === edge.id ? { ...e, data: { ...e.data, ...updates } } : e
      )
    )
  }

  const handleDelete = () => {
    setEdges((edges) => edges.filter((e) => e.id !== edge.id))
    onClose()
  }

  const handleReverseDirection = () => {
    setEdges((edges) =>
      edges.map((e) =>
        e.id === edge.id
          ? { ...e, source: edge.target, target: edge.source }
          : e
      )
    )
  }

  const toggleAccessControlMethod = (method: AccessControlMethod) => {
    const current = edge.data?.accessControlMethods || []
    const updated = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method]
    updateEdgeData({ accessControlMethods: updated })
  }

  const toggleAuthenticationMethod = (method: AuthenticationMethod) => {
    const current = edge.data?.authenticationMethods || []
    const updated = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method]
    updateEdgeData({ authenticationMethods: updated })
  }

  return (
    <div className="w-80 bg-background border-l h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-orange-600" />
          <span className="font-medium">Trust Boundary</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Connection info */}
        <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">From:</span>
            <span className="font-medium">
              {String(sourceNode?.data?.label || edge.source)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">To:</span>
            <span className="font-medium">
              {String(targetNode?.data?.label || edge.target)}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleReverseDirection}
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Reverse Direction
        </Button>

        <Separator />

        {/* Label */}
        <div className="space-y-2">
          <Label htmlFor="boundary-label">Label</Label>
          <Input
            id="boundary-label"
            value={edge.data?.label || ''}
            onChange={(e) => updateEdgeData({ label: e.target.value })}
            placeholder="e.g., API Gateway Boundary..."
          />
        </div>

        <Separator />

        {/* Access Control Methods */}
        <div className="space-y-2">
          <Label>Access Control Methods</Label>
          <div className="grid grid-cols-2 gap-2">
            {ACCESS_CONTROL_METHODS.map((method) => (
              <div key={method.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`acl-${method.value}`}
                  checked={edge.data?.accessControlMethods?.includes(method.value) || false}
                  onCheckedChange={() => toggleAccessControlMethod(method.value)}
                />
                <Label
                  htmlFor={`acl-${method.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {method.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Authentication Methods */}
        <div className="space-y-2">
          <Label>Authentication Methods</Label>
          <div className="grid grid-cols-2 gap-2">
            {AUTHENTICATION_METHODS.map((method) => (
              <div key={method.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`auth-${method.value}`}
                  checked={edge.data?.authenticationMethods?.includes(method.value) || false}
                  onCheckedChange={() => toggleAuthenticationMethod(method.value)}
                />
                <Label
                  htmlFor={`auth-${method.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {method.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Token Configuration (collapsible) */}
        <div className="space-y-2">
          <button
            className="flex items-center gap-2 w-full text-left"
            onClick={() => setShowTokenConfig(!showTokenConfig)}
          >
            {showTokenConfig ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Label className="cursor-pointer">Token Configuration</Label>
          </button>

          {showTokenConfig && (
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="access-token-expires" className="text-sm font-normal">
                  Access token expires
                </Label>
                <Switch
                  id="access-token-expires"
                  checked={edge.data?.accessTokenExpires || false}
                  onCheckedChange={(checked) =>
                    updateEdgeData({ accessTokenExpires: checked })
                  }
                />
              </div>

              {edge.data?.accessTokenExpires && (
                <div className="space-y-1">
                  <Label htmlFor="access-token-ttl" className="text-xs text-muted-foreground">
                    Access token TTL (seconds)
                  </Label>
                  <Input
                    id="access-token-ttl"
                    type="number"
                    min={0}
                    value={edge.data?.accessTokenTtl ?? ''}
                    onChange={(e) =>
                      updateEdgeData({
                        accessTokenTtl: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                    placeholder="e.g., 3600"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="has-refresh-token" className="text-sm font-normal">
                  Has refresh token
                </Label>
                <Switch
                  id="has-refresh-token"
                  checked={edge.data?.hasRefreshToken || false}
                  onCheckedChange={(checked) =>
                    updateEdgeData({ hasRefreshToken: checked })
                  }
                />
              </div>

              {edge.data?.hasRefreshToken && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="refresh-token-expires" className="text-sm font-normal">
                      Refresh token expires
                    </Label>
                    <Switch
                      id="refresh-token-expires"
                      checked={edge.data?.refreshTokenExpires || false}
                      onCheckedChange={(checked) =>
                        updateEdgeData({ refreshTokenExpires: checked })
                      }
                    />
                  </div>

                  {edge.data?.refreshTokenExpires && (
                    <div className="space-y-1">
                      <Label htmlFor="refresh-token-ttl" className="text-xs text-muted-foreground">
                        Refresh token TTL (seconds)
                      </Label>
                      <Input
                        id="refresh-token-ttl"
                        type="number"
                        min={0}
                        value={edge.data?.refreshTokenTtl ?? ''}
                        onChange={(e) =>
                          updateEdgeData({
                            refreshTokenTtl: e.target.value
                              ? parseInt(e.target.value, 10)
                              : undefined,
                          })
                        }
                        placeholder="e.g., 86400"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Logout Capabilities (collapsible) */}
        <div className="space-y-2">
          <button
            className="flex items-center gap-2 w-full text-left"
            onClick={() => setShowLogoutConfig(!showLogoutConfig)}
          >
            {showLogoutConfig ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Label className="cursor-pointer">Logout Capabilities</Label>
          </button>

          {showLogoutConfig && (
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="can-user-logout" className="text-sm font-normal">
                  Can user logout
                </Label>
                <Switch
                  id="can-user-logout"
                  checked={edge.data?.canUserLogout || false}
                  onCheckedChange={(checked) =>
                    updateEdgeData({ canUserLogout: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="can-system-logout" className="text-sm font-normal">
                  Can system logout
                </Label>
                <Switch
                  id="can-system-logout"
                  checked={edge.data?.canSystemLogout || false}
                  onCheckedChange={(checked) =>
                    updateEdgeData({ canSystemLogout: checked })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Edge info */}
        <Separator />

        <div className="space-y-1 text-xs text-muted-foreground">
          <div>ID: {edge.id}</div>
          <div>Type: {edge.type}</div>
        </div>
      </div>

      {/* Footer with delete */}
      <div className="p-4 border-t">
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Trust Boundary
        </Button>
      </div>
    </div>
  )
})
