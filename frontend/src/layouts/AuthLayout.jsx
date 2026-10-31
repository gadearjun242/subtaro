import { Outlet } from 'react-router-dom'
import { Sparkles, Waves, ShieldCheck } from 'lucide-react'
import Logo from '@/components/common/Logo'
import ThemeToggle from '@/components/common/ThemeToggle'
import { APP_NAME } from '@/lib/config'

const POINTS = [
  { icon: Waves, text: 'Speaker-aware transcription, not just flat captions' },
  { icon: Sparkles, text: 'Editable subtitles you can fine-tune before export' },
  { icon: ShieldCheck, text: 'Your files, processed securely end to end' },
]

export default function AuthLayout() {
  return (
    <div className="relative grid min-h-screen overflow-hidden bg-[#f3f2ed] dark:bg-[#090d17] lg:grid-cols-2">
      <div className="pointer-events-none absolute -right-36 top-0 h-[34rem] w-[34rem] rounded-full bg-brand-500/10 blur-[120px] dark:bg-brand-500/[0.12] lg:hidden" />
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/10 bg-[#090d17] p-10 text-white lg:flex xl:p-14">
        <div className="absolute -left-24 -top-24 h-96 w-96 animate-blob rounded-full bg-brand-600/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 animate-blob rounded-full bg-accent-500/30 blur-3xl" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-grid opacity-40" />

        <Logo onDark className="relative z-10" />

        <div className="relative z-10 max-w-lg">
          <span className="premium-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Your creative workflow</span>
          <h2 className="mt-6 text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">
            Every word,
            <br />
            <span className="text-gradient">right on time.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300">
            Turn recordings into polished, speaker-aware subtitles with an editor built for the final cut.
          </p>
          <div className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/25 to-accent-500/20 text-brand-300">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm text-slate-200">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-400">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="relative z-10 flex min-h-screen flex-col p-5 sm:p-10 xl:p-14">
        <div className="flex items-center justify-between lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md rounded-[2rem] border border-black/[0.06] bg-[#fbfaf7]/90 p-6 shadow-[0_30px_90px_-40px_rgb(0_0_0/0.18)] backdrop-blur-xl dark:border-white/[0.09] dark:bg-[#111725]/90 dark:shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] sm:p-10">
            <Outlet />

            {/* The brand panel is a side column on large screens; on small
                screens its points sit under the form so nothing is lost. */}
            <div className="mt-8 space-y-3 border-t border-black/5 pt-6 dark:border-white/10 lg:hidden">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Turn any video or audio into clean subtitles.
              </p>
              {POINTS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-brand-600 dark:bg-white/10 dark:text-brand-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
