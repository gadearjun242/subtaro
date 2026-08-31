import { Check } from 'lucide-react'
import clsx from 'clsx'

// Keep these keys/labels in sync with the backend's
// services/subtitleStyle.presets.js
const PRESETS = [
  {
    value: 'classic',
    label: 'Classic',
    description: 'White text, black outline, bottom.',
    preview: { justify: 'items-end', text: 'text-white text-[11px] font-semibold [text-shadow:0_1px_2px_black,0_0_3px_black]' },
  },
  {
    value: 'bold_yellow',
    label: 'Bold Yellow',
    description: 'High-contrast bold yellow, bottom.',
    preview: { justify: 'items-end', text: 'text-yellow-300 text-xs font-extrabold [text-shadow:0_1px_2px_black,0_0_3px_black]' },
  },
  {
    value: 'minimal_top',
    label: 'Minimal Top',
    description: 'Small, unobtrusive, along the top.',
    preview: { justify: 'items-start', text: 'text-slate-100 text-[10px] font-medium [text-shadow:0_1px_2px_black]' },
  },
  {
    value: 'cinematic',
    label: 'Cinematic',
    description: 'Text on a soft translucent bar.',
    preview: { justify: 'items-end', text: 'text-white text-[11px] font-medium bg-black/50 px-2 py-0.5 rounded' },
  },
]

export default function SubtitleStyleSelector({ value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {PRESETS.map((preset) => {
        const isSelected = value === preset.value
        return (
          <button
            key={preset.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(preset.value)}
            className={clsx(
              'relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60',
              isSelected
                ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-400/40 dark:border-brand-500/50 dark:bg-brand-500/10'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
            )}
          >
            {isSelected && (
              <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            )}

            {/* Mini "video frame" preview */}
            <div
              className={clsx(
                'flex aspect-video w-full justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 p-1.5',
                preset.preview.justify
              )}
            >
              <span className={preset.preview.text}>Sample text</span>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">{preset.label}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                {preset.description}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
