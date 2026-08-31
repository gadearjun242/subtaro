import { useQuery } from '@tanstack/react-query'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { FileText, Clock3, HardDrive, TrendingUp } from 'lucide-react'
import { userApi } from '@/api/user.api'
import Card from '@/components/ui/Card'
import StatCard from '@/components/dashboard/StatCard'
import { Skeleton } from '@/components/ui/Feedback'
import { formatBytes } from '@/lib/format'

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6528e0']

export default function Analytics() {
  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: () => userApi.getMyStats().then((r) => r.data),
  })
  const storageQuery = useQuery({
    queryKey: ['storage'],
    queryFn: () => userApi.getMyStorage().then((r) => r.data),
  })

  const stats = statsQuery.data
  const storage = storageQuery.data
  const loading = statsQuery.isLoading || storageQuery.isLoading

  const statusData = stats
    ? [
        { name: 'Completed', value: stats.projects.completed },
        { name: 'Failed', value: stats.projects.failed },
        { name: 'Processing', value: stats.projects.processing },
        {
          name: 'Other',
          value: Math.max(
            0,
            stats.projects.total - stats.projects.completed - stats.projects.failed - stats.projects.processing
          ),
        },
      ].filter((d) => d.value > 0)
    : []

  const storageData = storage
    ? [
        { name: 'Video', bytes: storage.videoFiles },
        { name: 'Audio', bytes: storage.audioFiles },
      ]
    : []

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Success rate"
          value={stats ? `${stats.projects.successRate}%` : '0%'}
          loading={loading}
          accent="emerald"
        />
        <StatCard
          icon={FileText}
          label="Words transcribed"
          value={stats?.transcription.totalWords ?? 0}
          loading={loading}
          accent="brand"
        />
        <StatCard
          icon={Clock3}
          label="Total processing time"
          value={stats?.processing.totalFormatted ?? '0s'}
          loading={loading}
          accent="amber"
        />
        <StatCard
          icon={HardDrive}
          label="Storage used"
          value={storage?.formatted ?? '0 B'}
          loading={loading}
          accent="sky"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Project outcomes</h3>
          <p className="mt-1 text-xs text-slate-400">Breakdown of every project you've run</p>
          <div className="mt-4 h-64">
            {loading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : statusData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No projects yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            {statusData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Files by type</h3>
          <p className="mt-1 text-xs text-slate-400">Video vs. audio uploads</p>
          <div className="mt-4 h-64">
            {loading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                  <Bar dataKey="bytes" name="Files" radius={[8, 8, 0, 0]} fill="#7548f0" maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Storage summary</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryStat label="Total files" value={storage?.files ?? 0} />
          <SummaryStat label="Total size" value={storage ? formatBytes(storage.bytes) : '0 B'} />
          <SummaryStat label="Video files" value={storage?.videoFiles ?? 0} />
          <SummaryStat label="Audio files" value={storage?.audioFiles ?? 0} />
        </div>
      </Card>
    </div>
  )
}

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}
