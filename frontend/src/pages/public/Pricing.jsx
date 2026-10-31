import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { m as motion } from 'framer-motion'
import { Check, ExternalLink, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { planApi, subscriptionApi, paymentApi } from '@/api/plan.api'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Feedback'
import { PORTFOLIO_URL } from '@/lib/config'
import PLAN_CATALOG from '../../../../backend/data/planCatalog.json'

const formatPrice = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)

const CYCLE_LABEL = {
  monthly: 'month',
  quarterly: '3 months',
  half_yearly: '6 months',
  yearly: 'year',
}

// Razorpay's checkout script is only loaded when someone actually pays.
const loadCheckout = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve()
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load the payment window'))
    document.body.appendChild(script)
  })

export default function Pricing() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [payingKey, setPayingKey] = useState(null)

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => planApi.list().then((r) => r.data.plans),
    initialData: PLAN_CATALOG,
    initialDataUpdatedAt: 0,
  })

  const configQuery = useQuery({
    queryKey: ['payment-config'],
    queryFn: () => paymentApi.config().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const subscriptionQuery = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getMine().then((r) => r.data),
    enabled: isAuthenticated,
  })

  const config = configQuery.data
  const paymentsEnabled = Boolean(config?.enabled)
  const portfolioUrl = config?.portfolioUrl || PORTFOLIO_URL
  const currentPlanKey = subscriptionQuery.data?.subscription?.planKey
  const subscription = subscriptionQuery.data?.subscription

  const handleChoose = async (plan) => {
    if (!paymentsEnabled) {
      window.open(portfolioUrl, '_blank', 'noreferrer')
      return
    }

    if (!isAuthenticated) {
      navigate('/register')
      return
    }

    setPayingKey(plan.key)

    try {
      await loadCheckout()
      const { data: order } = await paymentApi.createOrder(plan.key)

      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Subtaro',
        description: `${order.plan.name} plan`,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#0071e3' },
        handler: async (response) => {
          try {
            await paymentApi.verify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })
            await queryClient.invalidateQueries({ queryKey: ['subscription'] })
            toast.success('Payment successful. Your plan is active.')
            navigate('/dashboard')
          } catch {
            toast.error('Payment could not be verified. If you were charged, contact support.')
          } finally {
            setPayingKey(null)
          }
        },
        modal: { ondismiss: () => setPayingKey(null) },
      })

      checkout.open()
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Unable to start checkout')
      setPayingKey(null)
    }
  }

  const paidPlans = plansQuery.data?.filter((p) => p.price > 0) ?? []

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[34rem] w-[56rem] -translate-x-1/2 rounded-full bg-brand-500/[0.09] blur-[120px] dark:bg-brand-500/[0.13]" />
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="premium-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Simple, transparent pricing</span>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            Start free.
            <br />
            <span className="text-gradient">Stay for the details.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-500 dark:text-slate-400">
            Every account includes a full 10-day free trial. No card required. Pick a plan
            when you are ready to keep going.
          </p>

          {subscription?.status === 'trialing' && subscription.daysRemaining != null && (
            <p className="mt-5 inline-block rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              {subscription.daysRemaining} {subscription.daysRemaining === 1 ? 'day' : 'days'} left in your trial
            </p>
          )}
        </div>

        {plansQuery.isLoading ? (
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-96 w-full rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {paidPlans.map((plan, i) => {
              const isCurrent = currentPlanKey === plan.key && subscription?.status === 'active'
              const isPopular = plan.badge === 'Most popular'

              return (
                <motion.div
                  key={plan.key}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className={`relative flex flex-col rounded-[1.75rem] border p-7 shadow-[0_24px_70px_-44px_rgb(0_0_0/0.75)] transition-transform duration-300 hover:-translate-y-1 ${
                    isPopular
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-brand-400/40 dark:bg-gradient-to-br dark:from-brand-600 dark:to-accent-500 dark:text-white'
                      : 'border-black/[0.06] bg-[#fbfaf7]/85 text-slate-900 backdrop-blur-xl dark:border-white/[0.09] dark:bg-[#111725]/85 dark:text-white'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute right-5 top-5 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                      {plan.badge}
                    </span>
                  )}

                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm opacity-60">{plan.description}</p>

                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold tracking-tight">
                      {formatPrice(plan.price, plan.currency)}
                    </span>
                    <span className="text-sm opacity-60">/ {CYCLE_LABEL[plan.key] || 'cycle'}</span>
                  </div>

                  <ul className="mt-7 flex-1 space-y-3">
                    {plan.features?.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm opacity-80">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-8 w-full"
                    variant={isPopular ? 'primary' : 'secondary'}
                    disabled={isCurrent}
                    loading={payingKey === plan.key}
                    onClick={() => handleChoose(plan)}
                  >
                    {isCurrent
                      ? 'Current plan'
                      : paymentsEnabled
                        ? 'Buy now'
                        : (
                          <>
                            Choose plan <ExternalLink className="h-3.5 w-3.5" />
                          </>
                        )}
                  </Button>
                </motion.div>
              )
            })}
          </div>
        )}

        {!paymentsEnabled && (
          <p className="mx-auto mt-10 max-w-lg text-center text-sm text-slate-500 dark:text-slate-400">
            Online checkout is coming soon. Choosing a plan opens my{' '}
            <a
              href={portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              portfolio
            </a>
            , where you can reach me to get your plan activated.
          </p>
        )}
      </div>
    </div>
  )
}
