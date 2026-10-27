import clsx from 'clsx'

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-3xl border border-black/5 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
