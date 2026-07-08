import { useTranslation } from 'react-i18next'
import type { SlideStageEvent, SlideStageId } from '@/types'

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

interface SlidePipelineStepperProps {
  stages: Record<string, SlideStageEvent>
}

export default function SlidePipelineStepper({ stages }: SlidePipelineStepperProps) {
  const { t } = useTranslation()

  return (
    <div className="my-3 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{t('chat.slideStatusGenerating')}</p>
      <div className="flex flex-wrap gap-1.5">
        {STAGE_IDS.map((id) => {
          const stage = stages[id]
          const status = stage?.stage_status ?? 'pending'

          const colorMap: Record<string, string> = {
            active: 'bg-blue-500 text-white',
            done: 'bg-green-500 text-white',
            skipped: 'bg-gray-300 text-gray-500',
            error: 'bg-red-500 text-white',
            pending: 'bg-muted text-muted-foreground',
          }

          return (
            <div
              key={id}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${colorMap[status] ?? colorMap.pending}`}
            >
              {t(STAGE_TRANSLATION_KEYS[id])}
            </div>
          )
        })}
      </div>
    </div>
  )
}
