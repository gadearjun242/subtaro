import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { subscriptionApi } from '@/api/plan.api'

// Compact plan status for the sidebar: trial countdown or current plan.
export default function PlanCard({ onNavigate }) {
  const { data } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getMine().then((r) => r.data),
    staleTime: 60 * 1000,
  })

  const sub = data?.subscription
  if (!sub) return null

  const trialing = sub.status === 'trialing'
  const ended = !sub.isActive
  const days = sub.daysRemaining

  const title = ended ? 'Plan ended' : trialing ? 'Free trial' : data?.plan?.name || 'Active plan'
  const detail = ended
    ? 'Choose a plan to keep creating.'
    : days == null
      ? 'No expiry'
      : `${days} ${days === 1 ? 'day' : 'days'} left`

  return (
    <Link
      to="/pricing"
      onClick={onNavigate}
      className="block rounded-2xl bg-slate-100 p-3.5 transition-colors hover:bg-slate-200/70 dark:bg-white/[0.06] dark:hover:bg-white/10"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
        <Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
        {title}
      </div>
      <p className={ended ? 'mt-1 text-xs text-red-600 dark:text-red-400' : 'mt-1 text-xs text-slate-500 dark:text-slate-400'}>
        {detail}
      </p>
      {(trialing || ended) && (
        <span className="mt-2.5 inline-block text-xs font-semibold text-brand-600 dark:text-brand-400">View plans</span>
      )}
    </Link>
  )
}
