import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import ChatMessage from '@/components/ChatMessage'
import TypingIndicator from '@/components/TypingIndicator'
import { useChatScroll } from '@/hooks/useChatScroll'
import { useChatStore } from '@/stores/chatStore'
import { ArrowDown } from 'lucide-react'

interface ChatWindowProps {
  sessionId: string
}

export default function ChatWindow({ sessionId }: ChatWindowProps) {
  const { t } = useTranslation()
  const viewportRef = useRef<HTMLDivElement>(null!)
  const contentRef = useRef<HTMLDivElement>(null!)

  const messages = useChatStore((s) => s.messagesBySessionId[sessionId]) ?? []
  const messagesStatus = useChatStore((s) => s.messagesStatus)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const hasStreamingContent = useChatStore((s) => s.hasStreamingContent)
  const streamingContent = useChatStore((s) => {
    const msgs = s.messagesBySessionId[sessionId] ?? []
    const streamingMsg = msgs.find((m) => m.uuid == s.streamingMessageId)
    return streamingMsg?.content ?? ''
  })
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  const loadMessages = useChatStore((s) => s.loadMessages)

  const { showJumpButton, scrollToBottom } = useChatScroll({
    viewportRef,
    contentRef,
    deps: [messages, isStreaming, streamingContent],
    resetKey: sessionId,
  })

  const setActiveSession = useChatStore((s) => s.setActiveSession)

  useEffect(() => {
    setActiveSession(sessionId)
    // Skip loading when a stream is in progress — the store has already been
    // populated with optimistic + in-flight messages.
    // Also skip when messages already exist to avoid re-fetching after
    // streaming completes, which causes all message keys to change and
    // triggers a full DOM remount (flicker).
    const existing = useChatStore.getState().messagesBySessionId[sessionId]
    if (!isStreaming && (!existing || existing.length === 0)) {
      loadMessages(sessionId)
    }
  }, [sessionId, loadMessages, setActiveSession, isStreaming])

  if (messagesStatus == 'loading') {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 sm:p-6">
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

  if (messages.length == 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <img
          src="/vectors/victory-pose.svg"
          alt=""
          className="h-16 w-16 object-contain"
          aria-hidden
        />
        <p className="text-muted-foreground text-sm">{t('chat.emptyConversation')}</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-0 min-w-0 flex-1">
      <ScrollArea className="h-full" viewportRef={viewportRef}>
        <div ref={contentRef} className="mx-auto max-w-3xl py-4">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.dbId ?? msg.uuid}
              message={msg}
              sessionId={sessionId}
              isStreaming={msg.uuid == streamingMessageId}
              streamingContent={msg.uuid == streamingMessageId ? streamingContent : undefined}
            />
          ))}
          {isStreaming && streamingContent == '' && !hasStreamingContent && <TypingIndicator />}
        </div>
      </ScrollArea>
      {showJumpButton && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 absolute right-4 bottom-4 flex h-8 w-8 items-center justify-center rounded-full shadow-lg transition-all"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
