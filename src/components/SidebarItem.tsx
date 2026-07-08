import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
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
import { Pin, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatSessionSummary } from '@/types'

interface SidebarItemProps {
  session: ChatSessionSummary
  isActive: boolean
  onSelect: () => void
  onDelete: () => Promise<void>
  onPinToggle?: () => void
}

export default function SidebarItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onPinToggle,
}: SidebarItemProps) {
  const { t } = useTranslation()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete()
    setIsDeleting(false)
  }

  return (
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
      {session.pinned && (
        <Pin className="text-muted-foreground/40 h-3 w-3 shrink-0" />
      )}
      <div className="invisible flex items-center gap-0.5 group-hover:visible">
        {onPinToggle && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); onPinToggle() }}
            title={session.pinned ? t('sidebar.unpin') : t('sidebar.pin')}
          >
            <Pin className={cn('h-3 w-3', session.pinned && 'fill-current')} />
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
  )
}
