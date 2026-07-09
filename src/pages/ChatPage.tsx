import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ChatWindow from '@/components/ChatWindow'
import ChatHeader from '@/components/ChatHeader'
import ChatInput from '@/components/ChatInput'
import { useChatStore } from '@/stores/chatStore'
import { cn } from '@/lib/utils'
import { FileText, Code, Lightbulb, Pen, Loader2, type LucideIcon } from 'lucide-react'

interface Suggestion {
  key: string
  icon: LucideIcon
  prompt: string
}

const SUGGESTIONS: Suggestion[] = [
  { key: 'summarize', icon: FileText, prompt: 'chat.homeSuggestionSummarize' },
  { key: 'explain', icon: Lightbulb, prompt: 'chat.homeSuggestionExplain' },
  { key: 'draft', icon: Pen, prompt: 'chat.homeSuggestionDraft' },
  { key: 'code', icon: Code, prompt: 'chat.homeSuggestionCode' },
]

export default function ChatPage() {
  const { sessionId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sendChatMessage = useChatStore((s) => s.sendChatMessage)
  // A new chat's messages live under the '__new__' key until the backend
  // hands back a real session id. As soon as that happens the store migrates
  // them and we navigate away, so this flag -- true from the moment ANY
  // message (typed or a suggestion) is submitted from this page -- covers
  // the exact window we need a loading state for.
  const isSendingNewChat = useChatStore(
    (s) => s.isStreaming && (s.messagesBySessionId['__new__']?.length ?? 0) > 0,
  )

  const handleSuggestion = useCallback(
    async (prompt: string) => {
      if (isSendingNewChat) return
      await sendChatMessage(null, prompt, undefined, (id) => {
        navigate(`/chat/${id}`)
      })
    },
    [sendChatMessage, navigate, isSendingNewChat],
  )

  if (!sessionId) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-8 px-4 text-center">
        <div
          className={cn(
            'flex flex-col items-center gap-3 transition-opacity',
            isSendingNewChat && 'opacity-40',
          )}
        >
          <img
            src="/vectors/victory-pose.svg"
            alt=""
            className="h-24 w-24 object-contain"
            aria-hidden
          />
          <h1 className="text-2xl font-medium tracking-tight">{t('chat.homeGreeting')}</h1>
          <p className="text-muted-foreground max-w-sm text-sm">{t('chat.homeSubtitle')}</p>
        </div>

        <div className="w-full">
          <ChatInput variant="hero" />
        </div>

        <div
          className={cn(
            'flex w-full max-w-2xl flex-wrap items-center justify-center gap-2 transition-opacity',
            isSendingNewChat && 'opacity-40',
          )}
        >
          {SUGGESTIONS.map(({ key, icon: SuggestionIcon, prompt }) => (
            <button
              key={key}
              type="button"
              disabled={isSendingNewChat}
              onClick={() => handleSuggestion(t(prompt))}
              className="border-border bg-card text-foreground/80 hover:border-primary/40 hover:text-foreground flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50"
            >
              <SuggestionIcon className="h-3.5 w-3.5" />
              {t(prompt)}
            </button>
          ))}
        </div>

        {isSendingNewChat && (
          <div
            role="status"
            aria-live="polite"
            className="bg-background/70 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 backdrop-blur-[1px]"
          >
            <Loader2 className="text-primary h-6 w-6 animate-spin" />
            <p className="text-muted-foreground text-sm">{t('chat.startingChat')}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <ChatHeader sessionId={sessionId} />
      <ChatWindow sessionId={sessionId} />
      <ChatInput sessionId={sessionId} />
    </div>
  )
}
