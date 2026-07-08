import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Palette,
  ListTree,
  ShieldCheck,
  Sparkles,
  Image as ImageIcon,
  MonitorPlay,
  BadgeCheck,
  PackageCheck,
  Check,
  AlertTriangle,
  Loader2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SlideStageEvent, SlideStageId, SlideStageStatus } from '@/types'

const STAGE_IDS: SlideStageId[] = [
  'research',
  'style',
  'planning',
  'quality',
  'visual_identity',
  'images',
  'rendering',
  'validation',
  'packaging',
]

const STAGE_TRANSLATION_KEYS: Record<SlideStageId, string> = {
  research: 'chat.slideStageResearch',
  style: 'chat.slideStageStyle',
  planning: 'chat.slideStagePlanning',
  quality: 'chat.slideStageQuality',
  visual_identity: 'chat.slideStageVisualIdentity',
  images: 'chat.slideStageImages',
  rendering: 'chat.slideStageRendering',
  validation: 'chat.slideStageValidation',
  packaging: 'chat.slideStagePackaging',
}

// One icon per stage so each row is identifiable at a glance rather than
// relying on color/text alone.
const STAGE_ICONS: Record<SlideStageId, LucideIcon> = {
  research: Search,
  style: Palette,
  planning: ListTree,
  quality: ShieldCheck,
  visual_identity: Sparkles,
  images: ImageIcon,
  rendering: MonitorPlay,
  validation: BadgeCheck,
  packaging: PackageCheck,
}

interface SlidePipelineStepperProps {
  stages: Record<string, SlideStageEvent>
}

export default function SlidePipelineStepper({ stages }: SlidePipelineStepperProps) {
  const { t } = useTranslation()

  const items = STAGE_IDS.map((id) => ({
    id,
    status: (stages[id]?.stage_status ?? 'pending') as SlideStageStatus,
  }))

  // Skipped stages don't count toward the denominator -- they were never
  // going to run, so they shouldn't make progress look stalled.
  const relevant = items.filter((item) => item.status != 'skipped')
  const doneCount = items.filter((item) => item.status == 'done').length
  const progress = relevant.length > 0 ? doneCount / relevant.length : 0

  return (
    <div className="border-border bg-card my-3 w-full max-w-md rounded-2xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">{t('chat.slideStatusGenerating')}</p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {doneCount}/{relevant.length}
        </p>
      </div>

      <div className="bg-muted mb-4 h-1 overflow-hidden rounded-full">
        <motion.div
          className="bg-primary h-full rounded-full"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <div>
        {items.map((item, i) => {
          const Icon = STAGE_ICONS[item.id]
          const isLast = i == items.length - 1
          const status = item.status

          return (
            <div key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300',
                    status == 'done' && 'bg-primary border-primary text-primary-foreground',
                    status == 'active' && 'border-primary text-primary bg-primary/10',
                    status == 'pending' && 'border-border bg-muted text-muted-foreground/40',
                    status == 'skipped' &&
                    'border-border text-muted-foreground/30 border-dashed bg-transparent',
                    status == 'error' && 'border-destructive text-destructive bg-destructive/10',
                  )}
                >
                  {status == 'done' && <Check className="h-3.5 w-3.5" />}
                  {status == 'active' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {status == 'error' && <AlertTriangle className="h-3.5 w-3.5" />}
                  {(status == 'pending' || status == 'skipped') && <Icon className="h-3 w-3" />}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'my-0.5 w-px flex-1 transition-colors duration-300',
                      status == 'done' ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
              </div>

              <div
                className={cn(
                  'pt-0.5 pb-4 text-sm transition-colors duration-300',
                  status == 'pending' || status == 'skipped'
                    ? 'text-muted-foreground/50'
                    : 'text-foreground',
                )}
              >
                {t(STAGE_TRANSLATION_KEYS[item.id])}
                {status == 'skipped' && (
                  <span className="text-muted-foreground/40 ml-1.5 text-xs">
                    · {t('chat.slideStageSkipped')}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
