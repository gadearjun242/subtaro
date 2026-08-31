import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FolderKanban, CheckCircle2, Clock3, HardDrive, PlusCircle, ArrowRight } from 'lucide-react'
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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Here's what's happening with your subtitle projects.
          </p>
        </div>
        <Link to="/dashboard/projects/new">
          <Button>
            <PlusCircle className="h-4 w-4" /> New project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent projects</h3>
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
