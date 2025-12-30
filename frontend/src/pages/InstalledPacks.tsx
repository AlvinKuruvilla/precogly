/**
 * Installed Packs page for managing installed library packs.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Package, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useInstalledPacks, useUninstallPack, usePackUsage } from '@/api/packs'
import type { InstalledPack } from '@/types/packs'

const statusColors: Record<string, string> = {
  installed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  pending_update: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function InstalledPacks() {
  const { data: packs, isLoading } = useInstalledPacks()
  const uninstallMutation = useUninstallPack()
  const [packToUninstall, setPackToUninstall] = useState<InstalledPack | null>(null)

  // Check usage when a pack is selected for uninstall
  const { data: usageData, isLoading: usageLoading } = usePackUsage(
    packToUninstall?.id ?? null
  )

  const handleUninstall = async () => {
    if (!packToUninstall) return

    try {
      await uninstallMutation.mutateAsync(packToUninstall.id)
      setPackToUninstall(null)
    } catch (error) {
      console.error('Failed to uninstall pack:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/packs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Installed Packs</h1>
          <p className="text-muted-foreground">
            Manage installed library packs for your organization.
          </p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : packs && packs.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pack</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Installed By</TableHead>
                <TableHead>Installed Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs.map((installation) => (
                <TableRow key={installation.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{installation.pack.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {installation.pack.description.slice(0, 50)}
                          {installation.pack.description.length > 50 && '...'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      v{installation.installedVersion}
                    </span>
                    {installation.updateAvailable && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Update available
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusColors[installation.status] || ''}
                      variant="secondary"
                    >
                      {installation.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {installation.installedByEmail}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(installation.installedAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPackToUninstall(installation)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No packs installed</h3>
          <p className="text-muted-foreground mb-4">
            Install library packs to add pre-built components, threats, and countermeasures.
          </p>
          <Link to="/packs">
            <Button>Browse Packs</Button>
          </Link>
        </div>
      )}

      {/* Uninstall Confirmation Dialog */}
      <AlertDialog
        open={packToUninstall !== null}
        onOpenChange={(open) => !open && setPackToUninstall(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uninstall Pack</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to uninstall{' '}
                  <strong>{packToUninstall?.pack.name}</strong>?
                </p>

                {usageLoading ? (
                  <p className="text-sm text-muted-foreground">Checking usage...</p>
                ) : usageData?.inUse ? (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        This pack is in use
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 mt-1">
                        {usageData.usage.componentInstances > 0 && (
                          <span>{usageData.usage.componentInstances} component instances, </span>
                        )}
                        {usageData.usage.threatInstances > 0 && (
                          <span>{usageData.usage.threatInstances} threat instances, </span>
                        )}
                        {usageData.usage.countermeasureInstances > 0 && (
                          <span>{usageData.usage.countermeasureInstances} countermeasure instances</span>
                        )}
                        {' '}use items from this pack.
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 mt-1">
                        Existing threat models will continue to work, but library items will be hidden.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No threat models are using items from this pack.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUninstall}
              disabled={usageLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {uninstallMutation.isPending ? 'Uninstalling...' : 'Uninstall'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
