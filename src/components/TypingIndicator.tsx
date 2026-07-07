import { motion } from 'framer-motion'

const dots = [0, 1, 2]

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      {dots.map((i) => (
        <motion.div
          key={i}
          className="bg-muted-foreground/40 h-2 w-2 rounded-full"
          animate={{
            y: [0, -4, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
