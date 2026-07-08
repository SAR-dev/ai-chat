import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Bot } from 'lucide-react'

export default function TypingIndicator() {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2 px-4 py-2 sm:px-6">
      <motion.div
        className="bg-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Bot className="text-primary h-4 w-4" strokeWidth={2} />
      </motion.div>
      <span className="text-muted-foreground text-sm">{t('chat.thinking')}</span>
      <motion.span
        className="bg-primary inline-block h-1.5 w-1.5 rounded-full"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
