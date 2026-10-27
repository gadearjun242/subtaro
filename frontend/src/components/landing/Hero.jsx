import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, FileVideo2, Captions } from 'lucide-react'
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
    <section className="relative overflow-hidden pb-24 pt-20 sm:pb-32 sm:pt-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(60%_50%_at_50%_0%,rgb(0_113_227/0.10),transparent)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,rgb(10_132_255/0.22),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-sm font-semibold text-brand-600 dark:text-brand-400 sm:text-lg"
          >
            Subtitles, reimagined.
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-3 text-5xl font-semibold leading-[1.04] tracking-tight text-slate-900 dark:text-white sm:text-7xl lg:text-[5.5rem]"
          >
            Say it once.
            <br />
            <span className="text-gradient">Captioned perfectly.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 dark:text-slate-400 sm:text-2xl"
          >
            Upload a video or audio file. Get speaker-aware subtitles, separated vocals
            and instrumental, and a finished video you can style your way.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5"
          >
            <Link to={isAuthenticated ? '/dashboard/projects/new' : '/register'}>
              <Button size="lg">Try free for 10 days</Button>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-1 text-[17px] font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Explore features <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
          <p className="mt-4 text-sm text-slate-400">No card required.</p>
        </div>

        {/* Animated preview card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="glass rounded-[2rem] border border-black/5 p-3 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.35)] dark:border-white/10 dark:shadow-none sm:p-4">
            <div className="flex items-center gap-2 px-2 pb-3">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <div className="ml-3 flex items-center gap-2 text-xs font-medium text-slate-400">
                <FileVideo2 className="h-3.5 w-3.5" /> interview_final.mp4
              </div>
            </div>

            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black">
              <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_25%_25%,rgb(10_132_255/0.35),transparent)]" />
              <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_80%_80%,rgb(175_82_222/0.3),transparent)]" />
              <WaveformLottie className="relative h-32 w-56 sm:h-44 sm:w-72" />

              <div className="absolute bottom-[9%] left-1/2 flex w-[90%] -translate-x-1/2 flex-wrap items-center justify-center gap-x-2 gap-y-1">
                {CAPTION_WORDS.map((word, i) => (
                  <motion.span
                    key={word}
                    initial={false}
                    animate={{ opacity: i < wordCount ? 1 : 0, y: i < wordCount ? 0 : 6, scale: i === wordCount - 1 ? 1.08 : 1 }}
                    transition={{ duration: 0.18 }}
                    className={`text-lg font-extrabold [paint-order:stroke_fill] [-webkit-text-stroke:5px_black] sm:text-3xl ${i === wordCount - 1 ? 'text-yellow-300' : 'text-white'}`}
                  >
                    {word}
                  </motion.span>
                ))}
              </div>

              <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                <Captions className="h-3 w-3" /> Live sync
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
