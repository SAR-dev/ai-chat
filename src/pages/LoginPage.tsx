import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import BrandMark from '@/components/BrandMark'
import LoginGraphicPanel from '@/components/LoginGraphicPanel'
import { useAuthStore } from '@/stores/authStore'

type LoginMode = 'ad' | 'standard'

const loginSchema = z.object({
  username: z.string().min(1, 'login.usernameRequired'),
  password: z.string().min(1, 'login.passwordRequired'),
})

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'login.usernameInvalid')
    .max(15, 'login.usernameInvalid')
    .regex(/^[a-zA-Z0-9_-]+$/, 'login.usernameInvalid'),
  password: z
    .string()
    .min(8, 'login.passwordInvalid')
    .regex(/(?=.*[a-zA-Z])(?=.*\d)/, 'login.passwordInvalid'),
  email: z.string().email('login.emailInvalid'),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, register: registerUser } = useAuthStore()
  const [mode, setMode] = useState<LoginMode>('ad')
  const [isLoading, setIsLoading] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', email: '' },
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data.username, data.password, mode === 'ad')
      navigate('/chat')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('login.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const onRegister = async (data: RegisterForm) => {
    setRegisterLoading(true)
    try {
      await registerUser(data.username, data.password, data.email)
      setRegisterOpen(false)
      toast.success(t('login.registerSuccess'))
      navigate('/chat')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('login.error'))
    } finally {
      setRegisterLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'ad' ? 'standard' : 'ad')
    loginForm.reset()
  }

  return (
    <div className="bg-background grid min-h-svh lg:grid-cols-2">
      <LoginGraphicPanel />

      <div className="flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
            <BrandMark className="h-11 w-11" />
            <div className="space-y-1.5">
              <h1 className="text-xl font-medium tracking-tight">
                {mode === 'ad' ? t('login.titleAd') : t('login.title')}
              </h1>
              <p className="text-muted-foreground text-sm">
                {mode === 'ad' ? t('login.descriptionAd') : t('login.description')}
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
                  placeholder={mode === 'ad' ? t('login.adDomainHint') : t('login.usernamePlaceholder')}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground/80 text-sm font-normal">
                    {t('login.password')}
                  </Label>
                  <button
                    type="button"
                    onClick={() => toast.info(t('login.forgotPasswordToast'))}
                    className="text-primary text-xs hover:underline"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  className="h-11 rounded-xl px-4"
                  {...loginForm.register('password')}
                />
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
                {isLoading
                  ? mode === 'ad'
                    ? t('login.loggingInAd')
                    : t('login.loggingIn')
                  : mode === 'ad'
                    ? t('login.signInAd')
                    : t('login.signIn')}
              </Button>
            </form>

            <div className="mt-4 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={switchMode}
                className="text-primary text-xs hover:underline"
              >
                {mode === 'ad' ? t('login.loginWithUsername') : t('login.backToAd')}
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                registerForm.reset()
                setRegisterOpen(true)
              }}
              className="text-primary text-xs hover:underline"
            >
              {t('login.noAccount')} {t('login.register')}
            </button>
          </div>

          <p className="text-muted-foreground/70 mt-4 text-center text-xs">{t('login.demoHint')}</p>
        </div>

        <p className="text-muted-foreground/70 mt-10 text-xs lg:hidden">{t('app.name')}</p>
      </div>

      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('login.registerTitle')}</DialogTitle>
            <DialogDescription>{t('login.registerDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-username">{t('login.username')}</Label>
              <Input
                id="reg-username"
                type="text"
                placeholder={t('login.usernamePlaceholder')}
                {...registerForm.register('username')}
              />
              {registerForm.formState.errors.username && (
                <p className="text-destructive text-xs">
                  {t(registerForm.formState.errors.username.message as string)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="name@example.com"
                {...registerForm.register('email')}
              />
              {registerForm.formState.errors.email && (
                <p className="text-destructive text-xs">
                  {t(registerForm.formState.errors.email.message as string)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">{t('login.password')}</Label>
              <Input
                id="reg-password"
                type="password"
                {...registerForm.register('password')}
              />
              {registerForm.formState.errors.password && (
                <p className="text-destructive text-xs">
                  {t(registerForm.formState.errors.password.message as string)}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-full text-sm"
              disabled={registerLoading}
            >
              {registerLoading ? t('login.registering') : t('login.registerSubmit')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
