import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const frontendDirectory = fileURLToPath(new URL('../', import.meta.url))
const distDirectory = path.join(frontendDirectory, 'dist')
const serverDirectory = path.join(frontendDirectory, 'dist-ssr')
const serverEntry = path.join(serverDirectory, 'entry-server.js')
const routes = [
  ['/', 'index.html'],
  ['/pricing', 'pricing/index.html'],
  ['/privacy', 'privacy/index.html'],
  ['/terms', 'terms/index.html'],
  ['/contact', 'contact/index.html'],
  ['/__not-found__', '404.html'],
]

try {
  const { render } = await import(pathToFileURL(serverEntry).href)

  for (const [pathname, fileName] of routes) {
    const filePath = path.join(distDirectory, fileName)
    const html = await readFile(filePath, 'utf8')
    const markup = await render(pathname)
    const root = '<div id="root"></div>'

    if (!markup || !html.includes(root)) {
      throw new Error(`Unable to prerender ${pathname} into ${fileName}`)
    }

    await writeFile(filePath, html.replace(root, `<div id="root">${markup}</div>`))
    console.log(`Prerendered ${pathname} to ${fileName}`)
  }
} finally {
  await rm(serverDirectory, { recursive: true, force: true })
}
