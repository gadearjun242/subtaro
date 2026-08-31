import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
      {Icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
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
