import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  Download,
  ScrollText,
  Captions,
  Wifi,
  WifiOff,
  Loader2,
  ListVideo,
  Flame,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
} from 'lucide-react'
import { userApi } from '@/api/user.api'
import { projectApi } from '@/api/project.api'
import { useProjectSocket } from '@/hooks/useProjectSocket'
import { useSocket } from '@/context/SocketContext'
import { useMediaTime } from '@/hooks/useMediaTime'
import { parseSrt, findActiveCue, srtToVtt } from '@/lib/srt'
import { downloadRemoteFile } from '@/lib/download'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Feedback'
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown'
import Modal from '@/components/ui/Modal'
import { Input, Label } from '@/components/ui/Input'
import PipelineSteps from '@/components/dashboard/PipelineSteps'
import SubtitlePanel from '@/components/dashboard/SubtitlePanel'
import SyncedCaptions from '@/components/dashboard/SyncedCaptions'
import LogsPanel from '@/components/dashboard/LogsPanel'
import { formatDate, formatBytes, formatDuration } from '@/lib/format'
import { apiError } from '@/lib/axios'

const SUBTITLE_STYLE_LABELS = {
  classic: 'Classic',
  bold_yellow: 'Bold Yellow',
  minimal_top: 'Minimal Top',
  cinematic: 'Cinematic',
}

const TABS = [
  { id: 'subtitle', label: 'Subtitle', icon: Captions },
  { id: 'logs', label: 'Logs', icon: ScrollText },
]

