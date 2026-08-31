import clsx from 'clsx'
import { CheckCircle2, Clock, Loader2, XCircle, CircleDashed, Ban } from 'lucide-react'

const STATUS_MAP = {
  created: { label: 'Created', icon: CircleDashed, cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  uploading: { label: 'Uploading', icon: Loader2, spin: true, cls: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' },
  queued: { label: 'Queued', icon: Clock, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  processing: { label: 'Processing', icon: Loader2, spin: true, cls: 'bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' },
  completed: { label: 'Completed', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  failed: { label: 'Failed', icon: XCircle, cls: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
  cancelled: { label: 'Cancelled', icon: Ban, cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
}

export default function StatusBadge({ status, className }) {
  const meta = STATUS_MAP[status] || STATUS_MAP.created
  const Icon = meta.icon
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        meta.cls,
        className
      )}
    >
      <Icon className={clsx('h-3.5 w-3.5', meta.spin && 'animate-spin')} />
      {meta.label}
    </span>
  )
}
