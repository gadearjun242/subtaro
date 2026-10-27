import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 px-4 py-16 text-center dark:border-white/15">
      {Icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {actionLabel && (
        <div className="mt-6">
          {actionTo ? (
            <Link to={actionTo}>
              <Button>{actionLabel}</Button>
            </Link>
          ) : (
            <Button onClick={onAction}>{actionLabel}</Button>
          )}
        </div>
      )}
    </div>
  )
}
