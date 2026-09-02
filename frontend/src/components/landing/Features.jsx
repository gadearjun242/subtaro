import { motion } from 'framer-motion'
import {
  Users,
  Wand2,
  FileDown,
  RadioTower,
  PencilLine,
  ShieldCheck,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Users,
    title: 'Speaker diarization',
    desc: 'Automatically detects who is speaking and when, so multi-speaker content stays accurate.',
    accent: 'from-brand-500 to-brand-600',
    glow: 'bg-brand-400/30',
  },
  {
    icon: Wand2,
    title: 'Speaker-aware transcription',
    desc: 'Transcription tuned per-speaker for far higher accuracy than generic ASR.',
    accent: 'from-accent-500 to-pink-600',
    glow: 'bg-accent-400/30',
  },
  {
    icon: RadioTower,
    title: 'Live pipeline updates',
    desc: 'Watch every processing step update in real time over a socket connection — no refreshing.',
    accent: 'from-sky-500 to-blue-600',
    glow: 'bg-sky-400/30',
  },
  {
    icon: PencilLine,
    title: 'Editable subtitles',
    desc: 'Fine-tune the generated SRT right in your dashboard, then save an updated file.',
    accent: 'from-emerald-500 to-teal-600',
    glow: 'bg-emerald-400/30',
  },
  {
    icon: FileDown,
    title: 'Video or audio in',
    desc: 'Drop in MP4, MOV, MKV, MP3, WAV, FLAC and more — output stays clean either way.',
    accent: 'from-amber-500 to-orange-600',
    glow: 'bg-amber-400/30',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by default',
    desc: 'JWT-based auth, hashed passwords, and per-user isolated storage for every upload.',
    accent: 'from-violet-500 to-purple-600',
    glow: 'bg-violet-400/30',
  },
]

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Everything you need, nothing you don't
        </h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400">
          A focused pipeline that goes from raw media to polished subtitles.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc, accent, glow }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-none"
          >
            {/* Decorative corner glow, revealed on hover */}
            <span
              className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full ${glow} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
            />

            {/* Faint dot-grid texture in the corner for extra depth */}
            <svg
              className="pointer-events-none absolute right-3 top-3 h-16 w-16 text-slate-100 opacity-70 dark:text-slate-800"
              viewBox="0 0 64 64"
              fill="none"
            >
              {Array.from({ length: 4 }).map((_, row) =>
                Array.from({ length: 4 }).map((_, col) => (
                  <circle key={`${row}-${col}`} cx={6 + col * 16} cy={6 + row * 16} r="1.6" fill="currentColor" />
                ))
              )}
            </svg>

            <span
              className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg shadow-slate-900/10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
            >
              <Icon className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <h3 className="relative mt-4 text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="relative mt-1.5 text-sm text-slate-500 dark:text-slate-400">{desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
