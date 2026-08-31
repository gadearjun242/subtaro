import { useEffect, useState } from 'react'

/** Tracks currentTime/playing/duration for a <video>/<audio> ref, live. */
export function useMediaTime(mediaRef) {
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

    if (el.duration) setDuration(el.duration)

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('seeked', onSeeked)
      el.removeEventListener('loadedmetadata', onLoadedMetadata)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaRef.current])

  return { currentTime, duration, isPlaying }
}
