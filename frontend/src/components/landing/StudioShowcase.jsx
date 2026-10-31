import { m as motion } from 'framer-motion'
import { Scissors, MousePointer2, Undo2, Keyboard } from 'lucide-react'

const BLOCKS = [
  { l: 4, w: 22, t: 'Every word lands exactly' },
  { l: 29, w: 26, t: 'when it’s spoken.' },
  { l: 59, w: 17, t: 'Edit on a timeline.' },
  { l: 79, w: 17, t: 'Render. Done.' },
]

const POINTS = [
  { icon: MousePointer2, title: 'Drag to retime', body: 'Move or stretch any caption right on the timeline.' },
  { icon: Scissors, title: 'Split and merge', body: 'Cut a caption at the playhead with a single key.' },
  { icon: Undo2, title: 'Fearless undo', body: 'A full history, so experimenting never costs you work.' },
  { icon: Keyboard, title: 'Keyboard first', body: 'Space to play, S to split, Ctrl+S to save and render.' },
]

export default function StudioShowcase() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl text-center"
      >
        <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">The studio</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
          A real editor.
          <br />
          Built for captions.
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.8 }}
        className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_40px_100px_-40px_rgb(0_0_0/0.4)] dark:border-white/10 dark:bg-[#0b0b0c]"
      >
        <div className="flex items-center gap-2 border-b border-black/5 px-4 py-3 dark:border-white/10">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs font-medium text-slate-400">Studio</span>
        </div>

        <div className="grid gap-px bg-black/5 dark:bg-white/10 md:grid-cols-[1fr_2fr_1fr]">
          <div className="order-2 space-y-2 bg-white p-3 dark:bg-[#0b0b0c] md:order-none">
            {['Every word lands exactly', 'when it’s spoken.', 'Edit on a timeline.'].map((t, i) => (
              <div key={t} className={`rounded-xl p-2.5 text-xs ${i === 1 ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'bg-slate-50 text-slate-600 dark:bg-white/[0.04] dark:text-slate-300'}`}>
                <div className="mb-1 font-mono text-[10px] text-slate-400">0:0{i * 3}.000</div>
                {t}
              </div>
            ))}
          </div>

          <div className="order-1 flex items-center justify-center bg-slate-100 p-4 dark:bg-black sm:p-6 md:order-none">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-black">
              <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_30%,rgb(175_82_222/0.4),transparent)]" />
              <span className="absolute bottom-[12%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/55 px-3 py-1 font-serif text-sm text-white sm:text-lg">
                when it’s spoken.
              </span>
            </div>
          </div>

          <div className="order-3 space-y-4 bg-white p-4 dark:bg-[#0b0b0c] md:order-none">
            {['Size', 'Outline', 'Opacity'].map((l, i) => (
              <div key={l}>
                <div className="mb-1.5 text-[11px] font-medium text-slate-400">{l}</div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/15">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${[55, 30, 70][i]}%` }} />
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              {['#ffffff', '#ffd60a', '#0a84ff', '#ff453a'].map((c) => (
                <span key={c} className="h-6 w-6 rounded-full border border-black/10" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        <div className="relative h-24 border-t border-black/5 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0b0b0c]">
          <div className="relative mt-2 h-12">
            {BLOCKS.map((b, i) => (
              <div
                key={b.t}
                className={`absolute flex h-full items-center overflow-hidden rounded-lg border px-2 text-[11px] font-medium ${i === 1 ? 'border-brand-400 bg-brand-500 text-white' : 'border-brand-500/30 bg-brand-500/15 text-brand-800 dark:text-brand-200'}`}
                style={{ left: `${b.l}%`, width: `${b.w}%` }}
              >
                <span className="truncate">{b.t}</span>
              </div>
            ))}
          </div>
          <div className="absolute inset-y-2 left-[38%] w-px bg-red-500">
            <span className="absolute -left-[5px] -top-1 h-2.5 w-[11px] rounded-b-sm bg-red-500" />
          </div>
        </div>
      </motion.div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
          >
            <p.icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">{p.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{p.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
