import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { X, File } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface PendingFile {
  id: string
  file: File
  progress: number
  preview?: string
}

interface FilePreviewProps {
  files: PendingFile[]
  onRemove: (id: string) => void
  className?: string
}

export default function FilePreview({ files, onRemove, className }: FilePreviewProps) {
  if (files.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {files.map((f) => (
        <div
          key={f.id}
          className="border-border bg-card relative flex items-center gap-2 rounded-md border p-2 pr-8"
        >
          {f.preview ? (
            <img src={f.preview} alt="" className="h-8 w-8 rounded object-cover" />
          ) : (
            <File className="text-muted-foreground h-5 w-5" />
          )}
          <div className="min-w-0">
            <p className="max-w-24 truncate text-xs font-medium">{f.file.name}</p>
            <p className="text-muted-foreground text-xs">{(f.file.size / 1024).toFixed(0)} KB</p>
          </div>
          {f.progress < 100 && (
            <Progress value={f.progress} className="absolute bottom-0 left-0 h-0.5 w-full" />
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute top-1 right-1"
            onClick={() => onRemove(f.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}
