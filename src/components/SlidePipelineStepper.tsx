import type { SlideStageEvent, SlideStageId } from '@/types'

const STAGE_CATALOG: { id: SlideStageId; label: string }[] = [
  { id: 'research', label: '情報収集' },
  { id: 'style', label: 'スタイル選定' },
  { id: 'planning', label: '構成作成' },
  { id: 'quality', label: '品質チェック' },
  { id: 'visual_identity', label: 'ビジュアル選定' },
  { id: 'images', label: '画像検索' },
  { id: 'rendering', label: 'レンダリング' },
  { id: 'validation', label: '検証' },
  { id: 'packaging', label: 'PPTX作成' },
]

const STAGE_LABELS: Record<SlideStageId, string> = Object.fromEntries(
  STAGE_CATALOG.map((s) => [s.id, s.label]),
) as Record<SlideStageId, string>

interface SlidePipelineStepperProps {
  stages: Record<string, SlideStageEvent>
}

export default function SlidePipelineStepper({ stages }: SlidePipelineStepperProps) {
  const stageIds = STAGE_CATALOG.map((s) => s.id)

  return (
    <div className="my-3 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Slide Generation Progress</p>
      <div className="flex flex-wrap gap-1.5">
        {stageIds.map((id) => {
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
              {STAGE_LABELS[id]}
            </div>
          )
        })}
      </div>
    </div>
  )
}
