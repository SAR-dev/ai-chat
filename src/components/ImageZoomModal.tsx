import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import type { GeneratedImage } from '@/types'

interface ImageZoomModalProps {
  images: GeneratedImage[]
  index: number
  onOpenChange: (open: boolean) => void
}

/**
 * Fullscreen-ish preview for a generated image. Opens over whatever thumbnail
 * was clicked, supports left/right arrow keys when a message has more than
 * one image, and offers a direct download of the full-resolution b64 data.
 */
export default function ImageZoomModal({ images, index, onOpenChange }: ImageZoomModalProps) {
  const [current, setCurrent] = useState(index)

  useEffect(() => setCurrent(index), [index])

  const hasMultiple = images.length > 1
  const image = images[current]

  const goPrev = () => setCurrent((c) => (c - 1 + images.length) % images.length)
  const goNext = () => setCurrent((c) => (c + 1) % images.length)

  useEffect(() => {
    if (!hasMultiple) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultiple, images.length])

  if (!image) return null

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = image.b64
    a.download = `${(image.caption ?? 'image').trim().replace(/\s+/g, '-').toLowerCase()}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="bg-background/95 max-w-[min(92vw,880px)] p-3 backdrop-blur-sm">
        <div className="relative flex items-center justify-center">
          {hasMultiple && (
            <Button
              variant="secondary"
              size="icon-sm"
              className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full shadow-sm"
              onClick={goPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          <img
            src={image.b64}
            alt={image.caption ?? ''}
            className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain"
          />

          {hasMultiple && (
            <Button
              variant="secondary"
              size="icon-sm"
              className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full shadow-sm"
              onClick={goNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-1">
          {image.caption ? (
            <p className="text-muted-foreground min-w-0 truncate text-sm">{image.caption}</p>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 items-center gap-2">
            {hasMultiple && (
              <span className="text-muted-foreground text-xs">
                {current + 1} / {images.length}
              </span>
            )}
            <Button variant="ghost" size="icon-sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
