import { Captions } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { APP_NAME } from '@/lib/config'

export default function Logo({ to = '/', showText = true, className }) {
  return (
    <Link to={to} className={clsx('flex items-center gap-2.5 shrink-0', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-md shadow-brand-500/30">
        <Captions className="h-5 w-5" strokeWidth={2.5} />
      </span>
      {showText && (
        <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
          {APP_NAME}
        </span>
      )}
    </Link>
  )
}
