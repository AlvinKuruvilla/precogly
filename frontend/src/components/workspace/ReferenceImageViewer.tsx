import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ReferenceImage } from '@/types'

interface ReferenceImageViewerProps {
  images: ReferenceImage[]
  initialIndex?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReferenceImageViewer({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
}: ReferenceImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const currentImage = images[currentIndex]

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  if (!currentImage) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{currentImage.filename}</span>
            <span className="text-sm text-muted-foreground font-normal">
              {currentIndex + 1} / {images.length}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Image */}
        <div className="flex-1 relative flex items-center justify-center bg-muted rounded-lg overflow-hidden">
          <img
            src={currentImage.imageUrl}
            alt={currentImage.filename}
            className="max-w-full max-h-full object-contain"
          />

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                onClick={handleNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* Description */}
        {currentImage.description && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {currentImage.description}
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-muted-foreground">
          {currentImage.uploadedByEmail && (
            <span>Uploaded by {currentImage.uploadedByEmail}</span>
          )}
          {currentImage.createdAt && (
            <span className="ml-2">
              • {new Date(currentImage.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
