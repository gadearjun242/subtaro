import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { authApi } from '@/api/auth.api'
import { apiError } from '@/lib/axios'
import Button from '@/components/ui/Button'
import Logo from '@/components/common/Logo'
import { useAuth } from '@/context/AuthContext'

export default function VerifyEmail() {
  const { token } = useParams()
  const { isAuthenticated, refetchMe } = useAuth()
  const [state, setState] = useState('loading') // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    authApi
      .verifyEmail(token)
      .then((res) => {
        if (cancelled) return
        setState('success')
        setMessage(res?.message || 'Email verified successfully')
        if (isAuthenticated) refetchMe()
      })
      .catch((err) => {
        if (cancelled) return
        setState('error')
        setMessage(apiError(err, 'This verification link is invalid or has expired'))
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-grid px-4">
      <Logo className="mb-10" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
      >
        {state === 'loading' && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <Loader2 className="h-7 w-7 animate-spin" />
            </span>
            <h1 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">Verifying your email…</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Just a moment.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h1 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">Email verified</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{message}</p>
            <Link to={isAuthenticated ? '/dashboard' : '/login'} className="mt-6 inline-block">
              <Button>
                {isAuthenticated ? 'Go to dashboard' : 'Log in'} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <XCircle className="h-7 w-7" />
            </span>
            <h1 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">Verification failed</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{message}</p>
            <Link to={isAuthenticated ? '/dashboard/profile' : '/login'} className="mt-6 inline-block">
              <Button variant="outline">
                {isAuthenticated ? 'Request a new link' : 'Log in'}
              </Button>
            </Link>
          </>
        )}
      </motion.div>
    </div>
  )
}
