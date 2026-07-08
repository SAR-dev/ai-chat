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
import { PencilSimple, Trash } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { ChatSession } from '@/types'

interface SidebarItemProps {
  session: ChatSession
  isActive: boolean
  onSelect: () => void
  onRename: (title: string) => Promise<void>
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
    if (editTitle.trim() && editTitle !== session.title) {
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
          <Button variant="ghost" size="icon-sm" onClick={openRenameDialog}>
            <PencilSimple className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()} />
              }
            >
              <Trash className="h-3 w-3" />
            </AlertDialogTrigger>
            <AlertDialogContent>
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

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Current name: <span className="text-foreground font-medium">{session.title}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="rename-conversation-input">New name</Label>
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
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!editTitle.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
