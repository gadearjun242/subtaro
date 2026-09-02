import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, PlayCircle, Sparkles, FileVideo2, Captions } from 'lucide-react'
import Button from '@/components/ui/Button'
import WaveformLottie from '@/components/landing/WaveformLottie'
import { useAuth } from '@/context/AuthContext'

const CAPTION_WORDS = [
  'Every',
  'word',
  'lands',
  'exactly',
  'when',
  'it\u2019s',
  'spoken.',
]

export default function Hero() {
  const { isAuthenticated } = useAuth()
  const [wordCount, setWordCount] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setWordCount((prev) => (prev >= CAPTION_WORDS.length ? 1 : prev + 1))
    }, 420)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative overflow-hidden bg-grid pb-20 pt-16 sm:pb-28 sm:pt-24">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 animate-blob rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-600/20" />
      <div className="pointer-events-none absolute right-0 top-40 h-72 w-72 animate-blob rounded-full bg-accent-400/20 blur-3xl" style={{ animationDelay: '2s' }} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
          >
            <Sparkles className="h-3.5 w-3.5" /> Speaker-aware AI transcription
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-6xl"
          >
            Video &amp; audio, turned into
            <br />
            <span className="text-gradient">perfect subtitles.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-6 max-w-xl text-base text-slate-500 dark:text-slate-400 sm:text-lg"
          >
            Upload a file, watch the pipeline run live, then download — or edit — an
            accurate, speaker-aware subtitle file in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link to={isAuthenticated ? '/dashboard/projects/new' : '/register'}>
              <Button size="lg">
                Start transcribing free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline">
                <PlayCircle className="h-4 w-4" /> See how it works
              </Button>
            </a>
          </motion.div>
        </div>

        {/* Animated preview card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="animate-float rounded-3xl border border-slate-200 bg-white/80 p-3 shadow-2xl shadow-slate-300/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none sm:p-4">
            <div className="flex items-center gap-2 border-b border-slate-100 px-2 pb-3 dark:border-slate-800">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <div className="ml-3 flex items-center gap-2 text-xs font-medium text-slate-400">
                <FileVideo2 className="h-3.5 w-3.5" /> interview_final.mp4
              </div>
            </div>

            <div className="grid gap-4 p-4 sm:grid-cols-[1.3fr_1fr]">
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="absolute inset-0 bg-grid opacity-[0.15]" />
                <WaveformLottie className="h-28 w-48 sm:h-36 sm:w-60" />

                {/* Word-by-word synced caption reveal — an honest demo of the
                    real playback-synced captions feature (see SyncedCaptions.jsx). */}
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 px-4">
                  {CAPTION_WORDS.map((word, i) => (
                    <motion.span
                      key={word}
                      initial={false}
                      animate={{
                        opacity: i < wordCount ? 1 : 0,
                        y: i < wordCount ? 0 : 6,
                      }}
                      transition={{ duration: 0.18 }}
                      className="rounded bg-black/50 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur sm:text-xs"
                    >
                      {word}
                    </motion.span>
                  ))}
                </div>

                <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  <Captions className="h-3 w-3" /> Live sync
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  { name: 'Audio separation', done: true },
                  { name: 'Speaker diarization', done: true },
                  { name: 'Segment preparation', done: true },
                  { name: 'Speaker-aware transcription', active: true },
                  { name: 'Subtitle generation', done: false },
                ].map((step) => (
                  <div
                    key={step.name}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <span
                      className={
                        step.done
                          ? 'h-2 w-2 rounded-full bg-emerald-500'
                          : step.active
                          ? 'h-2 w-2 animate-pulse rounded-full bg-brand-500'
                          : 'h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600'
                      }
                    />
                    <span className="text-slate-600 dark:text-slate-300">{step.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
