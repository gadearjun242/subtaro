import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  )

  let lastRendered = 0

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p) => {
        const showEllipsis = p - lastRendered > 1
        lastRendered = p
        return (
          <span key={p} className="flex items-center gap-1.5">
            {showEllipsis && <span className="px-1 text-slate-400">…</span>}
            <button
              onClick={() => onChange(p)}
              className={clsx(
                'flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-colors',
                p === page
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
            >
              {p}
            </button>
          </span>
        )
      })}

      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
