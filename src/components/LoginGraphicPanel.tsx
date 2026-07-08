import { useTranslation } from 'react-i18next'
import { ChatCircleDots, Heart, ShieldCheck, LockSimple, Sparkle } from '@phosphor-icons/react'

const FEATURES = [
  { icon: ChatCircleDots, titleKey: 'login.featureAlwaysTitle', descKey: 'login.featureAlwaysDesc' },
  { icon: Heart, titleKey: 'login.featureFriendlyTitle', descKey: 'login.featureFriendlyDesc' },
  { icon: ShieldCheck, titleKey: 'login.featurePrivateTitle', descKey: 'login.featurePrivateDesc' },
]

function Sparkles() {
  const positions = [
    { top: '8%', left: '46%', size: 14, opacity: 0.5 },
    { top: '18%', left: '6%', size: 10, opacity: 0.4 },
    { top: '38%', left: '88%', size: 12, opacity: 0.45 },
    { top: '62%', left: '10%', size: 9, opacity: 0.35 },
    { top: '78%', left: '80%', size: 11, opacity: 0.4 },
  ]
  return (
    <>
      {positions.map((p, i) => (
        <Sparkle
          key={i}
          weight="fill"
          className="text-primary absolute"
          style={{ top: p.top, left: p.left, width: p.size, height: p.size, opacity: p.opacity }}
          aria-hidden
        />
      ))}
    </>
  )
}

export default function LoginGraphicPanel() {
  const { t } = useTranslation()

  return (
    <div className="bg-accent/60 relative hidden h-full w-full flex-col overflow-hidden lg:flex">
      <Sparkles />

      <div className="relative flex flex-1 flex-col justify-center gap-10 px-14 py-14">
        {/* Mascot + speech bubble */}
        <div className="flex items-start gap-3">
          <img
            src="/mascot/welcome-wave.png"
            alt=""
            className="h-28 w-28 shrink-0 object-contain"
            aria-hidden
          />
          <div className="bg-card border-border relative mt-2 rounded-2xl border px-4 py-2.5 shadow-sm">
            <p className="text-foreground flex items-center gap-1.5 text-base font-semibold">
              {t('login.heroGreeting')}
              <Heart weight="fill" className="text-destructive h-4 w-4" />
            </p>
            <span className="bg-card border-border absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-r border-b" />
          </div>
        </div>

        <p className="text-foreground max-w-sm text-2xl leading-snug font-medium">
          {t('login.heroTagline')}
        </p>

        {/* Feature list */}
        <div className="bg-card/90 border-border w-full max-w-sm space-y-5 rounded-2xl border p-6 shadow-sm">
          {FEATURES.map(({ icon: FeatureIcon, titleKey, descKey }) => (
            <div key={titleKey} className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <FeatureIcon weight="bold" className="h-4.5 w-4.5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-foreground text-sm font-medium">{t(titleKey)}</p>
                <p className="text-muted-foreground text-xs">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust footer */}
      <div className="border-border/60 relative flex items-center gap-3 border-t px-14 py-6">
        <span className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <LockSimple weight="bold" className="h-4 w-4" />
        </span>
        <p className="text-muted-foreground max-w-xs text-xs">{t('login.trustNote')}</p>
      </div>
    </div>
  )
}
