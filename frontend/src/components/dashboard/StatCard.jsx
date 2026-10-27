import clsx from 'clsx'
import { Skeleton } from '@/components/ui/Feedback'
import Card from '@/components/ui/Card'

const ACCENTS = {
  brand: 'text-brand-600 dark:text-brand-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
  sky: 'text-sky-600 dark:text-sky-400',
}

export default function StatCard({ icon: Icon, label, value, hint, loading, accent = 'brand' }) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Icon className={clsx('h-4 w-4 shrink-0', ACCENTS[accent])} />
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-24" />
      ) : (
        <p className="mt-3 break-words text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {value}
        </p>
      )}
      {hint && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </Card>
  )
}