export default function ProjectDetail() {
  const { projectId } = useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { connected } = useSocket()
  const [tab, setTab] = useState('subtitle')
  const [captionsVisible, setCaptionsVisible] = useState(true)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const mediaRef = useRef(null)

  const query = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => userApi.getMyProject(projectId).then((r) => r.data.project),
    refetchInterval: (q) =>
      ['processing', 'queued', 'uploading'].includes(q.state.data?.status) ? 6000 : false,
  })

  const project = query.data

  // Same query key SubtitlePanel uses, so both share one cached fetch.
  const subtitleFileUrl = project?.subtitle?.status === 'completed' ? project.subtitle.file?.url : null
  const subtitleTextQuery = useQuery({
    queryKey: ['subtitle-text', subtitleFileUrl],
    queryFn: async () => {
      const res = await fetch(subtitleFileUrl)
      if (!res.ok) throw new Error('Could not load subtitle text')
      return res.text()
    },
    enabled: Boolean(subtitleFileUrl),
    retry: 1,
  })

  const cues = useMemo(() => parseSrt(subtitleTextQuery.data), [subtitleTextQuery.data])

  const hasOutputVideo = project?.output?.status === 'completed' && Boolean(project?.output?.file?.url)
  const isSelectableMode = hasOutputVideo && project?.output?.mode === 'selectable'

  // Both delivery modes now produce a single, directly-playable .mp4
  // (see BACKEND.md), so playback always uses the output once it's
  // ready, falling back to the raw input before that.
  const mediaSrc = project?.output?.file?.url || project?.input?.url
  const { currentTime } = useMediaTime(mediaRef, mediaSrc)
  const activeCue = useMemo(() => findActiveCue(cues, currentTime), [cues, currentTime])

  // "selectable" mode's mov_text track isn't reliably exposed by
  // browsers' native caption picker (a long-standing, inconsistent
  // limitation across Chrome/Firefox/Safari, independent of this
  // app) - so we still attach a client-side WebVTT <track> for a
  // guaranteed in-page toggle. "embedded" mode needs nothing extra
  // since captions are already burned into the pixels.
  const [vttUrl, setVttUrl] = useState(null)
  useEffect(() => {
    if (!isSelectableMode || !subtitleTextQuery.data) {
      setVttUrl(null)
      return undefined
    }
    const blob = new Blob([srtToVtt(subtitleTextQuery.data)], { type: 'text/vtt' })
    const url = URL.createObjectURL(blob)
    setVttUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [isSelectableMode, subtitleTextQuery.data])

  const [downloadingVideo, setDownloadingVideo] = useState(false)
  const handleDownloadVideo = async () => {
    if (!project?.output?.file?.url) return
    setDownloadingVideo(true)
    try {
      const ext = project.output.file.format || 'mp4'
      await downloadRemoteFile(project.output.file.url, `${project.name || 'video'}.${ext}`)
    } catch {
      toast.error('Download failed — opening the file instead')
      window.open(project.output.file.url, '_blank', 'noreferrer')
    } finally {
      setDownloadingVideo(false)
    }
  }

  // Live updates: any event for this project invalidates + refetches details.
  useProjectSocket(projectId, (payload) => {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    if (payload.message) toast(payload.message, { icon: '⚡' })
  })

  const refreshMutation = useMutation({
    mutationFn: () => projectApi.refresh(project._id),
    onSuccess: () => {
      toast.success('Status refreshed')
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (err) => toast.error(apiError(err, 'Unable to refresh status')),
  })

  const resumeMutation = useMutation({
    mutationFn: () => projectApi.resume(project._id),
    onSuccess: () => {
      toast.success('Resume requested')
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (err) => toast.error(apiError(err, 'Unable to resume project')),
  })

  const renameMutation = useMutation({
    mutationFn: () => projectApi.rename(project._id, nameDraft.trim()),
    onSuccess: () => {
      toast.success('Project renamed')
      setRenameOpen(false)
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (err) => toast.error(apiError(err, 'Unable to rename project')),
  })

  const duplicateMutation = useMutation({
    mutationFn: () => projectApi.duplicate(project._id),
    onSuccess: (res) => {
      toast.success('Project duplicated — processing started')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      if (res?.data?.projectId) navigate(`/dashboard/projects/${res.data.projectId}`)
    },
    onError: (err) => toast.error(apiError(err, 'Unable to duplicate project')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => projectApi.remove(project._id),
    onSuccess: () => {
      toast.success('Project deleted')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate('/dashboard/projects')
    },
    onError: (err) => toast.error(apiError(err, 'Unable to delete project')),
  })

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (query.isError || !project) {
    return (
      <Card className="p-10 text-center">
        <p className="font-semibold text-slate-700 dark:text-slate-200">Project not found</p>
        <Link to="/dashboard/projects" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Back to projects
          </Button>
        </Link>
      </Card>
    )
  }

  const isVideo = project.inputType === 'video'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/dashboard/projects"
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-brand-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All projects
          </Link>
          <h2 className="flex items-center gap-3 text-xl font-extrabold text-slate-900 dark:text-white">
            {project.name}
            <StatusBadge status={project.status} />
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {project.projectId} · Created {formatDate(project.createdAt)}
            {project.processing?.durationSeconds
              ? ` · Processed in ${formatDuration(project.processing.durationSeconds)}`
              : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              connected
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
          >
            {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {connected ? 'Live' : 'Offline'}
          </span>
          <Button size="sm" variant="outline" loading={refreshMutation.isPending} onClick={() => refreshMutation.mutate()}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          {project.status === 'failed' && (
            <Button size="sm" loading={resumeMutation.isPending} onClick={() => resumeMutation.mutate()}>
              <RotateCcw className="h-3.5 w-3.5" /> Resume
            </Button>
          )}
          <Dropdown
            align="right"
            trigger={
              <button className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <MoreVertical className="h-4 w-4" />
              </button>
            }
          >
            <DropdownItem
              icon={Pencil}
              onClick={() => {
                setNameDraft(project.name)
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
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left column: media + tabs */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="relative flex aspect-video items-center justify-center bg-slate-950">
              {isVideo && project.output?.status === 'processing' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/70 backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
                  <p className="text-sm font-medium text-white">
                    {project.subtitleMode === 'selectable'
                      ? 'Adding the selectable subtitle track…'
                      : 'Re-rendering video with your edited subtitles…'}
                  </p>
                </div>
              )}
              {isVideo ? (
                mediaSrc ? (
                  <video
                    key={mediaSrc}
                    ref={mediaRef}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full"
                  >
                    <source
                      src={mediaSrc}
                      type={`video/${(project.output?.file?.format || project.input?.format || 'mp4').toLowerCase()}`}
                    />
                    {vttUrl && <track kind="subtitles" src={vttUrl} srcLang="en" label="English" default />}
                    Your browser doesn't support embedded video playback.
                  </video>
                ) : (
                  <p className="text-sm text-slate-400">Video preview will appear once the file finishes uploading.</p>
                )
              ) : (
                <div className="flex w-full flex-col items-center gap-4 px-8 py-16">
                  <Captions className="h-10 w-10 text-slate-600" />
                  {project.input?.url ? (
                    <audio ref={mediaRef} src={project.input.url} controls preload="metadata" className="w-full max-w-md" />
                  ) : (
                    <p className="text-sm text-slate-400">Audio preview will appear once the file finishes uploading.</p>
                  )}
                </div>
              )}
            </div>

            {/* Live captions synced to playback time - always for audio (no burned-in
                captions possible there); for video, only while there's no output yet
                (still showing raw progress) - once the output exists, "embedded" mode
                already shows captions burned in, and "selectable" mode has the native
                <track> toggle above, so this would just duplicate either one. */}
            {(!isVideo || !hasOutputVideo) && project.subtitle?.status === 'completed' && (
              <SyncedCaptions
                cues={cues}
                activeCue={activeCue}
                currentTime={currentTime}
                visible={captionsVisible}
                onToggleVisible={() => setCaptionsVisible((v) => !v)}
                loading={subtitleTextQuery.isLoading}
              />
            )}

            {hasOutputVideo && project.output?.status !== 'processing' && (
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {isSelectableMode ? (
                    <>
                      <ListVideo className="h-3.5 w-3.5" /> Selectable subtitle track (.mp4)
                    </>
                  ) : (
                    <>
                      <Flame className="h-3.5 w-3.5" /> Burned-in captions ready
                    </>
                  )}
                </span>
                <Button size="sm" variant="secondary" loading={downloadingVideo} onClick={handleDownloadVideo}>
                  <Download className="h-3.5 w-3.5" /> Download video
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex gap-1 border-b border-slate-100 dark:border-slate-800">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex cursor-pointer items-center gap-1.5 border-b-2 px-3 pb-3 text-sm font-semibold transition-colors ${
                    tab === id
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            <div className="pt-5">
              {tab === 'subtitle' && (
                <SubtitlePanel
                  subtitle={project.subtitle}
                  mongoId={project._id}
                  isVideo={isVideo}
                  currentMode={project.subtitleMode}
                  currentStyle={project.subtitleStyle}
                  onUpdated={() => queryClient.invalidateQueries({ queryKey: ['project', projectId] })}
                />
              )}
              {tab === 'logs' && <LogsPanel mongoId={project._id} />}
            </div>
          </Card>
        </div>

        {/* Right column: pipeline + file info */}
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pipeline</h3>
            <div className="mt-5">
              <PipelineSteps steps={project.steps} />
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">File details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Type" value={project.inputType} />
              <Row label="Original name" value={project.input?.originalName} />
              <Row label="Size" value={formatBytes(project.input?.sizeBytes)} />
              <Row label="Format" value={project.input?.format?.toUpperCase()} />
              <Row
                label="Duration"
                value={project.input?.durationSeconds ? formatDuration(project.input.durationSeconds) : '—'}
              />
              {isVideo && (
                <Row
                  label="Subtitle delivery"
                  value={project.subtitleMode === 'selectable' ? 'Selectable track (.mp4)' : 'Burned-in'}
                />
              )}
              {isVideo && project.subtitleMode === 'embedded' && (
                <Row label="Subtitle style" value={SUBTITLE_STYLE_LABELS[project.subtitleStyle] || 'Classic'} />
              )}
            </dl>
          </Card>

          {project.error && (
            <Card className="border-red-200 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/10">
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400">Error</h3>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{project.error}</p>
            </Card>
          )}
        </div>
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
              disabled={!nameDraft.trim()}
              onClick={() => renameMutation.mutate()}
            >
              Save
            </Button>
          </>
        }
      >
        <Label htmlFor="project-rename">Project name</Label>
        <Input
          id="project-rename"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
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
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="truncate font-medium text-slate-700 dark:text-slate-200">{value || '—'}</dd>
    </div>
  )
}
