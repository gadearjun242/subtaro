import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Sparkles, ArrowRight, Captions, Palette } from 'lucide-react'
import { uploadApi } from '@/api/upload.api'
import { projectApi } from '@/api/project.api'
import FileDropzone from '@/components/common/FileDropzone'
import SubtitleModeSelector from '@/components/dashboard/SubtitleModeSelector'
import SubtitleStyleSelector from '@/components/dashboard/SubtitleStyleSelector'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { apiError } from '@/lib/axios'

export default function NewProject() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [uploaded, setUploaded] = useState(null) // { file, inputType }
  const [name, setName] = useState('')
  // Defaults to the selectable soft-subtitle track, per product preference.
  const [subtitleMode, setSubtitleMode] = useState('selectable')
  const [subtitleStyle, setSubtitleStyle] = useState('classic')

  const uploadMutation = useMutation({
    mutationFn: (f) => uploadApi.uploadFile(f, setProgress),
    onSuccess: (res) => {
      setUploaded(res.data)
      setName((prev) => prev || file.name.replace(/\.[^/.]+$/, ''))
    },
    onError: (err) => {
      toast.error(apiError(err, 'Upload failed. Please try another file.'))
      setFile(null)
    },
  })

  const createMutation = useMutation({
    mutationFn: () =>
      projectApi.create({
        name: name.trim(),
        inputType: uploaded.inputType,
        input: uploaded.file,
        ...(uploaded.inputType === 'video'
          ? {
              subtitleMode,
              // Style only matters for burned-in captions.
              ...(subtitleMode === 'embedded' ? { subtitleStyle } : {}),
            }
          : {}),
      }),
    onSuccess: (res) => {
      toast.success('Project created — processing started')
      navigate(`/dashboard/projects/${res.data.projectId}`)
    },
    onError: (err) => {
      toast.error(apiError(err, 'Unable to create project'))
    },
  })

  const handleSelect = (f) => {
    setFile(f)
    setUploaded(null)
    setProgress(0)
    uploadMutation.mutate(f)
  }

  const handleClear = () => {
    setFile(null)
    setUploaded(null)
    setProgress(0)
  }

  const canSubmit = uploaded && name.trim().length > 0 && !createMutation.isPending

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wide">New project</span>
        </div>
        <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
          Upload your video or audio
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          We'll separate speakers, transcribe the content, and generate an
          accurate subtitle file automatically.
        </p>

        <div className="mt-7">
          <FileDropzone
            file={file}
            onSelect={handleSelect}
            onClear={handleClear}
            progress={uploadMutation.isPending ? progress : uploaded ? 100 : 0}
            disabled={uploadMutation.isPending || createMutation.isPending}
          />
        </div>

        {uploaded && (
          <div className="mt-6">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Client interview — round 2"
              maxLength={200}
            />
          </div>
        )}

        {uploaded && uploaded.inputType === 'video' && (
          <div className="mt-6">
            <div className="mb-2 flex items-center gap-1.5">
              <Captions className="h-4 w-4 text-slate-400" />
              <Label className="!mb-0">How should subtitles attach to the video?</Label>
            </div>
            <SubtitleModeSelector
              value={subtitleMode}
              onChange={setSubtitleMode}
              disabled={createMutation.isPending}
            />
          </div>
        )}

        {uploaded && uploaded.inputType === 'video' && subtitleMode === 'embedded' && (
          <div className="mt-6">
            <div className="mb-2 flex items-center gap-1.5">
              <Palette className="h-4 w-4 text-slate-400" />
              <Label className="!mb-0">Subtitle style</Label>
            </div>
            <SubtitleStyleSelector
              value={subtitleStyle}
              onChange={setSubtitleStyle}
              disabled={createMutation.isPending}
            />
          </div>
        )}

        <Button
          className="mt-7 w-full"
          size="lg"
          disabled={!canSubmit}
          loading={createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          Start processing <ArrowRight className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  )
}
