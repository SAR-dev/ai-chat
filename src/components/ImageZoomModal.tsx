import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import type { GeneratedImage } from '@/types'

interface ImageZoomModalProps {
  images: GeneratedImage[]
  index: number
  onOpenChange: (open: boolean) => void
}

export default function ImageZoomModal({ images, index, onOpenChange }: ImageZoomModalProps) {
  const [current, setCurrent] = useState(index)
  const [prevIndex, setPrevIndex] = useState(index)

  // Reset the shown image whenever the `index` prop changes (e.g. a different
  // image was clicked). Adjusting state during render avoids the extra
  // render pass a useEffect would cause.
  if (index !== prevIndex) {
    setPrevIndex(index)
    setCurrent(index)
  }

  const hasMultiple = images.length > 1
  const image = images[current]

  const goPrev = () => setCurrent((c) => (c - 1 + images.length) % images.length)
  const goNext = () => setCurrent((c) => (c + 1) % images.length)

  useEffect(() => {
    if (!hasMultiple) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key == 'ArrowLeft') goPrev()
      if (e.key == 'ArrowRight') goNext()
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
      <DialogContent
        overlayClassName="bg-black/80"
        className="top-0 left-0 flex h-dvh w-dvw max-w-none translate-x-0 translate-y-0 items-center justify-center border-0 bg-transparent p-0 shadow-none ring-0 backdrop-blur-none sm:max-w-none"
        showCloseButton={false}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-20 rounded-full bg-black/40 p-1.5 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {hasMultiple && (
          <Button
            variant="secondary"
            size="icon-sm"
            className="absolute top-1/2 left-3 z-10 -translate-y-1/2 rounded-full bg-black/40 text-white/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
            onClick={goPrev}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}

        <img
          src={image.b64}
          alt={image.caption ?? ''}
          className="max-h-[85vh] w-auto max-w-[90vw] rounded-lg object-contain"
        />

        {hasMultiple && (
          <Button
            variant="secondary"
            size="icon-sm"
            className="absolute top-1/2 right-3 z-10 -translate-y-1/2 rounded-full bg-black/40 text-white/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
            onClick={goNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}

        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/40 px-4 py-2 backdrop-blur-sm">
          {image.caption && <p className="truncate text-sm text-white/90">{image.caption}</p>}
          {hasMultiple && (
            <span className="text-xs text-white/70">
              {current + 1} / {images.length}
            </span>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="text-white/70 transition-colors hover:text-white"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
