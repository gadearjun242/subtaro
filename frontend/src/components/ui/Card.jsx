import clsx from 'clsx'

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
