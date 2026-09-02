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
    q: 'Can I edit the generated subtitles?',
    a: 'Yes. Open any completed project, edit subtitle lines directly in the built-in editor, and save an updated file.',
  },
  {
    q: `How does ${APP_NAME} detect different speakers?`,
    a: 'A speaker diarization step runs before transcription, splitting audio into speaker-labelled segments so the transcription stage stays accurate per speaker.',
  },
  {
    q: 'Do I get live progress updates while processing?',
    a: 'Yes — the project detail page connects over a socket and updates each pipeline step in real time as it completes.',
  },
]

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
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
