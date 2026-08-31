import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { MailWarning, X } from 'lucide-react'
import { authApi } from '@/api/auth.api'
import { apiError } from '@/lib/axios'

export default function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(false)

  const resendMutation = useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: (res) => toast.success(res?.message || 'Verification email sent'),
    onError: (err) => toast.error(apiError(err, 'Unable to resend verification email')),
  })

  if (dismissed) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-500/20 dark:bg-amber-500/10 sm:px-6">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
        <MailWarning className="h-4 w-4 shrink-0" />
        <span>Please verify your email address to secure your account.</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => resendMutation.mutate()}
          disabled={resendMutation.isPending}
          className="cursor-pointer font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 disabled:opacity-60 dark:text-amber-400 dark:hover:text-amber-300"
        >
          {resendMutation.isPending ? 'Sending…' : 'Resend email'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
