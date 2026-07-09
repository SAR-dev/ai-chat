import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Building2, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import LoginGraphicPanel from '@/components/LoginGraphicPanel'
import BrandMark from '@/components/BrandMark'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import i18n from '@/lib/i18n'

const loginSchema = z.object({
  username: z.string().min(1, 'login.usernameRequired'),
  password: z.string().min(1, 'login.passwordRequired'),
})

type LoginForm = z.infer<typeof loginSchema>

type LoginMode = 'ad' | 'standard'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const settingsLanguage = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  const [mode, setMode] = useState<LoginMode>('ad')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [language, setLocalLanguage] = useState(settingsLanguage)

  const handleLanguageChange = (value: string) => {
    setLocalLanguage(value)
    setLanguage(value)
    i18n.changeLanguage(value)
  }

  const isAd = mode == 'ad'

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data.username, data.password, isAd)
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

      <div className="flex w-full flex-col items-center justify-center px-4 py-10 sm:py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <BrandMark className="h-10 w-10" />
            <span className="text-foreground text-sm font-semibold">{t('app.name')}</span>
          </div>

          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <span className="border-accent text-accent-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
              <Building2 className="h-3.5 w-3.5" />
              {t('login.internalNotice')}
            </span>
            <div className="space-y-1.5">
              <h1 className="text-xl font-medium tracking-tight sm:text-2xl">
                {t(isAd ? 'login.titleAd' : 'login.title')}
              </h1>

              <p className="text-muted-foreground/80 text-sm">
                {t(isAd ? 'login.descriptionAd' : 'login.kiwiHint')}
              </p>
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
                  autoFocus
                  autoComplete="username"
                  placeholder={isAd ? t('login.adDomainHint') : t('login.usernamePlaceholder')}
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
                    autoComplete="current-password"
                    className="h-11 rounded-xl px-4 pr-11"
                    {...loginForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3.5 -translate-y-1/2"
                    tabIndex={-1}
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading
                  ? isAd
                    ? t('login.loggingInAd')
                    : t('login.loggingIn')
                  : isAd
                    ? t('login.signInAd')
                    : t('login.signIn')}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode(isAd ? 'standard' : 'ad')}
                className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2 transition-colors"
              >
                {isAd ? t('login.loginWithUsername') : t('login.backToAd')}
              </button>
            </div>
          </div>

          <p className="text-muted-foreground/70 mt-4 text-center text-xs">
            {t('login.contactAdmin')}
          </p>

          <div className="mt-6 flex justify-center">
            <div className="bg-muted inline-flex rounded-md p-0.5">
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  language == 'en'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('ja')}
                className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  language == 'ja'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                JA
              </button>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground/50 mt-8 text-center text-[11px]">
          {t('login.footerRights', { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  )
}
