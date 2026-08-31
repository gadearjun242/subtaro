import { AnimatePresence, motion } from 'framer-motion'
import { Captions, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'
import { formatTimecode } from '@/lib/format'

export default function SyncedCaptions({
  cues,
  activeCue,
  currentTime,
  visible,
  onToggleVisible,
  loading,
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-4 text-xs text-slate-400 dark:border-slate-800">
        <Captions className="h-3.5 w-3.5 animate-pulse" /> Loading captions…
      </div>
    )
  }

  if (!cues || cues.length === 0) return null

  return (
    <div className="border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <Captions className="h-3.5 w-3.5" /> Synced captions
        </span>
        <button
          onClick={onToggleVisible}
          className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-brand-500"
        >
          {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>

      {visible && (
        <div className="relative flex min-h-[4.5rem] items-center justify-center overflow-hidden px-6 py-4 text-center">
          <AnimatePresence mode="wait">
            {activeCue ? (
              <motion.p
                key={activeCue.index}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="max-w-xl text-base font-semibold leading-snug text-slate-800 dark:text-slate-100"
              >
                {activeCue.text.split('\n').map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </motion.p>
            ) : (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-slate-300 dark:text-slate-600"
              >
                — no caption at {formatTimecode(currentTime)} —
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Mini caption timeline */}
      {visible && (
        <div className="flex gap-[2px] px-4 pb-3">
          {cues.map((cue) => (
            <span
              key={cue.index}
              className={clsx(
                'h-1 flex-1 rounded-full transition-colors',
                activeCue?.index === cue.index
                  ? 'bg-gradient-to-r from-brand-500 to-accent-500'
                  : 'bg-slate-200 dark:bg-slate-800'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
