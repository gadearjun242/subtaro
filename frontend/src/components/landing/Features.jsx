import { m as motion } from 'framer-motion'
import { AudioLines, Users, Wand2, Radio, Layers, ShieldCheck, Captions, Music2 } from 'lucide-react'

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
}

function Tile({ className = '', children, delay = 0 }) {
  return (
    <motion.div
      {...fade}
      transition={{ duration: 0.6, delay }}
      className={`relative overflow-hidden rounded-[2rem] border border-black/5 bg-slate-50 p-7 dark:border-white/10 dark:bg-white/[0.04] sm:p-9 ${className}`}
    >
      {children}
    </motion.div>
  )
}

const Eyebrow = ({ icon: Icon, children }) => (
  <p className="flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-400">
    <Icon className="h-4 w-4" /> {children}
  </p>
)

const Title = ({ children }) => (
  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{children}</h3>
)

const Body = ({ children }) => (
  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">{children}</p>
)

function Bars() {
  return (
    <div className="mt-8 flex h-24 items-end gap-1.5">
      {Array.from({ length: 36 }).map((_, i) => (
        <span
          key={i}
          className="w-full animate-wave rounded-full bg-gradient-to-t from-brand-600 to-brand-400"
          style={{ animationDelay: `${(i % 12) * 0.09}s`, height: '40%' }}
        />
      ))}
    </div>
  )
}

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <motion.div {...fade} transition={{ duration: 0.6 }} className="mx-auto max-w-3xl text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
          Everything captions need.
          <br />
          <span className="text-slate-400 dark:text-slate-500">Nothing they don&rsquo;t.</span>
        </h2>
      </motion.div>

      <div className="mt-16 grid gap-4 lg:grid-cols-6">
        <Tile className="lg:col-span-4">
          <Eyebrow icon={AudioLines}>Vocal isolation</Eyebrow>
          <Title>Hears the voice, not the noise.</Title>
          <Body>
            Every file is split into vocals and instrumental first, so transcription locks onto
            speech even over loud music. You get both tracks back as downloads.
          </Body>
          <Bars />
        </Tile>

        <Tile className="lg:col-span-2" delay={0.08}>
          <Eyebrow icon={Users}>Speaker-aware</Eyebrow>
          <Title>Knows who is talking.</Title>
          <Body>Diarization separates speakers before a single word is transcribed.</Body>
          <div className="mt-8 space-y-2.5">
            {['Speaker 1', 'Speaker 2'].map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <span className={`h-7 w-7 rounded-full ${i ? 'bg-accent-500' : 'bg-brand-600'}`} />
                <span className="h-2.5 flex-1 rounded-full bg-slate-200 dark:bg-white/10" style={{ maxWidth: i ? '55%' : '80%' }} />
              </div>
            ))}
          </div>
        </Tile>

        <Tile className="lg:col-span-2" delay={0.04}>
          <Eyebrow icon={Wand2}>Studio editor</Eyebrow>
          <Title>Edit like a video editor.</Title>
          <Body>Timeline, drag-to-retime, split, undo, and a live preview.</Body>
        </Tile>

        <Tile className="lg:col-span-2" delay={0.08}>
          <Eyebrow icon={Captions}>Total styling</Eyebrow>
          <Title>Make it yours.</Title>
          <Body>Font, size, colors, outline, background box and position, all rendered in.</Body>
        </Tile>

        <Tile className="lg:col-span-2" delay={0.12}>
          <Eyebrow icon={Radio}>Live progress</Eyebrow>
          <Title>Watch it work.</Title>
          <Body>Every pipeline step streams to your screen in real time.</Body>
        </Tile>

        <Tile className="lg:col-span-3" delay={0.04}>
          <Eyebrow icon={Layers}>Two ways to deliver</Eyebrow>
          <Title>Burned in, or a selectable track.</Title>
          <Body>Hard-code captions into the pixels for social, or ship one clean MP4 viewers can toggle.</Body>
        </Tile>

        <Tile className="lg:col-span-3" delay={0.08}>
          <Eyebrow icon={ShieldCheck}>Yours, and only yours</Eyebrow>
          <Title>Delete it. It&rsquo;s gone.</Title>
          <Body>
            Remove a project and every file tied to it, including source, captions, video and audio
            stems, is erased from storage.
          </Body>
        </Tile>
      </div>
    </section>
  )
}

export { Music2 }
