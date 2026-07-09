import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import ArtifactRenderer from '@/components/ArtifactRenderer'
import ImageGenLoading from '@/components/ImageGenLoading'
import ImageZoomModal from '@/components/ImageZoomModal'
import SlideDeckView from '@/components/SlideDeckView'
import SlidePipelineStepper from '@/components/SlidePipelineStepper'
import SlideGenLoading from '@/components/SlideGenLoading'
import type { MessageState } from '@/types'
import { cn } from '@/lib/utils'
import { Copy, Pencil, RefreshCw, ThumbsUp, ThumbsDown, Download } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import * as api from '@/lib/apiClient'
import { toast } from 'sonner'

interface ChatMessageProps {
  message: MessageState
  sessionId: string
  isStreaming?: boolean
  streamingContent?: string
}

export default function ChatMessage({
  message,
  sessionId,
  isStreaming,
  streamingContent,
}: ChatMessageProps) {
  const { t } = useTranslation()
  const isUser = message.type == 'right'
  const displayContent = isStreaming ? (streamingContent ?? '') : message.content
  const [isEditing, setIsEditing] = useState(false)

  const contentToRender = displayContent

  const [zoomIndex, setZoomIndex] = useState<number | null>(null)
  const [editContent, setEditContent] = useState(message.content)
  const editAndResend = useChatStore((s) => s.editAndResend)
  const regenerateMessage = useChatStore((s) => s.regenerateMessage)
  const submitFeedback = useChatStore((s) => s.submitFeedback)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    toast.success(t('chat.copied'))
  }

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== message.content && message.dbId) {
      await editAndResend(sessionId, message.dbId, editContent)
    }
    setIsEditing(false)
  }

  const handleRegenerate = async () => {
    if (message.assistantMessageId) {
      await regenerateMessage(sessionId, message.assistantMessageId)
    }
  }

  const handleDownload = async () => {
    try {
      const blob = await api.downloadChat({
        content: message.content,
        format: 'docx',
        filename: `message-${message.uuid.slice(0, 8)}.docx`,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `message-${message.uuid.slice(0, 8)}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      const blob = new Blob([message.content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `message-${message.uuid.slice(0, 8)}.md`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleFeedback = (isHelpful: boolean) => {
    const newValue = message.is_helpful == isHelpful ? null : isHelpful
    if (message.assistantMessageId) {
      submitFeedback(message.assistantMessageId, newValue)
    }
  }

  return (
    <div className={cn('group px-4 py-3 sm:px-6', isUser && 'flex justify-end')}>
      <div className={cn('min-w-0', isUser ? 'max-w-[80%]' : 'w-full')}>
        {message.cancelled && (
          <div className="text-muted-foreground mb-2 text-xs italic">Request cancelled</div>
        )}

        {message.agentTools.length > 0 && (
          <div className="border-border bg-accent/30 mb-3 rounded-xl border p-3">
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                Agent activity ({message.agentTools.length} tools)
              </summary>
              <div className="mt-2 space-y-1">
                {message.agentTools.map((tool) => (
                  <span
                    key={tool}
                    className="bg-accent text-accent-foreground mr-1 inline-block rounded px-1.5 py-0.5 text-xs"
                  >
                    {tool == 'rag_search' && '🔍 RAG Search'}
                    {tool == 'web_search' && '🌐 Web Search'}
                    {tool == 'company_kb_search' && '📚 Company KB Search'}
                    {tool !== 'rag_search' &&
                      tool !== 'web_search' &&
                      tool !== 'company_kb_search' &&
                      `🧰 Tool: ${tool}`}
                  </span>
                ))}
                {message.agentReasoning && (
                  <p className="text-muted-foreground mt-1 text-xs">{message.agentReasoning}</p>
                )}
              </div>
            </details>
          </div>
        )}

        {message.imageStatus && <ImageGenLoading status={message.imageStatus} />}

        {message.images.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setZoomIndex(i)}
                className="cursor-zoom-in overflow-hidden rounded-xl transition-transform hover:scale-[1.02]"
              >
                <img
                  src={img.b64}
                  alt={img.caption ?? ''}
                  className="max-h-48 rounded-xl object-contain shadow-sm"
                />
              </button>
            ))}
          </div>
        )}

        {zoomIndex !== null && (
          <ImageZoomModal
            images={message.images}
            index={zoomIndex}
            onOpenChange={(open) => !open && setZoomIndex(null)}
          />
        )}

        {isEditing ? (
          <div className="border-border bg-card focus-within:border-primary/60 focus-within:ring-primary/15 flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-all focus-within:ring-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key == 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEdit()
                }
                if (e.key == 'Escape') setIsEditing(false)
              }}
              autoFocus
              className="max-h-[45vh] min-h-20 resize-none overflow-y-auto border-0 bg-transparent shadow-none ring-0 outline-none focus-visible:ring-0"
            />
            <div className="flex justify-end gap-1 px-2 pb-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                {t('sidebar.cancel')}
              </Button>
              <Button variant="default" size="sm" onClick={handleEdit}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        ) : isUser ? (
          <div className="bg-secondary text-secondary-foreground min-w-0 rounded-2xl px-4 py-2.5 break-words">
            <MarkdownRenderer
              content={displayContent}
              sources={!isUser ? message.sources : undefined}
            />
          </div>
        ) : (
          <div className="min-w-0 break-words">
            <MarkdownRenderer content={contentToRender} sources={message.sources} />

            {message.sources.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-muted-foreground text-xs font-medium">Sources:</p>
                <ol className="list-inside list-decimal space-y-0.5 text-xs">
                  {message.sources.map((source) => (
                    <li key={source.index}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {message.artifacts.length > 0 && (
              <div className="mt-3 space-y-4">
                {message.artifacts.map((artifact, i) => (
                  <ArtifactRenderer key={i} artifact={artifact} />
                ))}
              </div>
            )}

            {message.slideStatus && <SlideGenLoading status={message.slideStatus} />}

            {Object.keys(message.slideStages).length > 0 && (
              <SlidePipelineStepper stages={message.slideStages} />
            )}

            {message.slides.length > 0 &&
              message.slides.map((deck, i) => <SlideDeckView key={i} deck={deck} />)}
          </div>
        )}

        {!isStreaming && !isEditing && !message.cancelled && (
          <div
            className={cn(
              'mt-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100',
              isUser && 'justify-end',
            )}
          >
            <Tooltip>
              <TooltipTrigger
                render={<Button variant="ghost" size="icon-xs" />}
                onClick={handleCopy}
              >
                <Copy className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent>{t('chat.copy')}</TooltipContent>
            </Tooltip>

            {isUser && (
              <Tooltip>
                <TooltipTrigger
                  render={<Button variant="ghost" size="icon-xs" />}
                  onClick={() => {
                    setEditContent(message.content)
                    setIsEditing(true)
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>{t('chat.edit')}</TooltipContent>
              </Tooltip>
            )}

            {!isUser && message.assistantMessageId && (
              <Tooltip>
                <TooltipTrigger
                  render={<Button variant="ghost" size="icon-xs" />}
                  onClick={handleRegenerate}
                >
                  <RefreshCw className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>{t('chat.regenerate')}</TooltipContent>
              </Tooltip>
            )}

            {message.isRagMessage && message.assistantMessageId && (
              <>
                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="ghost" size="icon-xs" />}
                    onClick={() => handleFeedback(true)}
                  >
                    <ThumbsUp
                      className={cn('h-3 w-3', message.is_helpful == true && 'text-primary')}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{t('chat.feedbackHelpful')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="ghost" size="icon-xs" />}
                    onClick={() => handleFeedback(false)}
                  >
                    <ThumbsDown
                      className={cn('h-3 w-3', message.is_helpful == false && 'text-destructive')}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{t('chat.feedbackNotHelpful')}</TooltipContent>
                </Tooltip>
              </>
            )}

            <Tooltip>
              <TooltipTrigger
                render={<Button variant="ghost" size="icon-xs" />}
                onClick={handleDownload}
              >
                <Download className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent>{t('chat.download')}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  )
}
