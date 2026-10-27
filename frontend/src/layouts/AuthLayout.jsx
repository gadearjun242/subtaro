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
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white lg:flex">
        <div className="absolute -left-24 -top-24 h-96 w-96 animate-blob rounded-full bg-brand-600/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 animate-blob rounded-full bg-accent-500/30 blur-3xl" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-grid opacity-40" />

        <Logo onDark className="relative z-10" />

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Turn any video or audio into clean subtitles.
          </h2>
          <div className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
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
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <Outlet />

            {/* The brand panel is a side column on large screens; on small
                screens its points sit under the form so nothing is lost. */}
            <div className="mt-10 space-y-3 border-t border-black/5 pt-8 dark:border-white/10 lg:hidden">
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
