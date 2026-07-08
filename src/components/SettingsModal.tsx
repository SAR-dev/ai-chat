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
import { useTheme } from '@/components/theme-provider'
import i18n from '@/lib/i18n'
import { ArrowCounterClockwise, SignOut } from '@phosphor-icons/react'

const defaults = {
  theme: 'system' as const,
  language: 'en',
  temperature: 0.7,
}

const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
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
  const { setTheme } = useTheme()
  const { user, logout } = useAuthStore()
  const settings = useSettingsStore()

  const { setValue, watch } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      theme: settings.theme,
      language: settings.language,
      temperature: settings.temperature,
    },
  })

  const currentTheme = watch('theme')
  const currentLang = watch('language')
  const currentTemp = watch('temperature')

  const handleThemeChange = (value: string | null) => {
    if (!value) return
    const theme = value as 'light' | 'dark' | 'system'
    setValue('theme', theme)
    settings.setTheme(theme)
    setTheme(theme)
  }

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
    setValue('theme', defaults.theme)
    setValue('language', defaults.language)
    setValue('temperature', defaults.temperature)
    setTheme(defaults.theme)
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
              <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-muted-foreground text-xs">{user.employeeId}</span>
            </div>
          </div>
        )}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>{t('settings.theme')}</Label>
            <Select value={currentTheme} onValueChange={handleThemeChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('settings.themeLight')}</SelectItem>
                <SelectItem value="dark">{t('settings.themeDark')}</SelectItem>
                <SelectItem value="system">{t('settings.themeSystem')}</SelectItem>
              </SelectContent>
            </Select>
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
