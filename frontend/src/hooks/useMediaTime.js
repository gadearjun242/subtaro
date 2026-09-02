import { useEffect, useState } from 'react'

/**
 * Tracks currentTime/playing/duration for a <video>/<audio> ref, live.
 *
 * `srcKey` should be the actual media source URL (or any value that
 * changes exactly when the element's src does). Using `mediaRef.current`
 * itself as the effect dependency doesn't work reliably — refs don't
 * trigger re-renders, and the dependency array is evaluated at render
 * time, *before* React commits the ref for that render, so the effect
 * can miss the element actually becoming available. Depending on the
 * src value (a normal prop/state value) instead ensures the effect
 * re-runs on the same commit that attaches the element, and by the time
 * a useEffect body runs the DOM/ref is always already committed, so
 * reading mediaRef.current inside the effect is safe.
 */
export function useMediaTime(mediaRef, srcKey) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const el = mediaRef.current
    if (!el) return undefined

    const onTimeUpdate = () => setCurrentTime(el.currentTime)
    const onSeeked = () => setCurrentTime(el.currentTime)
    const onLoadedMetadata = () => setDuration(el.duration || 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('seeked', onSeeked)
    el.addEventListener('loadedmetadata', onLoadedMetadata)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)

    // Reset for the new source, and pick up metadata if it's
    // already available (e.g. cached).
    setCurrentTime(0)
    if (el.duration) setDuration(el.duration)

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('seeked', onSeeked)
      el.removeEventListener('loadedmetadata', onLoadedMetadata)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
    }
  }, [mediaRef, srcKey])

  return { currentTime, duration, isPlaying }
}
