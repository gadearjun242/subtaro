let audioCtx = null

const getAudioContext = () => {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Schedules a single clean, bell-like tone (sine + a touch of its
 * own overtone) with a soft attack/decay envelope — avoids the
 * harsh "click" a raw oscillator on/off produces.
 */
function scheduleTone(ctx, { freq, start, duration, peakGain = 0.16 }) {
  const osc = ctx.createOscillator()
  const overtone = ctx.createOscillator()
  const gain = ctx.createGain()
  const overtoneGain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.value = freq
  overtone.type = 'sine'
  overtone.frequency.value = freq * 2
  overtoneGain.gain.value = 0.25

  const t0 = ctx.currentTime + start

  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

  osc.connect(gain)
  overtone.connect(overtoneGain)
  overtoneGain.connect(gain)
  gain.connect(ctx.destination)

  osc.start(t0)
  overtone.start(t0)
  osc.stop(t0 + duration + 0.05)
  overtone.stop(t0 + duration + 0.05)
}

const SOUND_PREF_KEY = 'notification-sound-enabled'

export const soundSettings = {
  isEnabled: () => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(SOUND_PREF_KEY)
    return stored === null ? true : stored === '1'
  },
  setEnabled: (enabled) => {
    localStorage.setItem(SOUND_PREF_KEY, enabled ? '1' : '0')
  },
}

/** Soft two-tone "ding-ding" — used for general notifications. */
export function playNotificationSound() {
  if (!soundSettings.isEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return
  scheduleTone(ctx, { freq: 880, start: 0, duration: 0.22, peakGain: 0.14 })
  scheduleTone(ctx, { freq: 1108.73, start: 0.09, duration: 0.28, peakGain: 0.12 })
}

/** Brighter ascending 4-note chime — used specifically for project completion. */
export function playCompletionSound() {
  if (!soundSettings.isEnabled()) return
  const ctx = getAudioContext()
  if (!ctx) return
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    scheduleTone(ctx, { freq, start: i * 0.1, duration: 0.35, peakGain: 0.15 })
  })
}
