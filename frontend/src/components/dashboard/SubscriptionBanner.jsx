import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Clock, Lock } from 'lucide-react'
import { subscriptionApi } from '@/api/plan.api'

// Shows the trial countdown (last 5 days) and a clear "ended" state
// once the trial or plan lapses. Paid users with time left see nothing.
export default function SubscriptionBanner() {
  const queryClient = useQueryClient()

  // Any API call blocked by an ended trial/plan (HTTP 402) lands here.
  useEffect(() => {
    const onRequired = () => {
      toast.error('Your trial or plan has ended. Choose a plan to continue.')
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    }
    window.addEventListener('subscription:required', onRequired)
    return () => window.removeEventListener('subscription:required', onRequired)
  }, [queryClient])

  const { data } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getMine().then((r) => r.data),
    staleTime: 60 * 1000,
  })

  const sub = data?.subscription
  if (!sub) return null

  if (!sub.isActive) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm dark:border-red-500/20 dark:bg-red-500/10 sm:px-6">
        <span className="flex items-center gap-2 text-red-800 dark:text-red-300">
          <Lock className="h-4 w-4 shrink-0" />
          Your {sub.status === 'trialing' ? 'free trial' : 'plan'} has ended. You can still view, download and delete your projects.
        </span>
        <Link to="/pricing" className="font-semibold text-red-800 underline underline-offset-2 dark:text-red-300">
          Choose a plan
        </Link>
      </div>
    )
  }

  if (sub.status === 'trialing' && sub.daysRemaining != null && sub.daysRemaining <= 5) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-200 bg-brand-50 px-4 py-2.5 text-sm dark:border-brand-500/20 dark:bg-brand-500/10 sm:px-6">
        <span className="flex items-center gap-2 text-brand-800 dark:text-brand-300">
          <Clock className="h-4 w-4 shrink-0" />
          {sub.daysRemaining} {sub.daysRemaining === 1 ? 'day' : 'days'} left in your free trial.
        </span>
        <Link to="/pricing" className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300">
          View plans
        </Link>
      </div>
    )
  }

  return null
}
