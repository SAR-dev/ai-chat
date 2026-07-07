import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  User,
  Robot,
  Copy,
  PencilSimple,
  ArrowClockwise,
  ThumbsUp,
  ThumbsDown,
  Download,
  Check,
  X,
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
    <div className={cn('group flex gap-3 px-4 py-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Robot className="h-4 w-4" weight="fill" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('max-w-[80%] space-y-2', isUser && 'flex flex-col items-end')}>
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-20"
              autoFocus
            />
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-xs" onClick={() => setIsEditing(false)}>
                <X className="h-3 w-3" />
              </Button>
              <Button variant="default" size="icon-xs" onClick={handleEdit}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'rounded-lg px-4 py-2',
                isUser
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-card-foreground border-border border',
              )}
            >
              <MarkdownRenderer content={displayContent} />
              {isStreaming && streamingContent === '' && (
                <span className="inline-block h-4 w-2 animate-pulse bg-current" />
              )}
            </div>
            {message.artifacts?.map((artifact) => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                onOpenArtifact={() => onOpenArtifact?.(artifact.id)}
              />
            ))}
          </>
        )}

        {!isStreaming && !isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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

      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User className="h-4 w-4" weight="fill" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
