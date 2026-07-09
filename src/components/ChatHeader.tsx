import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/stores/chatStore'

interface ChatHeaderProps {
  sessionId: string
}

export default function ChatHeader({ sessionId }: ChatHeaderProps) {
  const { t } = useTranslation()
  const title = useChatStore((s) => s.sessions.find((sess) => sess.id == sessionId)?.title)
  const displayTitle = title || t('sidebar.newChat')

  return (
    <div className="border-border bg-background/80 flex h-14 shrink-0 items-center gap-1.5 border-b pr-4 pl-14 backdrop-blur-sm sm:pr-6 md:pl-6">
      <h1 className="text-foreground/90 truncate text-sm font-medium">{displayTitle}</h1>
    </div>
  )
}
