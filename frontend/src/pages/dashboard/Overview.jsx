import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FolderKanban, CheckCircle2, Clock3, HardDrive, PlusCircle, ArrowRight, Sparkles } from 'lucide-react'
import { userApi } from '@/api/user.api'
import StatCard from '@/components/dashboard/StatCard'
import ProjectCard from '@/components/dashboard/ProjectCard'
import EmptyState from '@/components/common/EmptyState'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Feedback'
import { useAuth } from '@/context/AuthContext'

export default function Overview() {
  const { user } = useAuth()

  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: () => userApi.getMyStats().then((r) => r.data),
  })

  const storageQuery = useQuery({
    queryKey: ['storage'],
    queryFn: () => userApi.getMyStorage().then((r) => r.data),
  })

  const recentQuery = useQuery({
    queryKey: ['projects', { page: 1, limit: 5 }],
    queryFn: () => userApi.getMyProjects({ page: 1, limit: 5 }).then((r) => r.data),
  })

  const stats = statsQuery.data
  const storage = storageQuery.data

  return (
    <div className="space-y-8">
      <Card className="relative overflow-hidden border-brand-500/10 bg-gradient-to-br from-brand-50 via-white to-accent-500/[0.06] p-6 dark:border-white/[0.08] dark:from-[#111a2b] dark:via-[#111725] dark:to-[#20142e] sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-brand-500/10 blur-[80px]" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <span className="premium-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Your workspace</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Welcome back, {user?.name?.split(' ')[0]}.
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300 sm:text-base">
              Your next polished subtitle project starts here.
            </p>
          </div>
          <Link to="/dashboard/projects/new" className="sm:shrink-0">
            <Button className="w-full sm:w-auto">
              <PlusCircle className="h-4 w-4" /> New project
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          icon={FolderKanban}
          label="Total projects"
          value={stats?.projects.total ?? 0}
          loading={statsQuery.isLoading}
          accent="brand"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats?.projects.completed ?? 0}
          hint={stats ? `${stats.projects.successRate}% success rate` : undefined}
          loading={statsQuery.isLoading}
          accent="emerald"
        />
        <StatCard
          icon={Clock3}
          label="Avg. processing time"
          value={stats?.processing.averageFormatted ?? '0s'}
          loading={statsQuery.isLoading}
          accent="amber"
        />
        <StatCard
          icon={HardDrive}
          label="Storage used"
          value={storage?.formatted ?? '0 B'}
          hint={storage ? `${storage.files} files uploaded` : undefined}
          loading={storageQuery.isLoading}
          accent="sky"
        />
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center px-1 sm:px-0 justify-between gap-2">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Recent projects</h3>
          <Link
            to="/dashboard/projects"
            className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {recentQuery.isLoading &&
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}

          {!recentQuery.isLoading && recentQuery.data?.projects?.length === 0 && (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Upload your first video or audio file to generate subtitles."
              actionLabel="Create your first project"
              actionTo="/dashboard/projects/new"
            />
          )}

          {recentQuery.data?.projects?.map((project) => (
            <ProjectCard key={project.projectId} project={project} />
          ))}
        </div>
      </Card>
    </div>
  )
}
