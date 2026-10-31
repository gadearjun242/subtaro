import clsx from 'clsx'

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-[1.5rem] border border-[color:var(--surface-border)] bg-[var(--surface-card)] shadow-[0_12px_40px_-24px_rgb(35_42_57/0.16)] dark:shadow-[0_24px_70px_-44px_rgb(0_0_0/0.9)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
