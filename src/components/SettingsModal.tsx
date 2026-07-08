import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import i18n from '@/lib/i18n'
import { RotateCcw, LogOut } from 'lucide-react'

const settingsSchema = z.object({
  language: z.string(),
})

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const settingsLanguage = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  const resetDefaults = useSettingsStore((s) => s.resetDefaults)

  const { setValue, watch } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      language: settingsLanguage,
    },
  })

  const currentLang = watch('language')

  const handleLanguageChange = (value: string | null) => {
    if (!value) return
    setValue('language', value)
    setLanguage(value)
    i18n.changeLanguage(value)
    toast.success(t('settings.saved'))
  }

  const handleReset = () => {
    resetDefaults()
    setValue('language', 'en')
    i18n.changeLanguage('en')
    toast.success(t('settings.saved'))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>
        {user && (
          <div className="flex items-center gap-3 border-b pb-4">
            <Avatar>
              <AvatarFallback>{(user.display_name ?? user.username).charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.display_name ?? user.username}</span>
              <span className="text-muted-foreground text-xs">@{user.username}</span>
            </div>
          </div>
        )}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>{t('settings.model')}</Label>
            <div className="border-border bg-muted/50 text-foreground/90 flex h-9 items-center rounded-md border px-3 text-sm">
              {t('app.model')}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('settings.language')}</Label>
            <Select value={currentLang} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-full">
                <span>{currentLang === 'en' ? t('settings.languageEn') : t('settings.languageJa')}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('settings.languageEn')}</SelectItem>
                <SelectItem value="ja">{t('settings.languageJa')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            {t('settings.resetDefaults')}
          </Button>

          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
          >
            <LogOut className="h-4 w-4" />
            {t('login.logout')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
