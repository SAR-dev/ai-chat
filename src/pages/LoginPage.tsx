import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

import LoginGraphicPanel from '@/components/LoginGraphicPanel'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import i18n from '@/lib/i18n'

const loginSchema = z.object({
  username: z.string().min(1, 'login.usernameRequired'),
  password: z.string().min(1, 'login.passwordRequired'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const settings = useSettingsStore()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [language, setLanguage] = useState(settings.language)

  const handleLanguageChange = (value: string | null) => {
    if (!value) return
    setLanguage(value)
    settings.setLanguage(value)
    i18n.changeLanguage(value)
  }

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data.username, data.password, false)
      navigate('/chat')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('login.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-background grid min-h-svh lg:grid-cols-2">
      <LoginGraphicPanel />

      <div className="flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
            <div className="space-y-1.5">
              <h1 className="text-xl font-medium tracking-tight">
                {t('login.title')}
              </h1>

              <p className="text-muted-foreground/80 text-sm">{t('login.kiwiHint')}</p>
            </div>
          </div>

          <div className="border-border bg-card rounded-2xl border p-6 shadow-sm sm:p-7">
            <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-foreground/80 text-sm font-normal">
                  {t('login.username')}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t('login.usernamePlaceholder')}
                  className="h-11 rounded-xl px-4"
                  {...loginForm.register('username')}
                />
                {loginForm.formState.errors.username && (
                  <p className="text-destructive text-xs">
                    {t(loginForm.formState.errors.username.message as string)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-foreground/80 text-sm font-normal">
                  {t('login.password')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="h-11 rounded-xl px-4 pr-11"
                    {...loginForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground absolute right-3.5 top-1/2 -translate-y-1/2"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-destructive text-xs">
                    {t(loginForm.formState.errors.password.message as string)}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="h-11 w-full rounded-full text-sm"
                disabled={isLoading}
              >
                {isLoading ? t('login.loggingIn') : t('login.signIn')}
              </Button>
            </form>

          </div>

          <p className="text-muted-foreground/70 mt-4 text-center text-xs">{t('login.contactAdmin')}</p>

          <div className="mt-6 flex justify-center">
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <span>{language === 'en' ? t('settings.languageEn') : t('settings.languageJa')}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('settings.languageEn')}</SelectItem>
                <SelectItem value="ja">{t('settings.languageJa')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-muted-foreground/70 mt-6 text-xs lg:hidden">{t('app.name')}</p>
      </div>


    </div>
  )
}
