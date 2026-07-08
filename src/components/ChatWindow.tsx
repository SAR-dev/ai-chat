import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import ChatMessage from '@/components/ChatMessage'
import TypingIndicator from '@/components/TypingIndicator'
import { useChatStore } from '@/stores/chatStore'

interface ChatWindowProps {
  sessionId: string
}

export default function ChatWindow({ sessionId }: ChatWindowProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  const messages = useChatStore((s) => s.messagesBySessionId[sessionId]) ?? []
  const messagesStatus = useChatStore((s) => s.messagesStatus)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const streamingContent = useChatStore((s) => s.streamingContent)
  const loadMessages = useChatStore((s) => s.loadMessages)

  useEffect(() => {
    loadMessages(sessionId)
  }, [sessionId, loadMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isStreaming, streamingContent])

  if (messagesStatus === 'loading') {
    return (
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-border space-y-2 border-l-2 pl-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">{t('chat.emptyConversation')}</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="py-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isStreaming && (
          <ChatMessage
            message={{
              id: 'streaming',
              sessionId,
              role: 'assistant',
              content: '',
              timestamp: new Date().toISOString(),
            }}
            isStreaming
            streamingContent={streamingContent}
          />
        )}
        {isStreaming && streamingContent === '' && <TypingIndicator />}
      </div>
    </ScrollArea>
  )
}
