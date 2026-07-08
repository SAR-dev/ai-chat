import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import SidebarItem from '@/components/SidebarItem'
import SettingsModal from '@/components/SettingsModal'
import SearchModal from '@/components/SearchModal'
import BrandMark from '@/components/BrandMark'
import { useChatStore } from '@/stores/chatStore'
import { Plus, Search, PanelLeftClose } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatSidebarProps {
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

export default function ChatSidebar({ collapsed = false, onToggleCollapsed }: ChatSidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const activeId = useChatStore((s) => s.activeSessionId)
  const setActiveSession = useChatStore((s) => s.setActiveSession)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const sessions = useChatStore((s) => s.sessions)
  const sessionsStatus = useChatStore((s) => s.sessionsStatus)
  const loadSessions = useChatStore((s) => s.loadSessions)
  const createSession = useChatStore((s) => s.createSession)
  const deleteSession = useChatStore((s) => s.deleteSession)
  const renameSession = useChatStore((s) => s.renameSession)
  const togglePinSession = useChatStore((s) => s.togglePinSession)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleNewChat = useCallback(async () => {
    const session = await createSession()
    navigate(`/chat/${session.id}`)
  }, [createSession, navigate])

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
              <PanelLeftClose className="h-4 w-4" />
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
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-none"
                />
              }
              onClick={handleNewChat}
            >
              <Plus className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent side="right">{t('sidebar.newChat')}</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-full justify-start gap-2 rounded-xl border-none bg-transparent shadow-none hover:bg-white/60"
            onClick={handleNewChat}
          >
            <Plus className="h-4 w-4" />
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
                  className="text-muted-foreground h-9 w-9 rounded-xl"
                />
              }
              onClick={() => setSearchOpen(true)}
            >
<Search className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent side="right">{t('sidebar.search')}</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-9 w-full justify-start gap-2 rounded-xl"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            {t('sidebar.search')}
            <span className="border-border text-muted-foreground/70 ml-auto hidden rounded-md border px-1 text-[10px] sm:inline">
              &#8984;K
            </span>
          </Button>
        )}
      </div>

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
            <div className="pb-2">
              {(() => {
                const pinned = sessions.filter((s) => s.pinned)
                const unpinned = sessions.filter((s) => !s.pinned)
                return (
                  <>
                    {pinned.length > 0 && (
                      <>
                        <div className="text-muted-foreground/60 px-4 pt-2 pb-1 text-xs font-medium">
                          {t('sidebar.pinned')}
                        </div>
                        <div className="space-y-0.5">
                          {pinned.map((session) => (
                            <SidebarItem
                              key={session.id}
                              session={session}
                              isActive={session.id === activeId}
                              onSelect={() => {
                                setActiveSession(session.id)
                                navigate(`/chat/${session.id}`)
                              }}
                              onDelete={() => handleDelete(session.id)}
                              onRename={(newTitle) => renameSession(session.id, newTitle)}
                              onPinToggle={() => togglePinSession(session.id)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    <div className="text-muted-foreground/60 px-4 pt-2 pb-1 text-xs font-medium">
                      {t('sidebar.recent')}
                    </div>
                    <div className="space-y-0.5">
                      {unpinned.map((session) => (
                        <SidebarItem
                          key={session.id}
                          session={session}
                          isActive={session.id === activeId}
                          onSelect={() => {
                            setActiveSession(session.id)
                            navigate(`/chat/${session.id}`)
                          }}
                          onDelete={() => handleDelete(session.id)}
                          onRename={(newTitle) => renameSession(session.id, newTitle)}
                          onPinToggle={() => togglePinSession(session.id)}
                        />
                      ))}
                    </div>
                  </>
                )
              })()}
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
                    {(user.display_name ?? user.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">{user.display_name ?? user.username}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3 px-2 py-1.5">
              <Avatar size="sm">
                <AvatarFallback className="bg-accent text-accent-foreground font-mono">
                  {(user.display_name ?? user.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col">
                <span className="text-sidebar-foreground text-sm font-medium">{user.display_name ?? user.username}</span>
                <span className="text-sidebar-foreground/50 text-xs">@{user.username}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-sidebar-foreground/70 shrink-0"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          ))}
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
