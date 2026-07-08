import { Button } from '@/components/ui/button'
import { FileCode, ArrowsOut } from '@phosphor-icons/react'
import type { Artifact } from '@/types'
import { cn } from '@/lib/utils'

interface ArtifactCardProps {
  artifact: Artifact
  onOpenArtifact: () => void
  className?: string
}

export default function ArtifactCard({ artifact, onOpenArtifact, className }: ArtifactCardProps) {
  return (
    <div
      className={cn(
        'border-border bg-card hover:bg-accent/40 mt-3 flex max-w-sm cursor-pointer items-center gap-3 rounded-xl border p-3 shadow-sm transition-colors',
        className,
      )}
      onClick={onOpenArtifact}
    >
      <div className="bg-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        <FileCode className="text-accent-foreground h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{artifact.title}</p>
        <p className="text-muted-foreground text-xs">{artifact.language ?? artifact.type}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={(e) => {
          e.stopPropagation()
          onOpenArtifact()
        }}
      >
        <ArrowsOut className="h-3 w-3" />
      </Button>
    </div>
  )
}
