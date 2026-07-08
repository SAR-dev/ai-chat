import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chatStore'
import type { SlideDeck } from '@/types'
import { RefreshCw, Download, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function resolvePptxUrl(pptxUrl?: string): string | undefined {
  if (!pptxUrl) return undefined
  if (/^https?:\/\//i.test(pptxUrl)) return pptxUrl
  const base = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '/')
  return pptxUrl.replace(/^\/api\//, base)
}

interface SlideDeckViewProps {
  deck: SlideDeck
}

export default function SlideDeckView({ deck }: SlideDeckViewProps) {
  const [regeneratingSlide, setRegeneratingSlide] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const pptxUrl = useMemo(() => resolvePptxUrl(deck.pptxUrl), [deck.pptxUrl])

  const regenerateSlide = useChatStore((s) => s.regenerateSlide)

  const handleRegenerate = async (slideIndex: number) => {
    if (!deck.deckId) return
    setRegeneratingSlide(slideIndex)
    try {
      await regenerateSlide(deck.deckId, slideIndex, 'Regenerate this slide')
    } finally {
      setRegeneratingSlide(null)
    }
  }

  const handleDownload = () => {
    if (!pptxUrl) return
    window.open(pptxUrl, '_blank')
  }

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === previewRef.current)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      previewRef.current?.requestFullscreen()
    }
  }, [])

  return (
    <div className="border-border bg-card my-3 rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{deck.title ?? 'Slide Deck'}</p>
          {deck.slideCount != null && (
            <p className="text-muted-foreground text-xs">{deck.slideCount} slides</p>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {deck.html && (
            <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          {pptxUrl && (
            <Button variant="ghost" size="icon-sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {deck.html && (
        <div
          ref={previewRef}
          className={cn(
            'relative overflow-hidden rounded-lg border',
            isFullscreen && 'bg-background flex h-screen items-center rounded-none border-0',
          )}
        >
          <iframe
            srcDoc={deck.html}
            title={deck.title ?? 'Slide Deck'}
            className={cn('w-full', isFullscreen ? 'h-full' : 'h-[400px]')}
            sandbox="allow-scripts"
          />
          {isFullscreen && (
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 rounded-full shadow-sm"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {deck.deckId && (
        <div className="mt-2 flex gap-1">
          {Array.from({ length: deck.slideCount ?? 0 }).map((_, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              disabled={regeneratingSlide === i}
              onClick={() => handleRegenerate(i)}
              className="text-xs"
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${regeneratingSlide === i ? 'animate-spin' : ''}`} />
              Slide {i + 1}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
