'use client'

import { motion } from '@/lib/motion'
import { type TypingIndicatorVisualProps } from './TypingIndicator.shared'

export function TypingIndicatorVisual({ showIndicator, label }: TypingIndicatorVisualProps) {
  if (!showIndicator) return <div className="h-5" />

  return (
    <motion.div
      className="flex h-5 items-center gap-1.5 px-1 pb-0.5"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <span className="flex items-end gap-[3px]">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="block h-1.5 w-1.5 rounded-full bg-[var(--t2)]"
            animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: 'easeInOut',
              delay: index * 0.2,
            }}
          />
        ))}
      </span>
      <span className="text-xs text-[var(--t2)]">
        <strong className="font-600 text-[var(--t1)]">{label}</strong>...
      </span>
    </motion.div>
  )
}
