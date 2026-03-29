/**
 * Dialog for creating and managing magic links for threat model sharing.
 */

import { useState } from 'react'
import { useCreateMagicLink, useMagicLinks, useRevokeMagicLink } from '@/features/organization/api/organizations'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, Link, Trash2, ExternalLink } from 'lucide-react'

interface MagicLinkDialogProps {
  threatModelId: number
  threatModelName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MagicLinkDialog({
  threatModelId,
  threatModelName,
  open,
  onOpenChange,
}: MagicLinkDialogProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: existingLinks = [], isLoading: linksLoading } = useMagicLinks(threatModelId)
  const { mutate: createLink, isPending: isCreating } = useCreateMagicLink()
  const { mutate: revokeLink, isPending: isRevoking } = useRevokeMagicLink()

  // Filter to active (non-revoked) links
  const activeLinks = existingLinks.filter((link) => !link.isRevoked)

  const handleCreate = () => {
    createLink(threatModelId)
  }

  const handleCopy = (url: string, linkId: string) => {
    const fullUrl = `${window.location.origin}${url}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedId(linkId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevoke = (linkId: string) => {
    if (confirm('Are you sure you want to revoke this link? It will no longer work.')) {
      revokeLink(linkId)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Threat Model</DialogTitle>
          <DialogDescription>
            Create a read-only link to share "{threatModelName}" with stakeholders who don't have
            an account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing active links */}
          {activeLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Active Links</p>
              {activeLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-2 rounded-md border p-2"
                >
                  <div className="flex-1 min-w-0">
                    <Input
                      readOnly
                      value={`${window.location.origin}${link.url}`}
                      className="font-mono text-xs h-8"
                    />
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>Expires {formatDate(link.expiresAt)}</span>
                      <span>•</span>
                      <span>{link.accessedCount} views</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopy(link.url, link.id)}
                    >
                      {copiedId === link.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <a
                        href={`${window.location.origin}${link.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(link.id)}
                      disabled={isRevoking}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create new link */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCreate}
              disabled={isCreating || linksLoading}
              className="flex-1"
            >
              <Link className="mr-2 h-4 w-4" />
              {isCreating ? 'Creating...' : 'Create New Link'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Links expire after 30 days. You can revoke them at any time.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
