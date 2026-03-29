import { useState } from 'react'
import { Image as ImageIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import type { ReferenceImage } from '@/types'

interface ReferenceImageGalleryProps {
  images: ReferenceImage[]
  onImageClick: (index: number) => void
  onDelete: (imageId: number) => Promise<void>
}

export function ReferenceImageGallery({
  images,
  onImageClick,
  onDelete,
}: ReferenceImageGalleryProps) {
  const [deleteImageId, setDeleteImageId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDelete = async () => {
    if (!deleteImageId) return

    setDeletingId(deleteImageId)
    try {
      await onDelete(deleteImageId)
      setDeleteImageId(null)
    } finally {
      setDeletingId(null)
    }
  }

  if (images.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No reference images uploaded yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="group relative aspect-square border rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onClick={() => onImageClick(index)}
          >
            <img
              src={image.imageUrl}
              alt={image.filename}
              className="w-full h-full object-cover"
            />

            {/* Overlay with delete button */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteImageId(image.id)
                }}
                disabled={deletingId === image.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Filename tooltip */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 truncate opacity-0 group-hover:opacity-100 transition-opacity">
              {image.filename}
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteImageId} onOpenChange={() => setDeleteImageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reference image?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
