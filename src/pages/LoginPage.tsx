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
import BrandMark from '@/components/BrandMark'
import LoginGraphicPanel from '@/components/LoginGraphicPanel'
import { useAuthStore } from '@/stores/authStore'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data.email, data.password)
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
            <BrandMark className="h-11 w-11" />
            <div className="space-y-1.5">
              <h1 className="text-xl font-medium tracking-tight">{t('login.title')}</h1>
              <p className="text-muted-foreground text-sm">{t('login.description')}</p>
            </div>
          </div>

          <div className="border-border bg-card rounded-2xl border p-6 shadow-sm sm:p-7">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-foreground/80 text-sm font-normal">
                  {t('login.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  className="h-11 rounded-xl px-4"
                  {...register('email')}
                />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
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
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-destructive text-xs">{errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="h-11 w-full rounded-full text-sm" disabled={isLoading}>
                {isLoading ? t('login.loggingIn') : t('login.signIn')}
              </Button>
            </form>
          </div>

          <p className="text-muted-foreground/70 mt-4 text-center text-xs">{t('login.demoHint')}</p>
        </div>

        <p className="text-muted-foreground/70 mt-10 text-xs lg:hidden">{t('app.name')}</p>
      </div>
    </div>
  )
}
