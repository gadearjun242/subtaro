import { useState } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PRESET_STYLES, captionCss, frameAlignment } from '@/lib/subtitleStyle'

const SAMPLES = [
  { key: 'classic', text: 'Clean and classic.' },
  { key: 'bold_yellow', text: 'Loud. Bold. Seen.' },
  { key: 'minimal_top', text: 'Quiet and out of the way.' },
  { key: 'cinematic', text: 'Like a film, every time.' },
]

// Preview height is fixed so the same libass-accurate scaling used in
// the studio drives these cards.
const FRAME_H = 220

export default function CaptionStyles() {
  const [active, setActive] = useState(0)
  const sample = SAMPLES[active]
  const style = PRESET_STYLES[sample.key].style

  return (
    <section className="bg-slate-50 py-24 dark:bg-white/[0.03] sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">Caption styles</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            One tap to a whole new look.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500 dark:text-slate-400">
            Start from a preset, then adjust every detail in the studio. What you see is exactly
            what gets rendered.
          </p>
        </motion.div>

        <div className="mx-auto mt-14 max-w-4xl">
          <div className="relative aspect-video overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-800 via-slate-900 to-black shadow-2xl shadow-black/20">
            <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_30%_30%,rgb(0_113_227/0.35),transparent)]" />
            <div
              className="absolute inset-0 flex flex-col items-center px-[6%]"
              style={frameAlignment(style, FRAME_H * 2)}
            >
              <motion.span
                key={sample.key}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35 }}
                style={captionCss(style, FRAME_H * 2)}
              >
                {sample.text}
              </motion.span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SAMPLES.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setActive(i)}
                className={clsx(
                  'cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-colors',
                  i === active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
                )}
              >
                {PRESET_STYLES[s.key].label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
