/**
 * Parses SRT (or SRT-like) subtitle text into an array of cues:
 * [{ index, start, end, text }], with start/end in seconds.
 *
 * Deliberately forgiving — tolerates \r\n, missing blank lines
 * between blocks, and both "," and "." as the ms separator, so
 * it survives hand-edited files from the subtitle editor too.
 */
export function parseSrt(raw) {
  if (!raw || typeof raw !== 'string') return []

  const timeToSeconds = (h, m, s, ms) =>
    Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000

  const timeRegex =
    /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/

  const blocks = raw
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  const cues = []

  for (const block of blocks) {
    const lines = block.split('\n')
    const timeLineIndex = lines.findIndex((line) => timeRegex.test(line))
    if (timeLineIndex === -1) continue

    const match = lines[timeLineIndex].match(timeRegex)
    if (!match) continue

    const [, h1, m1, s1, ms1, h2, m2, s2, ms2] = match
    const start = timeToSeconds(h1, m1, s1, ms1)
    const end = timeToSeconds(h2, m2, s2, ms2)
    const text = lines.slice(timeLineIndex + 1).join('\n').trim()

    if (!text) continue

    const indexLine = lines[timeLineIndex - 1]
    const index = indexLine && /^\d+$/.test(indexLine.trim()) ? Number(indexLine.trim()) : cues.length + 1

    cues.push({ index, start, end, text })
  }

  return cues.sort((a, b) => a.start - b.start)
}

/** Finds the cue active at a given playback time, if any. */
export function findActiveCue(cues, currentTime) {
  if (!cues?.length) return null
  return cues.find((cue) => currentTime >= cue.start && currentTime <= cue.end) || null
}

/**
 * Converts SRT text to WebVTT text.
 *
 * Browsers only expose a native subtitle-selection UI (the "CC"
 * button) through a <track kind="subtitles"> element pointing at
 * a WebVTT file — they do NOT expose subtitle streams embedded
 * inside a video container (neither MP4's mov_text nor MKV's
 * soft-subtitle tracks are readable by the HTML5 <video> element).
 * So for in-browser playback we always convert to VTT and attach
 * it via <track>, regardless of which delivery mode produced the
 * downloadable video file.
 */
export function srtToVtt(srt) {
  if (!srt) return 'WEBVTT\n\n'

  const body = srt
    .replace(/\r\n/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2') // SRT uses a comma for ms, VTT needs a period

  return `WEBVTT\n\n${body.trim()}\n`
}
