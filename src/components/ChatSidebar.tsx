import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import SidebarItem from '@/components/SidebarItem'
import SettingsModal from '@/components/SettingsModal'
import BrandMark from '@/components/BrandMark'
import { useChatStore } from '@/stores/chatStore'
import { Plus, MagnifyingGlass, SidebarSimple } from '@phosphor-icons/react'
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
import { cn } from '@/lib/utils'

interface ChatSidebarProps {
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

export default function ChatSidebar({ collapsed = false, onToggleCollapsed }: ChatSidebarProps) {
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
      <div
        className={cn(
          'flex items-center gap-2.5 px-4 py-4',
          collapsed && 'flex-col gap-3 px-0',
        )}
      >
        <BrandMark className="h-6 w-6" />
        {!collapsed && (
          <h2 className="text-sidebar-foreground truncate text-sm font-medium">
            {t('app.name')}
          </h2>
        )}
        {onToggleCollapsed && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={cn('text-sidebar-foreground/70 shrink-0', !collapsed && 'ml-auto')}
                  onClick={onToggleCollapsed}
                />
              }
            >
              <SidebarSimple className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent side={collapsed ? 'right' : 'bottom'}>
              {collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className={cn('flex flex-col gap-1 px-3 pb-2', collapsed && 'items-center px-2')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={<Button variant="outline" size="icon" className="rounded-xl border-none" />}
              onClick={handleNewChat}
            >
              <Plus weight="bold" className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent side="right">{t('sidebar.newChat')}</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 rounded-xl border-none bg-transparent shadow-none hover:bg-white/60 dark:hover:bg-white/5"
            onClick={handleNewChat}
          >
            <Plus weight="bold" className="h-4 w-4" />
            {t('sidebar.newChat')}
          </Button>
        )}

        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground rounded-xl"
                />
              }
              onClick={() => setCommandOpen(true)}
            >
              <MagnifyingGlass className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent side="right">{t('sidebar.search')}</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground w-full justify-start gap-2 rounded-xl"
            onClick={() => setCommandOpen(true)}
          >
            <MagnifyingGlass className="h-4 w-4" />
            {t('sidebar.search')}
            <span className="border-border text-muted-foreground/70 ml-auto hidden rounded-md border px-1 text-[10px] sm:inline">
              &#8984;K
            </span>
          </Button>
        )}
      </div>

      {!collapsed && (
        <div className="text-muted-foreground/60 px-4 pt-2 pb-1 text-xs font-medium">
          {t('sidebar.recent')}
        </div>
      )}

      {!collapsed && (
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
            <div className="space-y-0.5 pb-2">
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
      )}
      {collapsed && <div className="flex-1" />}

      <div className={cn('border-sidebar-border border-t p-3', collapsed && 'flex justify-center')}>
        {user &&
          (collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="flex flex-col items-center gap-1"
                    onClick={() => setSettingsOpen(true)}
                  />
                }
              >
                <Avatar size="sm">
                  <AvatarFallback className="bg-accent text-accent-foreground font-mono">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">{user.name}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3 px-2 py-1.5">
              <Avatar size="sm">
                <AvatarFallback className="bg-accent text-accent-foreground font-mono">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col">
                <span className="text-sidebar-foreground text-sm font-medium">{user.name}</span>
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
          ))}
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
