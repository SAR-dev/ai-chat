import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Copy, Download, FileCode } from '@phosphor-icons/react'
import type { Artifact } from '@/types'

interface ArtifactPanelProps {
  artifact: Artifact | null
  onClose: () => void
}

export default function ArtifactPanel({ artifact, onClose }: ArtifactPanelProps) {
  if (!artifact) return null

  return (
    <Dialog open={!!artifact} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[80vh] max-w-4xl flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            {artifact.title}
            {artifact.language && (
              <span className="text-muted-foreground text-sm font-normal">{artifact.language}</span>
            )}
          </DialogTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => navigator.clipboard.writeText(artifact.content)}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                const blob = new Blob([artifact.content], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${artifact.title}.${artifact.language ?? 'txt'}`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </DialogHeader>
        <Tabs defaultValue="code" className="flex flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="code">Code</TabsTrigger>
            {(artifact.type === 'html' || artifact.type === 'svg') && (
              <TabsTrigger value="preview">Preview</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="code" className="mt-2 flex-1 p-0">
            <ScrollArea className="border-border bg-muted h-full rounded-lg border">
              <pre className="p-4 font-mono text-sm">
                <code>{artifact.content}</code>
              </pre>
            </ScrollArea>
          </TabsContent>
          {(artifact.type === 'html' || artifact.type === 'svg') && (
            <TabsContent value="preview" className="mt-2 flex-1">
              <iframe
                srcDoc={
                  artifact.type === 'svg'
                    ? `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh">${artifact.content}</body></html>`
                    : artifact.content
                }
                className="h-full w-full rounded-lg border-0"
                sandbox="allow-scripts"
                title="Artifact preview"
              />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
