/**
 * Downloads a remote file by fetching it as a blob first, then
 * triggering a save via a temporary object URL.
 *
 * Why not just `<a href={url} download>`? For cross-origin URLs
 * (like Cloudinary's CDN), browsers frequently ignore the
 * `download` attribute entirely and just navigate to / preview
 * the file instead of saving it — especially for video files.
 * Fetching the bytes ourselves and handing the browser a
 * same-origin `blob:` URL sidesteps that.
 *
 * Trade-off: the whole file is buffered in memory first, so this
 * is fine for subtitles/typical output videos but isn't meant for
 * multi-gigabyte files.
 */
export async function downloadRemoteFile(url, filename, onProgress) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Download failed')

  const total = Number(res.headers.get('content-length')) || 0
  let loaded = 0

  let blob
  if (total && res.body && onProgress) {
    const reader = res.body.getReader()
    const chunks = []
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      onProgress(Math.round((loaded / total) * 100))
    }
    blob = new Blob(chunks)
  } else {
    blob = await res.blob()
  }

  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}
