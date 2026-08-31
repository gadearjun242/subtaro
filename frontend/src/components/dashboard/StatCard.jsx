import clsx from 'clsx'
import { Skeleton } from '@/components/ui/Feedback'
import Card from '@/components/ui/Card'

export default function StatCard({ icon: Icon, label, value, hint, loading, accent = 'brand' }) {
  const accents = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', accents[accent])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-400">{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-7 w-20" />
      ) : (
        <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  )
}
