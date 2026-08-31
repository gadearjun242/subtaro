import { useCallback, useRef, useState } from 'react'
import clsx from 'clsx'
import { UploadCloud, FileVideo2, FileAudio2, X, AlertTriangle } from 'lucide-react'
import { formatBytes } from '@/lib/format'
import { MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES } from '@/lib/config'

const ACCEPTED = ['video/', 'audio/']

export default function FileDropzone({ file, onSelect, onClear, progress, disabled }) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const validateAndSet = useCallback(
    (list) => {
      const picked = list?.[0]
      if (!picked) return
      setError('')

      if (!ACCEPTED.some((prefix) => picked.type.startsWith(prefix))) {
        setError('Please choose a video or audio file.')
        return
      }

      if (picked.size > MAX_UPLOAD_SIZE_BYTES) {
        setError(
          `That file is ${formatBytes(picked.size)} — the limit is ${MAX_UPLOAD_SIZE_MB} MB. Choose a smaller file.`
        )
        return
      }

      onSelect(picked)
    },
    [onSelect]
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    validateAndSet(e.dataTransfer.files)
  }

  if (file) {
    const isVideo = file.type.startsWith('video/')
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
          {isVideo ? <FileVideo2 className="h-6 w-6" /> : <FileAudio2 className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{file.name}</p>
          <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
          {typeof progress === 'number' && progress > 0 && progress < 100 && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        {!disabled && (
          <button
            onClick={onClear}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={clsx(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          error
            ? 'border-red-300 bg-red-50/50 dark:border-red-500/40 dark:bg-red-500/5'
            : dragging
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
              : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50'
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <UploadCloud className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Drop your video or audio file here
          </p>
          <p className="mt-1 text-xs text-slate-400">
            or click to browse · MP4, MOV, MKV, MP3, WAV, FLAC… · up to {MAX_UPLOAD_SIZE_MB} MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => validateAndSet(e.target.files)}
        />
      </div>
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
