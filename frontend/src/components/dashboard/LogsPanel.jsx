import { useQuery } from '@tanstack/react-query'
import { projectApi } from '@/api/project.api'
import { Skeleton } from '@/components/ui/Feedback'
import { formatDateTime } from '@/lib/format'
import { ScrollText } from 'lucide-react'

const LEVEL_COLORS = {
  info: 'text-slate-400',
  warning: 'text-amber-500',
  error: 'text-red-500',
  debug: 'text-sky-400',
}

export default function LogsPanel({ mongoId }) {
  const query = useQuery({
    queryKey: ['project-logs', mongoId],
    queryFn: () => projectApi.getLogs(mongoId).then((r) => r.data),
    enabled: Boolean(mongoId),
    refetchInterval: 8000,
  })

  const logs = query.data?.logs || []

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-400">
        <ScrollText className="h-6 w-6 text-slate-300 dark:text-slate-700" />
        No logs yet.
      </div>
    )
  }

  return (
    <div className="max-h-96 space-y-1.5 overflow-y-auto scrollbar-thin rounded-xl bg-slate-950 p-4 font-mono text-xs">
      {logs.map((log) => (
        <div key={log._id} className="flex gap-2">
          <span className="shrink-0 text-slate-500">{formatDateTime(log.timestamp)}</span>
          <span className={`shrink-0 font-bold uppercase ${LEVEL_COLORS[log.level] || 'text-slate-400'}`}>
            {log.level}
          </span>
          <span className="text-slate-200">{log.message}</span>
        </div>
      ))}
    </div>
  )
}
