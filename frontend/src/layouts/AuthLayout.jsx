import { Outlet, Link } from 'react-router-dom'
import { Captions, Sparkles, Waves, ShieldCheck } from 'lucide-react'
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

        <Link to="/" className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-lg shadow-brand-500/30">
            <Captions className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold">{APP_NAME}</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight">
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
          </div>
        </div>
      </div>
    </div>
  )
}
