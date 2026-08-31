import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Check, Sparkles, ExternalLink, Info } from 'lucide-react'
import { planApi, subscriptionApi } from '@/api/plan.api'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Feedback'
import { PORTFOLIO_URL } from '@/lib/config'

export default function Pricing() {
  const { isAuthenticated } = useAuth()

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => planApi.list().then((r) => r.data.plans),
  })

  const subscriptionQuery = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getMine().then((r) => r.data),
    enabled: isAuthenticated,
  })

  const currentPlanKey = subscriptionQuery.data?.subscription?.planKey

  // Payments aren't wired up in this build — clicking any plan takes
  // visitors to my portfolio instead of faking a purchase.
  const handleChoose = () => {
    window.open(PORTFOLIO_URL, '_blank', 'noreferrer')
  }

  return (
    <div className="bg-grid">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">
            <Sparkles className="h-3.5 w-3.5" /> Simple, transparent pricing
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Start free. <span className="text-gradient">Upgrade any time.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-slate-500 dark:text-slate-400">
            Every account starts with a full-featured 30-day free trial — no card required.
            Pick a plan below whenever you're ready for more.
          </p>
        </div>

        {plansQuery.isLoading ? (
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-96 w-full rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {plansQuery.data?.map((plan, i) => {
              const isCurrent = currentPlanKey === plan.key
              const isPopular = plan.badge === 'Most popular'
              const isLifetime = plan.isLifetime

              return (
                <motion.div
                  key={plan.key}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
                  className={`relative flex flex-col rounded-3xl border p-6 transition-all hover:-translate-y-1 ${
                    isPopular || isLifetime
                      ? 'border-brand-300 bg-white shadow-xl shadow-brand-200/40 dark:border-brand-500/40 dark:bg-slate-900 dark:shadow-none'
                      : 'border-slate-200 bg-white hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-none'
                  }`}
                >
                  {plan.badge && (
                    <span
                      className={`absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-md ${
                        isLifetime ? 'bg-gradient-to-r from-accent-500 to-brand-600' : 'bg-brand-600'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  )}

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm font-medium text-slate-400">
                        {isLifetime ? 'once' : `/ ${plan.name.toLowerCase()}`}
                      </span>
                    )}
                  </div>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features?.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-7 w-full"
                    variant={isPopular || isLifetime ? 'primary' : 'outline'}
                    disabled={isCurrent}
                    onClick={handleChoose}
                  >
                    {isCurrent ? 'Current plan' : 'Choose plan'} <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )
            })}
          </div>
        )}

        <div className="mx-auto mt-10 flex max-w-lg items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This is a portfolio/demo project — payment processing isn't wired up, so choosing a
            plan links out to my portfolio instead.
          </p>
        </div>
      </div>
    </div>
  )
}
