import { forwardRef } from 'react'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:
    'bg-gradient-to-r from-brand-600 to-accent-500 text-white shadow-[0_10px_26px_-12px_rgb(10_132_255/0.72)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgb(10_132_255/0.8)] focus-visible:ring-brand-400',
  secondary:
    'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 focus-visible:ring-slate-400',
  outline:
    'border border-slate-300 text-slate-800 hover:bg-slate-50 dark:border-white/20 dark:text-slate-100 dark:hover:bg-white/10 focus-visible:ring-slate-400',
  ghost:
    'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 focus-visible:ring-slate-400',
  danger:
    'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-400',
}

const sizes = {
  sm: 'h-8 px-4 text-[13px] gap-1.5',
  md: 'h-10 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-[17px] gap-2',
  icon: 'h-10 w-10 shrink-0',
}

const Button = forwardRef(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-full font-medium transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
