import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function TypingIndicator() {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2 px-4 py-2 sm:px-6">
      <span className="text-muted-foreground text-sm">{t('chat.thinking')}</span>
      <motion.span
        className="bg-primary inline-block h-1.5 w-1.5 rounded-full"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
