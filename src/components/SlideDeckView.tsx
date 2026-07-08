import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chatStore'
import type { SlideDeck } from '@/types'
import { RefreshCw, Download } from 'lucide-react'

interface SlideDeckViewProps {
  deck: SlideDeck
}

export default function SlideDeckView({ deck }: SlideDeckViewProps) {
  const [regeneratingSlide, setRegeneratingSlide] = useState<number | null>(null)

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
    if (!deck.pptxUrl) return
    window.open(deck.pptxUrl, '_blank')
  }

  return (
    <div className="border-border bg-card my-3 rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{deck.title ?? 'Slide Deck'}</p>
          {deck.slideCount != null && (
            <p className="text-muted-foreground text-xs">{deck.slideCount} slides</p>
          )}
        </div>
        {deck.pptxUrl && (
          <Button variant="ghost" size="icon-sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>

      {deck.html && (
        <div className="overflow-hidden rounded-lg border">
          <iframe
            srcDoc={deck.html}
            title={deck.title ?? 'Slide Deck'}
            className="h-[400px] w-full"
            sandbox="allow-scripts"
          />
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
