import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface ChatHeaderProps {
  sessionId: string
}

/**
 * Sits above the message list (outside the scroll area) so the topic stays
 * visible at all times, not just while at the top of the conversation. Left
 * padding on small screens clears the fixed hamburger button from
 * AppLayout so the title never sits under it.
 *
 * The pencil opens the same rename dialog used in the sidebar (SidebarItem),
 * so renaming a conversation looks and behaves the same everywhere.
 */
export default function ChatHeader({ sessionId }: ChatHeaderProps) {
  const { t } = useTranslation()
  const title = useChatStore((s) => s.sessions.find((sess) => sess.id === sessionId)?.title)
  const renameSession = useChatStore((s) => s.renameSession)

  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [editTitle, setEditTitle] = useState(title ?? '')

  const displayTitle = title || t('sidebar.newChat')

  const openRenameDialog = () => {
    setEditTitle(title ?? '')
    setIsRenameOpen(true)
  }

  const handleRename = async () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== title) {
      await renameSession(sessionId, trimmed)
    }
    setIsRenameOpen(false)
  }

  return (
    <>
      <div className="border-border bg-background/80 flex h-14 shrink-0 items-center gap-1.5 border-b pr-4 pl-14 backdrop-blur-sm sm:pr-6 md:pl-6">
        <button
          type="button"
          onClick={openRenameDialog}
          className="group/title flex min-w-0 items-center gap-1.5 text-left"
        >
          <h1 className="text-foreground/90 truncate text-sm font-medium">{displayTitle}</h1>
          <Pencil className="text-muted-foreground h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover/title:opacity-100" />
        </button>
      </div>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('sidebar.renameConversation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              {t('sidebar.currentName')}{' '}
              <span className="text-foreground font-medium">{displayTitle}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="rename-conversation-nav-input">{t('sidebar.newName')}</Label>
              <Input
                id="rename-conversation-nav-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                maxLength={200}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') setIsRenameOpen(false)
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              {t('sidebar.cancel')}
            </Button>
            <Button onClick={handleRename} disabled={!editTitle.trim()}>
              {t('sidebar.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
