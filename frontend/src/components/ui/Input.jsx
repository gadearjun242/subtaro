import { forwardRef, useState } from 'react'
import clsx from 'clsx'
import { Eye, EyeOff } from 'lucide-react'

export const Label = ({ className, children, ...props }) => (
  <label
    className={clsx('mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300', className)}
    {...props}
  >
    {children}
  </label>
)

export const Input = forwardRef(({ className, icon: Icon, error, type = 'text', ...props }, ref) => {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const resolvedType = isPassword ? (show ? 'text' : 'password') : type

  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      )}
      <input
        ref={ref}
        type={resolvedType}
        className={clsx(
          'h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400/50 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
          Icon && 'pl-10',
          isPassword && 'pr-10',
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-slate-200 focus:border-brand-400 dark:border-slate-700',
          className
        )}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  )
})
Input.displayName = 'Input'

export const Textarea = forwardRef(({ className, error, ...props }, ref) => (
  <textarea
    ref={ref}
    className={clsx(
      'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400/50 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
      error
        ? 'border-red-400 focus:border-red-500'
        : 'border-slate-200 focus:border-brand-400 dark:border-slate-700',
      className
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const FieldError = ({ children }) => {
  if (!children) return null
  return <p className="mt-1.5 text-xs font-medium text-red-500">{children}</p>
}
