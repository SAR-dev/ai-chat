import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { translateStatus } from '@/utils/statusMessages'

interface SlideGenLoadingProps {
  status: string
}

export default function SlideGenLoading({ status }: SlideGenLoadingProps) {
  const { t } = useTranslation()
  const label = translateStatus(status, t).replace(/[.\u2026\s]+$/, '')

  return (
    <div className="mb-3 inline-flex flex-col items-start gap-2">
      <div
        className="border-border bg-card relative w-full max-w-md overflow-hidden rounded-2xl border p-5"
        style={{ aspectRatio: '16 / 10' }}
      >
        <motion.div
          className="absolute inset-y-0 -left-1/2 z-10 w-1/2"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in oklch, var(--accent), transparent 15%), transparent)',
          }}
          animate={{ x: ['0%', '400%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative flex h-full flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-primary/50 h-2 w-2 shrink-0 rounded-full" />
              <div className="bg-muted-foreground/20 h-2 w-16 rounded-full" />
            </div>

            <div className="bg-muted-foreground/25 h-3.5 w-2/3 rounded-full" />

            <div className="space-y-2 pt-1">
              {['85%', '65%', '45%'].map((width, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="bg-muted-foreground/20 h-1 w-1 shrink-0 rounded-full" />
                  <motion.div
                    className="bg-muted-foreground/15 h-2 rounded-full"
                    style={{ width }}
                    animate={{ opacity: [0.5, 0.9, 0.5] }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: 'easeInOut',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <motion.div
            className="border-border bg-muted-foreground/10 ml-auto h-14 w-20 rounded-lg border"
            animate={{ opacity: [0.35, 0.65, 0.35] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <motion.div
          className="border-primary/30 pointer-events-none absolute inset-3 rounded-xl border"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Sparkles className="text-primary/70 h-3.5 w-3.5" />
        <span>{label}</span>
        <span className="inline-flex items-end gap-0.5 pb-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="bg-muted-foreground/70 h-1 w-1 rounded-full"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.18,
                ease: 'easeInOut',
              }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}
