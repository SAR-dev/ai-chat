import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import SidebarItem from '@/components/SidebarItem'
import SettingsModal from '@/components/SettingsModal'
import { useChatStore } from '@/stores/chatStore'
import { Plus, MagnifyingGlass } from '@phosphor-icons/react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useAuthStore } from '@/stores/authStore'
import { Gear } from '@phosphor-icons/react'

export default function ChatSidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { sessionId: activeId } = useParams()
  const [commandOpen, setCommandOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { sessions, sessionsStatus, loadSessions, createSession, renameSession, deleteSession } =
    useChatStore()
  const { user } = useAuthStore()

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleNewChat = useCallback(async () => {
    const session = await createSession()
    navigate(`/chat/${session.id}`)
  }, [createSession, navigate])

  const handleRename = useCallback(
    async (id: string, title: string) => {
      await renameSession(id, title)
    },
    [renameSession],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteSession(id)
      if (activeId === id) {
        navigate('/chat')
      }
    },
    [deleteSession, activeId, navigate],
  )

  return (
    <div className="bg-sidebar flex h-full flex-col">
      <div className="border-sidebar-border flex items-center justify-between border-b p-4">
        <h2 className="text-sidebar-foreground font-semibold">{t('app.name')}</h2>
      </div>
      <div className="flex flex-col gap-2 p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleNewChat}
        >
          <Plus weight="bold" className="h-4 w-4" />
          {t('sidebar.newChat')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground w-full justify-start gap-2"
          onClick={() => setCommandOpen(true)}
        >
          <MagnifyingGlass className="h-4 w-4" />
          {t('sidebar.search')}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        {sessionsStatus === 'loading' ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sidebar-foreground/60 px-2 py-4 text-center text-sm">
            {t('sidebar.noConversations')}
          </p>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <SidebarItem
                key={session.id}
                session={session}
                isActive={session.id === activeId}
                onSelect={() => navigate(`/chat/${session.id}`)}
                onRename={(title) => handleRename(session.id, title)}
                onDelete={() => handleDelete(session.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="border-sidebar-border border-t p-3">
        {user && (
          <div className="flex items-center gap-3 px-2 py-1.5">
            <Avatar size="sm">
              <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex flex-col">
              <span className="text-sidebar-foreground text-xs font-medium">{user.name}</span>
              <span className="text-sidebar-foreground/50 text-xs">{user.employeeId}</span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-sidebar-foreground/70 shrink-0"
              onClick={() => setSettingsOpen(true)}
            >
              <Gear className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder={t('sidebar.search')} />
        <CommandList>
          <CommandEmpty>No results found</CommandEmpty>
          <CommandGroup heading="Conversations">
            {sessions.map((session) => (
              <CommandItem
                key={session.id}
                onSelect={() => {
                  navigate(`/chat/${session.id}`)
                  setCommandOpen(false)
                }}
              >
                {session.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}
