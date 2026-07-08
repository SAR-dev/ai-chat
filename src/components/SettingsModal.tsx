import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import i18n from '@/lib/i18n'
import { ArrowCounterClockwise, SignOut } from '@phosphor-icons/react'

const defaults = {
  language: 'en',
  temperature: 0.7,
}

const settingsSchema = z.object({
  language: z.string(),
  temperature: z.number().min(0).max(2),
})

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const settings = useSettingsStore()

  const { setValue, watch } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      language: settings.language,
      temperature: settings.temperature,
    },
  })

  const currentLang = watch('language')
  const currentTemp = watch('temperature')

  const handleLanguageChange = (value: string | null) => {
    if (!value) return
    setValue('language', value)
    settings.setLanguage(value)
    i18n.changeLanguage(value)
    toast.success(t('settings.saved'))
  }

  const handleTemperatureChange = (value: number | readonly number[]) => {
    const temp = Array.isArray(value) ? value[0] : value
    setValue('temperature', temp)
    settings.setTemperature(temp)
  }

  const handleReset = () => {
    settings.resetDefaults()
    setValue('language', defaults.language)
    setValue('temperature', defaults.temperature)
    i18n.changeLanguage(defaults.language)
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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('settings.languageEn')}</SelectItem>
                <SelectItem value="ja">{t('settings.languageJa')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {t('settings.temperature')}: {currentTemp.toFixed(1)}
            </Label>
            <Slider
              value={currentTemp}
              onValueChange={handleTemperatureChange}
              min={0}
              max={2}
              step={0.1}
            />
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={handleReset}>
            <ArrowCounterClockwise className="h-4 w-4" />
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
            <SignOut className="h-4 w-4" />
            {t('login.logout')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
