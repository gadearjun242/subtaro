import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  Undo2,
  Redo2,
  Save,
  Scissors,
  Plus,
  Trash2,
  Download,
  Type,
  Music2,
  Loader2,
  ZoomIn,
  ZoomOut,
  Bold,
  Italic,
} from 'lucide-react'
import { userApi } from '@/api/user.api'
import { projectApi } from '@/api/project.api'
import { parseSrt, cuesToSrt, formatTimecode, parseTimecode } from '@/lib/srt'
import {
  FONTS,
  PRESET_STYLES,
  BASE_STYLE,
  styleFromProject,
  sameStyle,
  captionCss,
  captionMaxWidth,
  frameAlignment,
} from '@/lib/subtitleStyle'
import { apiError } from '@/lib/axios'
import { downloadRemoteFile } from '@/lib/download'
import Button from '@/components/ui/Button'

let uidCounter = 0
const uid = () => `c${Date.now().toString(36)}${(uidCounter++).toString(36)}`
const MIN_CUE = 0.2

// ============================================================
// Small inspector controls
// ============================================================

function Field({ label, children, value }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-500 dark:text-slate-400">{label}</span>
        {value !== undefined && <span className="tabular-nums text-slate-400">{value}</span>}
      </div>
      {children}
    </div>
  )
}

function Slider({ value, min, max, step = 1, onChange }) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600 dark:bg-white/15"
    />
  )
}

