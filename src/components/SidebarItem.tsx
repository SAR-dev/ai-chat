import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatSessionSummary } from '@/types'

interface SidebarItemProps {
  session: ChatSessionSummary
  isActive: boolean
  onSelect: () => void
  onRename?: (title: string) => Promise<void>
  onDelete: () => Promise<void>
}

export default function SidebarItem({
  session,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: SidebarItemProps) {
  const { t } = useTranslation()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [editTitle, setEditTitle] = useState(session.title)

  const handleRename = async () => {
    if (editTitle.trim() && editTitle !== session.title && onRename) {
      await onRename(editTitle.trim())
    }
    setIsRenameOpen(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete()
    setIsDeleting(false)
  }

  const openRenameDialog = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditTitle(session.title)
    setIsRenameOpen(true)
  }

  return (
    <>
      <div
        className={cn(
          'group flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-sm transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
        )}
        onClick={onSelect}
      >
        <span className="flex-1 truncate">{session.title}</span>
        <div className="invisible flex items-center gap-0.5 group-hover:visible">
          {onRename && (
            <Button variant="ghost" size="icon-sm" onClick={openRenameDialog}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()} />
              }
            >
              <Trash2 className="h-3 w-3" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <img
                src="/mascot/alert.png"
                alt=""
                className="mx-auto h-20 w-20 object-contain"
                aria-hidden
              />
              <AlertDialogHeader>
                <AlertDialogTitle>{t('sidebar.deleteConfirm')}</AlertDialogTitle>
                <AlertDialogDescription>{t('sidebar.deleteDescription')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('sidebar.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {t('sidebar.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {onRename && <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('sidebar.renameConversation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              {t('sidebar.currentName')}{' '}
              <span className="text-foreground font-medium">{session.title}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="rename-conversation-input">{t('sidebar.newName')}</Label>
              <Input
                id="rename-conversation-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
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
      </Dialog>}
    </>
  )
}
