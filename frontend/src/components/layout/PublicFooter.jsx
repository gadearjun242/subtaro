import { Link } from 'react-router-dom'
import { Code2, MessageCircle, Briefcase, ExternalLink } from 'lucide-react'
import Logo from '@/components/common/Logo'
import { APP_NAME, PORTFOLIO_URL } from '@/lib/config'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Log in', href: '/login' },
      { label: 'Create account', href: '/register' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Contact', href: '/contact' },
    ],
  },
]

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              Upload video or audio, get clean, editable subtitles powered by speaker-aware AI transcription.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {[MessageCircle, Code2, Briefcase].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-brand-100 hover:text-brand-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-brand-500/10"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{col.title}</p>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.href}
                      className="text-sm text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 dark:border-slate-800 sm:flex-row">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p className="flex items-center gap-3">
            <span>Built with React, Tailwind CSS &amp; TanStack Query.</span>
            <a
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
            >
              Portfolio <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