function ColorField({ value, onChange }) {
  return (
    <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 dark:border-white/15 dark:bg-white/5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <span className="font-mono text-xs uppercase text-slate-500">{value}</span>
    </label>
  )
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/10">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            'cursor-pointer rounded-md px-2 py-1 text-xs font-medium transition-all',
            value === o.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-white/20 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function TimeInput({ value, onCommit }) {
  const [draft, setDraft] = useState(null)

  return (
    <input
      value={draft ?? formatTimecode(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null) {
          const parsed = parseTimecode(draft)
          if (parsed !== null) onCommit(parsed)
          setDraft(null)
        }
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="h-7 w-[4.6rem] rounded-md border border-transparent bg-slate-100 px-1.5 text-center font-mono text-[11px] tabular-nums text-slate-700 focus:border-brand-500 focus:outline-none dark:bg-white/10 dark:text-slate-200"
    />
  )
}

// ============================================================
// Studio
// ============================================================

export default function Studio() {
  const { projectId } = useParams()
  const queryClient = useQueryClient()

  const videoRef = useRef(null)
  const frameRef = useRef(null)
  const timelineRef = useRef(null)
  const dragRef = useRef(null)

  const [cues, setCues] = useState([])
  const [loadedFor, setLoadedFor] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [mode, setMode] = useState('embedded')
  const [dirty, setDirty] = useState(false)

  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [frameHeight, setFrameHeight] = useState(288)
  const [pxPerSec, setPxPerSec] = useState(90)
  const [inspectorTab, setInspectorTab] = useState('style')

  const captionRef = useRef(null)
  const playheadRef = useRef(null)
  const timeLabelRef = useRef(null)
  const cuesRef = useRef([])
  const pxRef = useRef(90)
  const totalRef = useRef(10)
  const captionDrag = useRef(null)
  const [guides, setGuides] = useState({ x: false })

  const history = useRef({ past: [], future: [] })

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => userApi.getMyProject(projectId).then((r) => r.data.project),
  })
  const project = projectQuery.data

  const subtitleUrl = project?.subtitle?.status === 'completed' ? project.subtitle.file?.url : null

  const textQuery = useQuery({
    queryKey: ['subtitle-text', subtitleUrl],
    queryFn: async () => {
      const res = await fetch(subtitleUrl)
      if (!res.ok) throw new Error('Could not load subtitle text')
      return res.text()
    },
    enabled: Boolean(subtitleUrl),
  })

  const isVideo = project?.inputType === 'video'
  // Preview the ORIGINAL media: the rendered output already has
  // captions burned in and would double up with the live overlay.
  const mediaSrc = project?.input?.url

  // ---- load cues + style once per subtitle file ------------------
  useEffect(() => {
    if (!project || textQuery.data === undefined || loadedFor === subtitleUrl) return
    const fallback = styleFromProject(project)
    const saved = Array.isArray(project.subtitleCueStyles) ? project.subtitleCueStyles : []
    setCues(
      parseSrt(textQuery.data).map((c, i) => ({
        ...c,
        id: uid(),
        // Every caption owns a complete style; old projects start from their preset.
        style: { ...BASE_STYLE, ...(saved[i] || fallback) },
      }))
    )
    setMode(project.subtitleMode || 'embedded')
    setLoadedFor(subtitleUrl)
    setDirty(false)
    history.current = { past: [], future: [] }
  }, [project, textQuery.data, subtitleUrl, loadedFor])

  // ---- history ----------------------------------------------------
  const commit = useCallback((next, snapshot) => {
    history.current.past.push(snapshot)
    if (history.current.past.length > 100) history.current.past.shift()
    history.current.future = []
    setCues(next)
    setDirty(true)
  }, [])

  const edit = useCallback(
    (producer) => {
      setCues((current) => {
        const next = producer(current)
        if (next === current) return current
        history.current.past.push(current)
        if (history.current.past.length > 100) history.current.past.shift()
        history.current.future = []
        setDirty(true)
        return next
      })
    },
    []
  )

  const undo = useCallback(() => {
    const prev = history.current.past.pop()
    if (!prev) return
    setCues((current) => {
      history.current.future.push(current)
      return prev
    })
    setDirty(true)
  }, [])

  const redo = useCallback(() => {
    const next = history.current.future.pop()
    if (!next) return
    setCues((current) => {
      history.current.past.push(current)
      return next
    })
    setDirty(true)
  }, [])

  // ---- playback ---------------------------------------------------
  const seek = useCallback((t) => {
    const el = videoRef.current
    const clamped = Math.max(0, t)
    if (el) el.currentTime = clamped
    setTime(clamped)
  }, [])

  const togglePlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return undefined

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onMeta = () => setDuration(el.duration || 0)
    const onSeeked = () => setTime(el.currentTime)

    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('seeked', onSeeked)
    if (el.duration) setDuration(el.duration)

    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('seeked', onSeeked)
    }
  }, [mediaSrc])

  // Smooth playhead. The playhead line and clock are moved straight in the
  // DOM every animation frame (no React render), so they stay live even when
  // the editor is busy. React state only updates when the visible caption
  // changes, or at ~10 Hz, which is plenty for everything else.
  useEffect(() => {
    if (!playing) return undefined
    let raf
    let lastActive = null
    let lastCommit = 0

    const tick = (now) => {
      const el = videoRef.current
      if (el) {
        const t = el.currentTime
        if (playheadRef.current) playheadRef.current.style.left = `${t * pxRef.current}px`
        if (timeLabelRef.current) {
          timeLabelRef.current.textContent = `${formatTimecode(t)} / ${formatTimecode(totalRef.current)}`
        }

        const active = cuesRef.current.find((c) => t >= c.start && t <= c.end)?.id ?? null
        if (active !== lastActive || now - lastCommit > 100) {
          lastActive = active
          lastCommit = now
          setTime(t)
        }
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  // Scale the live caption with the actual preview frame.
  useEffect(() => {
    const el = frameRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => setFrameHeight(el.clientHeight))
    ro.observe(el)
    setFrameHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [mediaSrc])

  // Keep the playhead visible while playing.
  useEffect(() => {
    const tl = timelineRef.current
    if (!tl || !playing) return
    const x = time * pxPerSec
    if (x < tl.scrollLeft || x > tl.scrollLeft + tl.clientWidth - 60) {
      tl.scrollLeft = Math.max(0, x - 80)
    }
  }, [time, playing, pxPerSec])

  // ---- cue operations --------------------------------------------
  const activeCue = useMemo(
    () => cues.find((c) => time >= c.start && time <= c.end) || null,
    [cues, time]
  )

  const sorted = useMemo(() => [...cues].sort((a, b) => a.start - b.start), [cues])
  const total = Math.max(duration, sorted.at(-1)?.end || 0, 10)

  // The inspector edits the SELECTED caption (or the one under the playhead);
  // the preview always shows the caption that is actually on screen.
  cuesRef.current = cues
  pxRef.current = pxPerSec
  totalRef.current = total

  // While paused (or seeking) paint the playhead/clock from state; while playing
  // the animation loop above owns them.
  useEffect(() => {
    if (playing) return
    if (playheadRef.current) playheadRef.current.style.left = `${time * pxPerSec}px`
    if (timeLabelRef.current) timeLabelRef.current.textContent = `${formatTimecode(time)} / ${formatTimecode(total)}`
  })

  const focusCue = cues.find((c) => c.id === selectedId) || activeCue || sorted[0] || null
  const style = focusCue?.style || BASE_STYLE

  const updateCue = (id, patch) =>
    edit((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const setCueTime = (id, field, value) => {
    edit((list) => {
      const ordered = [...list].sort((a, b) => a.start - b.start)
      const i = ordered.findIndex((c) => c.id === id)
      const cue = ordered[i]
      const prevEnd = ordered[i - 1]?.end ?? 0
      const nextStart = ordered[i + 1]?.start ?? Infinity
      let { start, end } = cue
      if (field === 'start') start = Math.min(Math.max(value, prevEnd), end - MIN_CUE)
      else end = Math.max(Math.min(value, nextStart), start + MIN_CUE)
      return list.map((c) => (c.id === id ? { ...c, start, end } : c))
    })
  }

  const addCue = () => {
    const start = Math.max(0, time)
    const nextStart = sorted.find((c) => c.start > start)?.start ?? start + 2
    const end = Math.min(start + 2, nextStart)
    if (end - start < MIN_CUE) return toast.error('No room here. Move the playhead to a gap.')
    const id = uid()
    edit((list) => [...list, { id, index: 0, start, end, text: 'New caption', style: { ...style } }])
    setSelectedId(id)
  }

  const splitAtPlayhead = () => {
    const cue = cues.find((c) => time > c.start + MIN_CUE && time < c.end - MIN_CUE)
    if (!cue) return toast.error('Place the playhead inside a caption to split it.')
    const words = cue.text.split(/\s+/)
    const cut = Math.max(1, Math.round((words.length * (time - cue.start)) / (cue.end - cue.start)))
    const first = words.slice(0, cut).join(' ')
    const second = words.slice(cut).join(' ') || '…'
    const idB = uid()
    edit((list) =>
      list.flatMap((c) =>
        c.id === cue.id
          ? [
              { ...c, end: time, text: first },
              { ...c, id: idB, start: time, text: second },
            ]
          : [c]
      )
    )
    setSelectedId(idB)
  }

  const deleteCue = (id) => {
    edit((list) => list.filter((c) => c.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  // ---- timeline drag (move / resize) -----------------------------
  const onBlockPointerDown = (e, cue, kind) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelectedId(cue.id)
    // Clicking the block body jumps the video to that exact point; a drag
    // that follows still moves the block. The edge handles only resize.
    if (kind === 'move') scrubFromEvent(e)
    dragRef.current = {
      id: cue.id,
      kind,
      x0: e.clientX,
      start: cue.start,
      end: cue.end,
      snapshot: cues,
    }
  }

  const onBlockPointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const dt = (e.clientX - d.x0) / pxPerSec
    const ordered = [...cues].sort((a, b) => a.start - b.start)
    const i = ordered.findIndex((c) => c.id === d.id)
    const lo = ordered[i - 1]?.end ?? 0
    const hi = ordered[i + 1]?.start ?? Infinity

    let start = d.start
    let end = d.end

    if (d.kind === 'move') {
      const len = d.end - d.start
      start = Math.min(Math.max(d.start + dt, lo), hi - len)
      end = start + len
    } else if (d.kind === 'left') {
      start = Math.min(Math.max(d.start + dt, lo), d.end - MIN_CUE)
    } else {
      end = Math.max(Math.min(d.end + dt, hi), d.start + MIN_CUE)
    }

    setCues((list) => list.map((c) => (c.id === d.id ? { ...c, start, end } : c)))
  }

  const onBlockPointerUp = () => {
    const d = dragRef.current
    dragRef.current = null
    if (!d || d.kind === 'scrub') return
    setCues((current) => {
      const cur = current.find((c) => c.id === d.id)
      if (cur && (cur.start !== d.start || cur.end !== d.end)) {
        commit(current, d.snapshot)
      }
      return current
    })
  }

  const scrubFromEvent = (e) => {
    const tl = timelineRef.current
    if (!tl) return
    const rect = tl.getBoundingClientRect()
    seek(Math.min(total, Math.max(0, (e.clientX - rect.left + tl.scrollLeft) / pxPerSec)))
  }

  const onRulerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { kind: 'scrub' }
    scrubFromEvent(e)
  }
  const onRulerMove = (e) => dragRef.current?.kind === 'scrub' && scrubFromEvent(e)
  const onRulerUp = () => {
    if (dragRef.current?.kind === 'scrub') dragRef.current = null
  }

  // ---- direct manipulation of the caption on the video -----------
  const startCaptionDrag = (e, kind) => {
    e.stopPropagation()
    e.preventDefault()
    const frame = frameRef.current
    const cap = captionRef.current
    if (!frame || !cap) return
    e.currentTarget.setPointerCapture(e.pointerId)

    const f = frame.getBoundingClientRect()
    const c = cap.getBoundingClientRect()
    const k = f.height / 288
    const activeId = activeCue?.id
    if (activeId) setSelectedId(activeId)

    captionDrag.current = {
      id: activeId,
      snapshot: cues,
      kind,
      x0: e.clientX,
      y0: e.clientY,
      k,
      frameW: f.width,
      capW: c.width,
      // Normalise to a bottom anchor so the same maths covers top/middle too.
      marginV: Math.max(0, Math.round((f.bottom - c.bottom) / k)),
      offsetX: activeCue?.style?.offsetX || 0,
      fontSize: activeCue?.style?.fontSize || 24,
    }
  }

  const moveCaptionDrag = (e) => {
    const d = captionDrag.current
    if (!d || !d.id) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0

    const patchActive = (patch) =>
      setCues((list) => list.map((c) => (c.id === d.id ? { ...c, style: { ...c.style, ...patch } } : c)))

    if (d.kind === 'move') {
      let offsetX = Math.max(-45, Math.min(45, d.offsetX + (dx / d.frameW) * 100))
      const snapped = Math.abs(offsetX) < 1.5
      if (snapped) offsetX = 0
      setGuides({ x: snapped })
      patchActive({
        alignment: 'bottom',
        offsetX: Math.round(offsetX * 10) / 10,
        marginV: Math.max(0, Math.min(250, Math.round(d.marginV - dy / d.k))),
      })
    } else {
      const next = Math.round(d.fontSize * (1 + dx / Math.max(80, d.capW)))
      patchActive({ fontSize: Math.max(12, Math.min(72, next)) })
    }
  }

  const endCaptionDrag = () => {
    const d = captionDrag.current
    captionDrag.current = null
    setGuides({ x: false })
    if (!d?.id) return
    // One undo step per drag, not one per pointer move.
    setCues((current) => {
      if (JSON.stringify(current) !== JSON.stringify(d.snapshot)) commit(current, d.snapshot)
      return current
    })
  }

  // ---- save -------------------------------------------------------
  const saveMutation = useMutation({
    mutationFn: () => {
      const modeChanged = isVideo && mode !== project.subtitleMode
      // Same filter/order as cuesToSrt(), so style[i] belongs to caption i.
      const exported = [...cues]
        .sort((a, b) => a.start - b.start)
        .filter((c) => c.text.trim() && c.end > c.start)
      return projectApi.updateSubtitle(
        project._id,
        cuesToSrt(cues),
        modeChanged ? mode : undefined,
        undefined,
        undefined,
        isVideo ? exported.map((c) => c.style) : undefined
      )
    },
    onSuccess: (res) => {
      toast.success(
        res?.data?.outputRegenerating ? 'Saved. Rendering your video with the new look…' : 'Saved'
      )
      setDirty(false)
      setLoadedFor(null) // pick up the freshly stored file
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['subtitle-text'] })
    },
    onError: (err) => toast.error(apiError(err, 'Unable to save changes')),
  })

  const [downloadingVideo, setDownloadingVideo] = useState(false)
  const handleDownloadVideo = async () => {
    const file = project?.output?.file
    if (!file?.url) return
    setDownloadingVideo(true)
    try {
      await downloadRemoteFile(file.url, `${project.name || 'video'}.${file.format || 'mp4'}`)
    } catch {
      toast.error('Download failed. Opening the file instead.')
      window.open(file.url, '_blank', 'noreferrer')
    } finally {
      setDownloadingVideo(false)
    }
  }

  const handleDownloadSrt = () => {
    const blob = new Blob([cuesToSrt(cues)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project?.name || 'subtitles'}.srt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---- keyboard ---------------------------------------------------
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      const mod = e.ctrlKey || e.metaKey

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty) saveMutation.mutate()
      } else if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
      } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault()
        redo()
      } else if (!typing && e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (!typing && e.key.toLowerCase() === 's' && !mod) {
        splitAtPlayhead()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // ---- render -----------------------------------------------------
  if (projectQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!project || !subtitleUrl) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center dark:bg-black">
        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          The studio opens once your subtitles are ready.
        </p>
        <Link to={project ? `/dashboard/projects/${projectId}` : '/dashboard/projects'}>
          <Button variant="secondary">Back to project</Button>
        </Link>
      </div>
    )
  }

  // Every edit applies to the focused caption only.
  const patchStyle = (patch) => {
    if (!focusCue) return
    updateCue(focusCue.id, { style: { ...focusCue.style, ...patch } })
    setSelectedId(focusCue.id)
  }

  // Copy the focused caption's whole style to other captions.
  const applyStyleTo = (scope) => {
    if (!focusCue) return
    const from = focusCue.start
    edit((list) =>
      list.map((c) =>
        scope === 'all' || (scope === 'after' && c.start > from) ? { ...c, style: { ...focusCue.style } } : c
      )
    )
    toast.success(scope === 'all' ? 'Style applied to every caption' : 'Style applied to the following captions')
  }

  const rendering = project.output?.status === 'processing'
  const stems = project.stems
  const activeStyle = activeCue?.style || BASE_STYLE
  const captionStyle = captionCss(activeStyle, frameHeight)
  const align = frameAlignment(activeStyle, frameHeight)
  const ticks = Math.ceil(total)
  const tickStep = pxPerSec >= 120 ? 1 : pxPerSec >= 60 ? 2 : pxPerSec >= 30 ? 5 : 10
  const canSave = dirty && !saveMutation.isPending

  const panelBase = 'flex min-h-0 flex-col bg-white dark:bg-[#0b0b0c]'

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 dark:bg-black dark:text-slate-100 lg:h-screen lg:overflow-hidden">
      {/* ---------- top bar ---------- */}
      <header className="glass sticky top-0 z-30 flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-black/5 px-3 py-2 dark:border-white/10 lg:static">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to={`/dashboard/projects/${projectId}`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/70 dark:hover:bg-white/10"
            aria-label="Back to project"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="truncate text-sm font-semibold" title={project.name}>{project.name}</span>
          {dirty && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">Unsaved</span>}
          {rendering && (
            <span className="flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-medium text-brand-600 dark:text-brand-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Rendering
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={undo} title="Undo (Ctrl+Z)" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/70 dark:hover:bg-white/10"><Undo2 className="h-4 w-4" /></button>
          <button onClick={redo} title="Redo (Ctrl+Y)" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/70 dark:hover:bg-white/10"><Redo2 className="h-4 w-4" /></button>
          <Button size="sm" variant="secondary" onClick={handleDownloadSrt}>
            <Download className="h-3.5 w-3.5" /> SRT
          </Button>
          {isVideo && (
            <Button
              size="sm"
              variant="secondary"
              loading={downloadingVideo}
              disabled={!project.output?.file?.url || rendering}
              title={rendering ? 'Rendering. The video will be ready shortly.' : 'Download the finished video'}
              onClick={handleDownloadVideo}
            >
              <Download className="h-3.5 w-3.5" /> {rendering ? 'Rendering…' : 'Video'}
            </Button>
          )}
          <Button size="sm" disabled={!canSave} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            <Save className="h-3.5 w-3.5" /> <span className="whitespace-nowrap">{isVideo ? 'Save & render' : 'Save'}</span>
          </Button>
        </div>
      </header>

      {/* ---------- workspace ---------- */}
      <div className="contents lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[320px_minmax(0,1fr)_320px] lg:gap-px lg:bg-black/5 lg:dark:bg-white/10">
        {/* ----- captions list ----- */}
        <section className={clsx(panelBase, 'order-3 border-t border-black/5 dark:border-white/10 lg:order-none lg:border-0')}>
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-black/5 px-3 dark:border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Captions · {cues.length}
            </span>
            <div className="flex gap-1">
              <button onClick={splitAtPlayhead} title="Split at playhead (S)" className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><Scissors className="h-3.5 w-3.5" /></button>
              <button onClick={addCue} title="Add caption at playhead" className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="scrollbar-thin max-h-[26rem] min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2 lg:max-h-none">
            {sorted.map((cue) => {
              const isActive = activeCue?.id === cue.id
              const isSelected = selectedId === cue.id
              return (
                <div
                  key={cue.id}
                  onClick={() => {
                    setSelectedId(cue.id)
                    seek(cue.start + 0.01)
                  }}
                  className={clsx(
                    'group rounded-xl border p-2 transition-colors',
                    isSelected
                      ? 'border-brand-500/60 bg-brand-50 dark:bg-brand-500/10'
                      : isActive
                        ? 'border-brand-500/30 bg-slate-50 dark:bg-white/5'
                        : 'border-transparent bg-slate-50 hover:border-slate-200 dark:bg-white/[0.04] dark:hover:border-white/15'
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <TimeInput value={cue.start} onCommit={(v) => setCueTime(cue.id, 'start', v)} />
                    <span className="text-slate-400">→</span>
                    <TimeInput value={cue.end} onCommit={(v) => setCueTime(cue.id, 'end', v)} />
                    <button
                      onClick={() => deleteCue(cue.id)}
                      className="ml-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-red-500/10 hover:text-red-500"
                      aria-label="Delete caption"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={cue.text}
                    rows={Math.max(1, cue.text.split('\n').length)}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={() => setSelectedId(cue.id)}
                    onChange={(e) => updateCue(cue.id, { text: e.target.value })}
                    className="w-full resize-none rounded-md bg-transparent px-1 text-sm leading-snug focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 dark:focus:bg-black/40"
                  />
                </div>
              )
            })}
          </div>
        </section>

        {/* ----- preview ----- */}
        <section className={clsx(panelBase, 'order-1 bg-slate-100 dark:bg-black lg:order-none')}>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <div
              ref={frameRef}
              className="relative max-h-full w-full max-w-[min(100%,calc((100vh-24rem)*1.7778))] lg:max-w-[min(100%,calc((100vh-24rem)*1.7778))] overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/30"
              style={{ aspectRatio: isVideo ? '16 / 9' : undefined, minHeight: isVideo ? undefined : 160 }}
            >
              {isVideo ? (
                <video
                  key={mediaSrc}
                  ref={videoRef}
                  src={mediaSrc}
                  playsInline
                  preload="metadata"
                  onClick={togglePlay}
                  className="h-full w-full cursor-pointer object-contain"
                />
              ) : (
                <div className="flex h-full min-h-[160px] items-center justify-center">
                  <audio key={mediaSrc} ref={videoRef} src={mediaSrc} preload="metadata" className="hidden" />
                  <Music2 className="h-12 w-12 text-slate-600" />
                </div>
              )}

              {isVideo && (
                <span
                  className={clsx(
                    'pointer-events-none absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur',
                    dirty ? 'bg-amber-500/90 text-black' : 'bg-black/50 text-white'
                  )}
                >
                  {dirty ? 'Live preview. Save & render to apply' : 'Matches your saved video'}
                </span>
              )}

              {/* centre guide, shown while dragging */}
              {guides.x && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-brand-400/80" />}

              {isVideo && activeCue && (
                <div
                  className="pointer-events-none absolute inset-0 flex flex-col items-center"
                  style={align}
                >
                  <div
                    ref={captionRef}
                    onPointerDown={(e) => startCaptionDrag(e, 'move')}
                    onPointerMove={moveCaptionDrag}
                    onPointerUp={endCaptionDrag}
                    style={{ maxWidth: `${captionMaxWidth(activeStyle)}%`, transform: `rotate(${activeStyle.rotation || 0}deg)` }}
                    className="group pointer-events-auto relative cursor-move touch-none rounded outline-1 outline-dashed outline-offset-4 outline-white/30 hover:outline-white/70"
                    title="Drag to move"
                  >
                    <span style={captionStyle}>{activeCue.text}</span>
                    <span
                      onPointerDown={(e) => startCaptionDrag(e, 'resize')}
                      onPointerMove={moveCaptionDrag}
                      onPointerUp={endCaptionDrag}
                      className="absolute -bottom-3 -right-3 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-white bg-brand-600 opacity-80 shadow hover:opacity-100"
                      title="Drag to resize"
                    />
                  </div>
                </div>
              )}

              {!isVideo && activeCue && (
                <div className="pointer-events-none absolute inset-x-0 bottom-4 px-[6%] text-center text-sm text-white">
                  {activeCue.text}
                </div>
              )}
            </div>
          </div>

          {/* transport */}
          <div className="flex h-12 shrink-0 items-center justify-center gap-4 border-t border-black/5 dark:border-white/10">
            <button onClick={() => seek(0)} className="cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-white" aria-label="Back to start"><SkipBack className="h-4 w-4" /></button>
            <button
              onClick={togglePlay}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-black"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
            </button>
            <span ref={timeLabelRef} className="w-36 font-mono text-xs tabular-nums text-slate-500" />
            <button
              onClick={() => {
                seek(0)
                videoRef.current?.play().catch(() => {})
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300"
              title="Play the whole clip with your current edits"
            >
              <Play className="h-3 w-3" /> Preview
            </button>
          </div>
        </section>

        {/* ----- inspector ----- */}
        <section className={clsx(panelBase, 'order-4 border-t border-black/5 dark:border-white/10 lg:order-none lg:border-0')}>
          <div className="flex h-10 shrink-0 items-center gap-1 border-b border-black/5 px-2 dark:border-white/10">
            {[
              ['style', 'Style', Type],
              ['audio', 'Audio', Music2],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setInspectorTab(id)}
                className={clsx(
                  'flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                  inspectorTab === id ? 'bg-slate-100 dark:bg-white/10' : 'text-slate-500'
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 space-y-5 p-4 lg:overflow-y-auto">
            {inspectorTab === 'style' && (
              <>
                {!isVideo && (
                  <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-white/5">
                    Styling applies to burned-in video captions. Audio projects only export the SRT.
                  </p>
                )}

                <p className="rounded-xl bg-brand-50 p-3 text-xs font-medium text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
                  Editing caption{' '}
                  <span className="font-semibold">&ldquo;{(focusCue?.text || '').slice(0, 28) || 'none selected'}&rdquo;</span>
                </p>

                <Field label="Presets">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(PRESET_STYLES).map(([key, p]) => (
                      <button
                        key={key}
                        onClick={() => patchStyle({ ...p.style })}
                        className={clsx(
                          'cursor-pointer rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors',
                          sameStyle(style, p.style)
                            ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                            : 'border-slate-200 hover:border-slate-300 dark:border-white/15 dark:hover:border-white/30'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Font">
                  <select
                    value={style.fontName}
                    onChange={(e) => patchStyle({ fontName: e.target.value })}
                    className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm dark:border-white/15 dark:bg-white/5"
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f} className="text-black">{f}</option>
                    ))}
                  </select>
                </Field>

                <div className="flex gap-2">
                  <button
                    onClick={() => patchStyle({ bold: !style.bold })}
                    className={clsx('flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border text-sm', style.bold ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'border-slate-200 dark:border-white/15')}
                    aria-label="Bold"
                  ><Bold className="h-4 w-4" /></button>
                  <button
                    onClick={() => patchStyle({ italic: !style.italic })}
                    className={clsx('flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border text-sm', style.italic ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'border-slate-200 dark:border-white/15')}
                    aria-label="Italic"
                  ><Italic className="h-4 w-4" /></button>
                  <button
                    onClick={() => patchStyle({ uppercase: !style.uppercase })}
                    className={clsx('flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border text-xs font-semibold', style.uppercase ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'border-slate-200 dark:border-white/15')}
                    aria-label="Uppercase"
                  >AA</button>
                </div>

                <Field label="Size" value={style.fontSize}>
                  <Slider value={style.fontSize} min={12} max={72} onChange={(v) => patchStyle({ fontSize: v })} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Text color"><ColorField value={style.primaryColor} onChange={(v) => patchStyle({ primaryColor: v })} /></Field>
                  <Field label="Outline color"><ColorField value={style.outlineColor} onChange={(v) => patchStyle({ outlineColor: v })} /></Field>
                </div>

                <Field label="Outline" value={style.outlineWidth}>
                  <Slider value={style.outlineWidth} min={0} max={6} onChange={(v) => patchStyle({ outlineWidth: v })} />
                </Field>
                <Field label="Shadow" value={style.shadow}>
                  <Slider value={style.shadow} min={0} max={4} onChange={(v) => patchStyle({ shadow: v })} />
                </Field>

                <Field label="Shadow color">
                  <ColorField value={style.shadowColor || '#000000'} onChange={(v) => patchStyle({ shadowColor: v })} />
                </Field>

                <Field label="Text opacity" value={`${style.textOpacity ?? 100}%`}>
                  <Slider value={style.textOpacity ?? 100} min={10} max={100} onChange={(v) => patchStyle({ textOpacity: v })} />
                </Field>

                <Field label="Letter spacing" value={style.letterSpacing || 0}>
                  <Slider value={style.letterSpacing || 0} min={-2} max={12} onChange={(v) => patchStyle({ letterSpacing: v })} />
                </Field>

                <Field label="Rotation" value={`${style.rotation || 0}°`}>
                  <Slider value={style.rotation || 0} min={-45} max={45} onChange={(v) => patchStyle({ rotation: v })} />
                </Field>

                <Field label="Background box">
                  <Segmented
                    value={style.background ? 'on' : 'off'}
                    options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]}
                    onChange={(v) => patchStyle({ background: v === 'on' })}
                  />
                </Field>
                {style.background && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Box color"><ColorField value={style.backgroundColor} onChange={(v) => patchStyle({ backgroundColor: v })} /></Field>
                    <Field label="Opacity" value={`${style.backgroundOpacity}%`}>
                      <Slider value={style.backgroundOpacity} min={0} max={100} onChange={(v) => patchStyle({ backgroundOpacity: v })} />
                    </Field>
                  </div>
                )}

                <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-white/5">
                  Tip: every caption has its own style. Drag a caption on the video to place it, and its corner dot to resize.
                </p>

                <Field label="Quick position">
                  <Segmented
                    value={style.alignment}
                    options={[{ value: 'top', label: 'Top' }, { value: 'middle', label: 'Middle' }, { value: 'bottom', label: 'Bottom' }]}
                    onChange={(v) => patchStyle({ alignment: v, ...(v === 'bottom' ? { marginV: 30 } : v === 'top' ? { marginV: 20 } : {}) })}
                  />
                </Field>
                {style.alignment !== 'middle' && (
                  <Field label={style.alignment === 'top' ? 'Distance from top' : 'Distance from bottom'} value={style.marginV}>
                    <Slider value={style.marginV} min={0} max={250} onChange={(v) => patchStyle({ marginV: v })} />
                  </Field>
                )}
                <Field label="Horizontal position" value={`${style.offsetX || 0}%`}>
                  <Slider value={style.offsetX || 0} min={-45} max={45} onChange={(v) => patchStyle({ offsetX: v })} />
                </Field>

                {isVideo && (
                  <Field label="Delivery">
                    <Segmented
                      value={mode}
                      options={[{ value: 'embedded', label: 'Burned in' }, { value: 'selectable', label: 'Selectable track' }]}
                      onChange={(v) => { setMode(v); setDirty(true) }}
                    />
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => applyStyleTo('after')}>
                    Apply to following
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => applyStyleTo('all')}>
                    Apply to all
                  </Button>
                </div>
              </>
            )}

            {inspectorTab === 'audio' && (
              <>
                <p className="text-xs text-slate-500">
                  Vocals and instrumental, separated by the pipeline during processing.
                </p>

                {stems?.status === 'available' ? (
                  [
                    ['Vocals', stems.vocal],
                    ['Instrumental', stems.instrument],
                  ].map(([label, file]) =>
                    file?.url ? (
                      <div key={label} className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{label}</span>
                          <button
                            onClick={() => downloadRemoteFile(file.url, `${project.name}-${label.toLowerCase()}.mp3`).catch(() => window.open(file.url, '_blank', 'noreferrer'))}
                            className="flex cursor-pointer items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                          >
                            <Download className="h-3.5 w-3.5" /> MP3
                          </button>
                        </div>
                        <audio controls preload="none" src={file.url} className="h-9 w-full" />
                      </div>
                    ) : null
                  )
                ) : (
                  <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-white/5">
                    {stems?.status === 'unavailable'
                      ? 'Separated audio is not available for this project.'
                      : stems?.status === 'failed'
                        ? 'Saving the separated audio failed for this project.'
                        : 'Separated audio will appear here once it finishes saving.'}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* ---------- timeline ---------- */}
      <section className="order-2 h-44 shrink-0 border-t border-black/5 bg-white dark:border-white/10 dark:bg-[#0b0b0c] lg:order-none">
        <div className="flex h-8 items-center justify-between border-b border-black/5 px-3 dark:border-white/10">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Timeline</span>
          <div className="flex items-center gap-2 text-slate-500">
            <ZoomOut className="h-3.5 w-3.5" />
            <input
              type="range"
              min={20}
              max={400}
              value={pxPerSec}
              onChange={(e) => setPxPerSec(Number(e.target.value))}
              className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600 dark:bg-white/15"
              aria-label="Zoom"
            />
            <ZoomIn className="h-3.5 w-3.5" />
          </div>
        </div>

        <div ref={timelineRef} className="scrollbar-thin relative h-[calc(100%-2rem)] overflow-x-auto overflow-y-hidden">
          <div
            className="relative h-full cursor-col-resize touch-none"
            style={{ width: total * pxPerSec + 120 }}
            onPointerDown={onRulerDown}
            onPointerMove={onRulerMove}
            onPointerUp={onRulerUp}
          >
            {/* ruler */}
            <div
              className="relative h-7 border-b border-black/5 dark:border-white/10"
            >
              {Array.from({ length: Math.floor(ticks / tickStep) + 1 }, (_, i) => i * tickStep).map((s) => (
                <div key={s} className="absolute top-0 h-full border-l border-slate-200 pl-1 text-[10px] tabular-nums text-slate-400 dark:border-white/15" style={{ left: s * pxPerSec }}>
                  {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* caption track */}
            <div className="relative mt-3 h-14">
              {sorted.map((cue) => (
                <div
                  key={cue.id}
                  onPointerDown={(e) => onBlockPointerDown(e, cue, 'move')}
                  onPointerMove={onBlockPointerMove}
                  onPointerUp={onBlockPointerUp}
                  className={clsx(
                    'absolute top-0 flex h-full cursor-grab touch-none items-center overflow-hidden rounded-lg border px-2 text-[11px] font-medium active:cursor-grabbing',
                    selectedId === cue.id
                      ? 'border-brand-400 bg-brand-500 text-white'
                      : 'border-brand-500/30 bg-brand-500/15 text-brand-800 dark:text-brand-200'
                  )}
                  style={{ left: cue.start * pxPerSec, width: Math.max(8, (cue.end - cue.start) * pxPerSec) }}
                  title={cue.text}
                >
                  <span
                    onPointerDown={(e) => onBlockPointerDown(e, cue, 'left')}
                    onPointerMove={onBlockPointerMove}
                    onPointerUp={onBlockPointerUp}
                    className="absolute inset-y-0 left-0 w-2 cursor-ew-resize"
                  />
                  <span className="pointer-events-none truncate">{cue.text}</span>
                  <span
                    onPointerDown={(e) => onBlockPointerDown(e, cue, 'right')}
                    onPointerMove={onBlockPointerMove}
                    onPointerUp={onBlockPointerUp}
                    className="absolute inset-y-0 right-0 w-2 cursor-ew-resize"
                  />
                </div>
              ))}
            </div>

            {/* playhead */}
            <div ref={playheadRef} className="pointer-events-none absolute inset-y-0 z-10 w-px bg-red-500" style={{ left: 0 }}>
              <span className="absolute -left-[5px] top-0 h-2.5 w-[11px] rounded-b-sm bg-red-500" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
