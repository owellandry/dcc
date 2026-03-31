'use client'

import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { motion, overlayCardVariants } from '@/lib/motion'
import type { ReactionPickerVisualProps } from './ReactionPicker.shared'

export function ReactionPickerVisual({
  pickerRef,
  pickerTheme,
  onPick,
}: ReactionPickerVisualProps) {
  return (
    <motion.div
      ref={pickerRef}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={overlayCardVariants}
      className="w-[400px] overflow-hidden rounded-[26px] border border-[var(--b1)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--s1)_96%,white_4%),color-mix(in_srgb,var(--s0)_98%,black_2%))] p-2 backdrop-blur-xl"
    >
      <div className="overflow-hidden rounded-[22px] border border-[var(--b1)] bg-[color-mix(in_srgb,var(--s2)_94%,white_6%)]">
        <Picker
          key={pickerTheme}
          data={data}
          onEmojiSelect={(emoji: { native?: string }) => {
            if (!emoji.native) return
            onPick(emoji.native)
          }}
          theme={pickerTheme}
          locale="es"
          set="native"
          autoFocus
          previewPosition="none"
          skinTonePosition="none"
          navPosition="bottom"
          searchPosition="sticky"
          maxFrequentRows={0}
          perLine={9}
          emojiSize={22}
          emojiButtonSize={42}
          emojiButtonRadius={14}
          dynamicWidth={false}
          categories={['people', 'nature', 'foods', 'activity', 'places', 'objects', 'symbols', 'flags']}
          noCountryFlags={false}
          icons={pickerTheme === 'light' ? 'outline' : 'solid'}
          emojiButtonColors={[
            'color-mix(in srgb, var(--ember) 18%, transparent)',
            'color-mix(in srgb, var(--volt) 16%, transparent)',
            'color-mix(in srgb, var(--online) 16%, transparent)',
          ]}
        />
      </div>
    </motion.div>
  )
}
