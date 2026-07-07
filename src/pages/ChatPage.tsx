import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ChatWindow from '@/components/ChatWindow'
import ChatInput from '@/components/ChatInput'

export default function ChatPage() {
  const { sessionId } = useParams()
  const { t } = useTranslation()

  if (!sessionId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t('chat.emptyState')}</p>
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
