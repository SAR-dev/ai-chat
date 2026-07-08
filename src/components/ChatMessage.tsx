import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import ArtifactCard from '@/components/ArtifactCard'
import type { ChatMessage as ChatMessageType } from '@/types'
import { cn } from '@/lib/utils'
import {
  Copy,
  PencilSimple,
  ArrowClockwise,
  ThumbsUp,
  ThumbsDown,
  Download,
} from '@phosphor-icons/react'
import { useChatStore } from '@/stores/chatStore'
import { toast } from 'sonner'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
  streamingContent?: string
  onOpenArtifact?: (artifactId: string) => void
}

export default function ChatMessage({
  message,
  isStreaming,
  streamingContent,
  onOpenArtifact,
}: ChatMessageProps) {
  const { t } = useTranslation()
  const isUser = message.role === 'user'
  const displayContent = isStreaming ? (streamingContent ?? '') : message.content
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [feedbackRating, setFeedbackRating] = useState<string | null>(
    message.feedback?.rating ?? null,
  )
  const sendMessage = useChatStore((s) => s.sendMessage)
  const regenerateMessage = useChatStore((s) => s.regenerateMessage)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    toast.success(t('chat.copied'))
  }

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await sendMessage(message.sessionId, editContent)
    }
    setIsEditing(false)
  }

  const handleRegenerate = async () => {
    await regenerateMessage(message.id)
  }

  const handleDownload = () => {
    const blob = new Blob([message.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `message-${message.id.slice(0, 8)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('group px-4 py-3 sm:px-6', isUser && 'flex justify-end')}>
      <div className={cn('min-w-0', isUser ? 'max-w-[80%]' : 'w-full')}>
        {isEditing ? (
          <div className="border-border bg-card focus-within:border-primary/60 focus-within:ring-primary/15 flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-all focus-within:ring-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEdit()
                }
                if (e.key === 'Escape') setIsEditing(false)
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
            <MarkdownRenderer content={displayContent} />
          </div>
        ) : (
          <div className="min-w-0 break-words">
            <MarkdownRenderer content={displayContent} />
            {isStreaming && streamingContent === '' && (
              <span className="bg-primary inline-block h-3.5 w-1.5 animate-pulse rounded-full align-middle" />
            )}
            {message.artifacts?.map((artifact) => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                onOpenArtifact={() => onOpenArtifact?.(artifact.id)}
              />
            ))}
          </div>
        )}

        {!isStreaming && !isEditing && (
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
                  <PencilSimple className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>{t('chat.edit')}</TooltipContent>
              </Tooltip>
            )}

            {!isUser && (
              <Tooltip>
                <TooltipTrigger
                  render={<Button variant="ghost" size="icon-xs" />}
                  onClick={handleRegenerate}
                >
                  <ArrowClockwise className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>{t('chat.regenerate')}</TooltipContent>
              </Tooltip>
            )}

            <Popover>
              <PopoverTrigger render={<Button variant="ghost" size="icon-xs" />}>
                {feedbackRating === 'helpful' ? (
                  <ThumbsUp className="text-primary h-3 w-3" weight="fill" />
                ) : feedbackRating === 'not_helpful' ? (
                  <ThumbsDown className="text-destructive h-3 w-3" weight="fill" />
                ) : (
                  <ThumbsUp className="h-3 w-3" />
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <ToggleGroup
                  value={feedbackRating ? [feedbackRating] : []}
                  onValueChange={(value) => {
                    const newRating = value[value.length - 1] ?? null
                    setFeedbackRating(newRating)
                    if (newRating) {
                      useChatStore
                        .getState()
                        .submitFeedback(message.id, newRating as 'helpful' | 'not_helpful')
                    }
                  }}
                >
                  <ToggleGroupItem value="helpful" aria-label="Helpful">
                    <ThumbsUp className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="not_helpful" aria-label="Not helpful">
                    <ThumbsDown className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </PopoverContent>
            </Popover>

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
