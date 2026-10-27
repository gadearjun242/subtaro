import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { planApi } from '@/api/plan.api'
import Button from '@/components/ui/Button'

const formatPrice = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)

const INCLUDED = [
  'Vocal and instrumental stems',
  'Speaker-aware transcription',
  'Full studio editor',
  'Total caption styling',
  'Burned-in or selectable video',
  'Delete everything in one click',
]

export default function PricingTeaser() {
  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => planApi.list().then((r) => r.data.plans),
  })

  const monthly = plans?.find((p) => p.key === 'monthly')

  return (
    <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h2 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
          Free for 10 days.
          <br />
          <span className="text-slate-400 dark:text-slate-500">
            {monthly ? `Then from ${formatPrice(monthly.price, monthly.currency)} a month.` : 'Then simple, fair pricing.'}
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-500 dark:text-slate-400">
          Every feature is included from day one. No card, no catch.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="mx-auto mt-12 max-w-3xl rounded-[2rem] border border-black/5 bg-slate-50 p-8 dark:border-white/10 dark:bg-white/[0.04] sm:p-10"
      >
        <ul className="grid gap-3.5 sm:grid-cols-2">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[15px] text-slate-700 dark:text-slate-200">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register">
            <Button size="lg">Start your free trial</Button>
          </Link>
          <Link to="/pricing">
            <Button size="lg" variant="ghost">See all plans</Button>
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
