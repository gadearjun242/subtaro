import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

export const Spinner = ({ className }) => (
  <Loader2 className={clsx('animate-spin text-brand-500', className)} />
)

export const ProgressBar = ({ value = 0, className, barClassName }) => (
  <div className={clsx('h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', className)}>
    <div
      className={clsx(
        'h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500 ease-out',
        barClassName
      )}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
)

export const Skeleton = ({ className }) => (
  <div className={clsx('animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800', className)} />
)
