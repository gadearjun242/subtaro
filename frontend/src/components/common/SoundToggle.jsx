import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { soundSettings, playNotificationSound } from '@/lib/sound'

export default function SoundToggle() {
  const [enabled, setEnabledState] = useState(() => soundSettings.isEnabled())

  const toggle = () => {
    const next = !enabled
    soundSettings.setEnabled(next)
    setEnabledState(next)
    if (next) playNotificationSound()
  }

  return (
    <button
      onClick={toggle}
      aria-label={enabled ? 'Mute notification sounds' : 'Unmute notification sounds'}
      title={enabled ? 'Notification sounds on' : 'Notification sounds off'}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      {enabled ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
    </button>
  )
}
