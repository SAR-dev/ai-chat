import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Download } from '@phosphor-icons/react'
import * as api from '@/lib/apiClient'

interface FileViewerModalProps {
  fileId: string | null
  onClose: () => void
}

type FileContent = {
  id: string
  filename: string
  filetype: string
  size: number
  url: string
  content?: string | null
}

export default function FileViewerModal({ fileId, onClose }: FileViewerModalProps) {
  const [fileData, setFileData] = useState<FileContent | null>(null)

  useEffect(() => {
    if (!fileId) return
    let cancelled = false
    api
      .getFile(fileId)
      .then((data) => {
        if (!cancelled) setFileData(data as FileContent)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [fileId])

  if (!fileId) return null

  const renderContent = () => {
    if (!fileData) {
      return <p className="text-muted-foreground text-sm">Loading...</p>
    }

    const type = fileData.filetype

    if (type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center">
          <img
            src={fileData.url}
            alt={fileData.filename}
            className="max-h-[60vh] max-w-full rounded object-contain"
          />
        </div>
      )
    }

    if (type === 'application/pdf') {
      return (
        <iframe
          src={fileData.url}
          className="h-[60vh] w-full rounded border-0"
          title={fileData.filename}
        />
      )
    }

    if (type === 'text/plain' || type === 'text/markdown') {
      return (
        <ScrollArea className="border-border bg-muted h-[60vh] rounded border p-4">
          <pre className="font-mono text-sm whitespace-pre-wrap">{fileData.content ?? ''}</pre>
        </ScrollArea>
      )
    }

    return (
      <div className="flex h-[30vh] items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Preview not available for {fileData.filetype} files
        </p>
      </div>
    )
  }

  return (
    <Dialog open={!!fileId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-3xl flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="truncate text-base">
            {fileData?.filename ?? 'Loading...'}
          </DialogTitle>
          {fileData && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                const a = document.createElement('a')
                a.href = fileData.url
                a.download = fileData.filename
                a.click()
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-auto">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  )
}
