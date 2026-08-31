import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, FolderKanban, PlusCircle } from 'lucide-react'
import { userApi } from '@/api/user.api'
import ProjectCard from '@/components/dashboard/ProjectCard'
import EmptyState from '@/components/common/EmptyState'
import Pagination from '@/components/common/Pagination'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Feedback'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'created', label: 'Created' },
  { value: 'uploading', label: 'Uploading' },
  { value: 'queued', label: 'Queued' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function ProjectsList() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 400)

  const query = useQuery({
    queryKey: ['projects', { page, status, search: debouncedSearch }],
    queryFn: () =>
      userApi
        .getMyProjects({ page, limit: 10, status: status || undefined, search: debouncedSearch || undefined })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const projects = query.data?.projects || []
  const pagination = query.data?.pagination

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="max-w-sm flex-1">
            <Input
              icon={Search}
              placeholder="Search by name or project ID…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <Link to="/dashboard/projects/new">
          <Button className="w-full sm:w-auto">
            <PlusCircle className="h-4 w-4" /> New project
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {query.isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}

        {!query.isLoading && projects.length === 0 && (
          <EmptyState
            icon={FolderKanban}
            title="No projects found"
            description={
              search || status
                ? 'Try adjusting your search or filters.'
                : 'Upload your first video or audio file to generate subtitles.'
            }
            actionLabel={!search && !status ? 'Create your first project' : undefined}
            actionTo="/dashboard/projects/new"
          />
        )}

        {projects.map((project) => (
          <ProjectCard key={project.projectId} project={project} />
        ))}
      </div>

      {pagination && (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
      )}
    </div>
  )
}
