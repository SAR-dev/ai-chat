import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ChatWindow from '@/components/ChatWindow'
import ChatInput from '@/components/ChatInput'
import BrandMark from '@/components/BrandMark'
import { useChatStore } from '@/stores/chatStore'
import {
  FileText,
  Code,
  Lightbulb,
  PenNib,
  type Icon,
} from '@phosphor-icons/react'

interface Suggestion {
  key: string
  icon: Icon
  prompt: string
}

const SUGGESTIONS: Suggestion[] = [
  { key: 'summarize', icon: FileText, prompt: 'chat.homeSuggestionSummarize' },
  { key: 'explain', icon: Lightbulb, prompt: 'chat.homeSuggestionExplain' },
  { key: 'draft', icon: PenNib, prompt: 'chat.homeSuggestionDraft' },
  { key: 'code', icon: Code, prompt: 'chat.homeSuggestionCode' },
]

export default function ChatPage() {
  const { sessionId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createSession = useChatStore((s) => s.createSession)
  const sendMessageStreaming = useChatStore((s) => s.sendMessageStreaming)
  const [isStarting, setIsStarting] = useState(false)

  const handleSuggestion = useCallback(
    async (prompt: string) => {
      if (isStarting) return
      setIsStarting(true)
      try {
        const session = await createSession()
        navigate(`/chat/${session.id}`)
        await sendMessageStreaming(session.id, prompt)
      } finally {
        setIsStarting(false)
      }
    },
    [createSession, navigate, sendMessageStreaming, isStarting],
  )

  if (!sessionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="flex flex-col items-center gap-3">
          <BrandMark className="h-10 w-10" />
          <h1 className="text-2xl font-medium tracking-tight">{t('chat.homeGreeting')}</h1>
          <p className="text-muted-foreground max-w-sm text-sm">{t('chat.homeSubtitle')}</p>
        </div>

        <div className="w-full">
          <ChatInput variant="hero" />
        </div>

        <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-2">
          {SUGGESTIONS.map(({ key, icon: SuggestionIcon, prompt }) => (
            <button
              key={key}
              type="button"
              disabled={isStarting}
              onClick={() => handleSuggestion(t(prompt))}
              className="border-border bg-card text-foreground/80 hover:border-primary/40 hover:text-foreground flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50"
            >
              <SuggestionIcon className="h-3.5 w-3.5" />
              {t(prompt)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ChatWindow sessionId={sessionId} />
      <ChatInput sessionId={sessionId} />
    </div>
  )
}
