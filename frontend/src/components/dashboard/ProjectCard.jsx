import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  FileVideo2,
  FileAudio2,
  ChevronRight,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
} from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import { ProgressBar } from '@/components/ui/Feedback'
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { formatDate, formatBytes } from '@/lib/format'
import { projectApi } from '@/api/project.api'
import { apiError } from '@/lib/axios'

export default function ProjectCard({ project }) {
  const isVideo = project.inputType === 'video'
  const progressPct = Math.min(100, Math.round(((project.lastCompletedStep || 0) / 5) * 100))
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(project.name)

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    queryClient.invalidateQueries({ queryKey: ['project', project.projectId] })
  }

  const renameMutation = useMutation({
    mutationFn: () => projectApi.rename(project._id, name.trim()),
    onSuccess: () => {
      toast.success('Project renamed')
      setRenameOpen(false)
      invalidateLists()
    },
    onError: (err) => toast.error(apiError(err, 'Unable to rename project')),
  })

  const duplicateMutation = useMutation({
    mutationFn: () => projectApi.duplicate(project._id),
    onSuccess: (res) => {
      toast.success('Project duplicated — processing started')
      invalidateLists()
      if (res?.data?.projectId) navigate(`/dashboard/projects/${res.data.projectId}`)
    },
    onError: (err) => toast.error(apiError(err, 'Unable to duplicate project')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => projectApi.remove(project._id),
    onSuccess: () => {
      toast.success('Project deleted')
      setDeleteOpen(false)
      invalidateLists()
    },
    onError: (err) => toast.error(apiError(err, 'Unable to delete project')),
  })

  return (
    <>
      <div className="group relative flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-none sm:p-5">
        <Link to={`/dashboard/projects/${project.projectId}`} className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
            {isVideo ? <FileVideo2 className="h-6 w-6" /> : <FileAudio2 className="h-6 w-6" />}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{project.name}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {formatDate(project.createdAt)} · {formatBytes(project.input?.sizeBytes)} · {project.projectId}
            </p>
            {['processing', 'queued', 'uploading'].includes(project.status) && (
              <div className="mt-2 max-w-xs">
                <ProgressBar value={progressPct} className="h-1.5" />
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            <StatusBadge status={project.status} />
          </div>
          <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600 sm:block" />
        </Link>

        <Dropdown
          trigger={
            <button
              onClick={(e) => e.preventDefault()}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          }
        >
          <DropdownItem
            icon={Pencil}
            onClick={() => {
              setName(project.name)
              setRenameOpen(true)
            }}
          >
            Rename
          </DropdownItem>
          <DropdownItem icon={Copy} onClick={() => duplicateMutation.mutate()}>
            {duplicateMutation.isPending ? 'Duplicating…' : 'Duplicate'}
          </DropdownItem>
          <DropdownItem
            icon={Trash2}
            onClick={() => setDeleteOpen(true)}
            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            Delete
          </DropdownItem>
        </Dropdown>
      </div>

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename project"
        footer={
          <>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={renameMutation.isPending}
              disabled={!name.trim()}
              onClick={() => renameMutation.mutate()}
            >
              Save
            </Button>
          </>
        }
      >
        <Label htmlFor={`rename-${project.projectId}`}>Project name</Label>
        <Input
          id={`rename-${project.projectId}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          autoFocus
        />
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this project?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This permanently deletes <strong>{project.name}</strong> and its uploaded files. This can't be undone.
        </p>
      </Modal>
    </>
  )
}
