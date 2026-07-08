import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ImageIcon } from 'lucide-react'
import { translateStatus } from '@/utils/statusMessages'

interface ImageGenLoadingProps {
  status: string
}

/**
 * Loading state shown while an image is being generated. A shimmering
 * skeleton frame stands in for the image-to-be, with a softly breathing
 * icon at its center and a status line whose trailing dots animate in
 * sequence -- calmer than a generic spinner, and it previews the shape
 * the final image will land in.
 */
export default function ImageGenLoading({ status }: ImageGenLoadingProps) {
  const { t } = useTranslation()
  const label = translateStatus(status, t).replace(/[.\u2026\s]+$/, '')

  return (
    <div className="mb-3 inline-flex flex-col items-start gap-2">
      <div className="border-border bg-muted relative h-48 w-48 overflow-hidden rounded-2xl border">
        <motion.div
          className="absolute inset-y-0 -left-1/2 w-1/2"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in oklch, var(--accent), transparent 15%), transparent)',
          }}
          animate={{ x: ['0%', '400%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ImageIcon className="text-primary/60 h-9 w-9" strokeWidth={1.5} />
          </motion.div>
        </div>

        <motion.div
          className="border-primary/40 pointer-events-none absolute inset-3 rounded-xl border"
          animate={{ opacity: [0.25, 0.6, 0.25] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="text-muted-foreground flex items-center gap-1 text-sm">
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
