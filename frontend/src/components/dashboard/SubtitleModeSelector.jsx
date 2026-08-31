import { Flame, ListVideo, Check } from 'lucide-react'
import clsx from 'clsx'

const OPTIONS = [
  {
    value: 'selectable',
    icon: ListVideo,
    title: 'Selectable subtitle track',
    description:
      'Subtitles are muxed into an .mkv as a toggleable track — like DVD/MKV subtitles, viewers can turn them on or off in a capable player (VLC, mpv, smart TVs). Fast, no re-encoding.',
    note: "Browsers can't preview .mkv directly — in-page playback uses your original video with a native caption toggle instead.",
  },
  {
    value: 'embedded',
    icon: Flame,
    title: 'Burned into the video',
    description:
      'Subtitles are permanently rendered into the video pixels — always visible everywhere, no player support needed. Re-encodes the video, so it takes longer.',
    note: null,
  },
]

export default function SubtitleModeSelector({ value, onChange, disabled }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={clsx(
              'relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60',
              isSelected
                ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-400/40 dark:border-brand-500/50 dark:bg-brand-500/10'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
            )}
          >
            {isSelected && (
              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
            <span
              className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-xl',
                isSelected
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{opt.title}</p>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{opt.description}</p>
            {opt.note && (
              <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">{opt.note}</p>
            )}
          </button>
        )
      })}
    </div>
  )
}
