import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Download, Pencil, Save, X, AlertTriangle, ExternalLink, Captions, Copy, Check, Palette } from 'lucide-react'
import toast from 'react-hot-toast'
import { projectApi } from '@/api/project.api'
import Button from '@/components/ui/Button'
import { Textarea, Label } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Feedback'
import SubtitleModeSelector from '@/components/dashboard/SubtitleModeSelector'
import SubtitleStyleSelector from '@/components/dashboard/SubtitleStyleSelector'
import { apiError } from '@/lib/axios'
import { downloadRemoteFile } from '@/lib/download'

export default function SubtitlePanel({ subtitle, mongoId, isVideo, currentMode, currentStyle, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftMode, setDraftMode] = useState(currentMode || 'embedded')
  const [draftStyle, setDraftStyle] = useState(currentStyle || 'classic')
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileUrl = subtitle?.file?.url

  const textQuery = useQuery({
    queryKey: ['subtitle-text', fileUrl],
    queryFn: async () => {
      const res = await fetch(fileUrl)
      if (!res.ok) throw new Error('Could not load subtitle text')
      return res.text()
    },
    enabled: Boolean(fileUrl),
    retry: 1,
  })

  const saveMutation = useMutation({
    // 1) uploads the edited content as a brand new Cloudinary file
    // 2) backend deletes the previous file by its publicId only
    //    after the new upload succeeds
    // 3) backend updates the project's subtitle.file + counts, and
    //    (for video projects) re-renders the output in whichever
    //    mode/style is selected below
    mutationFn: () =>
      projectApi.updateSubtitle(
        mongoId,
        draft,
        isVideo && draftMode !== currentMode ? draftMode : undefined,
        isVideo && draftStyle !== currentStyle ? draftStyle : undefined
      ),
    onSuccess: (res) => {
      if (res?.data?.outputRegenerating) {
        toast.success(
          res.data.subtitleMode === 'selectable'
            ? 'Subtitle saved — re-muxing the selectable track…'
            : 'Subtitle saved — re-rendering the video with your edits…'
        )
      } else {
        toast.success('Subtitle updated and saved')
      }
      setEditing(false)
      onUpdated?.()
    },
    onError: (err) => toast.error(apiError(err, 'Unable to save subtitle changes')),
  })

  const startEditing = () => {
    setDraft(textQuery.data || '')
    setDraftMode(currentMode || 'embedded')
    setDraftStyle(currentStyle || 'classic')
    setEditing(true)
  }

  const handleCopy = async () => {
    if (!textQuery.data) return
    try {
      await navigator.clipboard.writeText(textQuery.data)
      setCopied(true)
      toast.success('Subtitle copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — try downloading instead')
    }
  }

  const handleDownload = async () => {
    if (!fileUrl) return
    setDownloading(true)
    try {
      await downloadRemoteFile(fileUrl, `${subtitle?.file?.publicId?.split('/').pop() || 'subtitles'}.${subtitle?.file?.format || 'srt'}`)
    } catch {
      toast.error('Download failed — opening the file instead')
      window.open(fileUrl, '_blank', 'noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  if (!subtitle || subtitle.status === 'not_required') return null

  if (subtitle.status !== 'completed') {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-800">
        Subtitles will appear here once processing completes.
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <span>{subtitle.subtitleCount} lines</span>
          <span>{subtitle.wordCount} words</span>
          {subtitle.languageName && <span>{subtitle.languageName}</span>}
        </div>
        <div className="flex items-center gap-2">
          {!editing && fileUrl && (
            <Button size="sm" variant="ghost" onClick={handleCopy} disabled={!textQuery.data}>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          )}
          {!editing && fileUrl && (
            <Button size="sm" variant="outline" loading={downloading} onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          )}
          {!editing ? (
            <Button size="sm" variant="secondary" onClick={startEditing} disabled={!textQuery.data}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saveMutation.isPending}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                <Save className="h-3.5 w-3.5" /> Save changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4">
        {textQuery.isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

        {textQuery.isError && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>Couldn't load the subtitle preview in-app.</p>
              {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold underline">
                  Open file directly <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {textQuery.data && !editing && (
          <pre className="max-h-96 overflow-y-auto scrollbar-thin rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
            {textQuery.data}
          </pre>
        )}

        {editing && (
          <div className="space-y-5">
            <div>
              <Textarea
                rows={16}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={saveMutation.isPending}
                className="font-mono text-xs leading-relaxed"
              />
              <p className="mt-2 text-xs text-slate-400">
                Saving uploads this as a new file first, then removes the previous version once
                the upload succeeds — your subtitle is never left without a valid file.
              </p>
            </div>

            {isVideo && (
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <Captions className="h-4 w-4 text-slate-400" />
                  <Label className="!mb-0">Subtitle delivery for the video</Label>
                </div>
                <SubtitleModeSelector
                  value={draftMode}
                  onChange={setDraftMode}
                  disabled={saveMutation.isPending}
                />
                {draftMode !== currentMode && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Changing this will re-render the final video in the new mode when you save.
                  </p>
                )}
              </div>
            )}

            {isVideo && draftMode === 'embedded' && (
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-slate-400" />
                  <Label className="!mb-0">Subtitle style</Label>
                </div>
                <SubtitleStyleSelector
                  value={draftStyle}
                  onChange={setDraftStyle}
                  disabled={saveMutation.isPending}
                />
                {draftStyle !== currentStyle && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Changing this will re-render the final video with the new style when you save.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
