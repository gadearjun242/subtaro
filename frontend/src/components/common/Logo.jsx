import { Captions } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { APP_NAME } from '@/lib/config'

// One logo for every surface. `onDark` forces white text for use on
// the always-dark auth brand panel; otherwise the wordmark follows the theme.
export default function Logo({ to = '/', showText = true, onDark = false, className }) {
  return (
    <Link to={to} className={clsx('flex shrink-0 items-center gap-2.5', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-brand-500 via-brand-600 to-accent-500 text-white shadow-md shadow-brand-600/30 ring-1 ring-white/20">
        <Captions className="h-[18px] w-[18px]" strokeWidth={2.4} />
      </span>
      {showText && (
        <span
          className={clsx(
            'text-lg font-semibold tracking-tight',
            onDark ? 'text-white' : 'text-slate-900 dark:text-white'
          )}
        >
          {APP_NAME}
        </span>
      )}
    </Link>
  )
}
