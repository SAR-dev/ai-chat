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
        'border-border bg-card hover:bg-accent/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
        className,
      )}
      onClick={onOpenArtifact}
    >
      <FileCode className="text-primary h-5 w-5 shrink-0" />
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
