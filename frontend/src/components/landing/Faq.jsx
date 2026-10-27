import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { APP_NAME } from '@/lib/config'

const FAQS = [
  {
    q: 'What file types can I upload?',
    a: 'Most common video formats (MP4, MOV, MKV, WEBM) and audio formats (MP3, WAV, FLAC, AAC, OGG) are supported.',
  },
  {
    q: 'How does the free trial work?',
    a: 'Every new account gets 10 days of full access with no card required. When it ends you can still view, download and delete your projects, and choose a plan to keep creating.',
  },
  {
    q: 'Can I style the burned-in captions?',
    a: 'Yes. In the studio you can pick any font, size, color, outline, shadow and background box, and drag the captions anywhere on the video. The preview matches the final render.',
  },
  {
    q: 'Do I get the vocals and instrumental separately?',
    a: 'Yes. Each project separates the voice from the music, and both tracks are available to download as MP3 once processing finishes.',
  },
  {
    q: 'What happens when I delete a project?',
    a: 'Everything tied to it is permanently removed from storage: the original upload, subtitles, rendered video and separated audio.',
  },
  {
    q: `How does ${APP_NAME} detect different speakers?`,
    a: 'A speaker diarization step runs before transcription, splitting audio into speaker-labelled segments so the transcription stays accurate per speaker.',
  },
]

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 className="text-center text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
        Frequently asked questions
      </h2>

      <div className="mt-10 space-y-3">
        {FAQS.map((item, i) => {
          const isOpen = openIndex === i
          return (
            <div
              key={item.q}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="px-5 pb-4 text-sm text-slate-500 dark:text-slate-400">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}
