import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createReadStream } from 'node:fs'
import { defineConfig } from 'vite'
import path from 'path'
import { renderSeoHtml, ROUTE_METADATA } from './src/seoMetadata.js'

function seoPagesPlugin() {
  return {
    name: 'subtaro-seo-pages',
    transformIndexHtml(html, context) {
      const pathname = new URL(context.path, 'http://localhost').pathname
      return renderSeoHtml(html, pathname)
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== 'GET' && request.method !== 'HEAD') return next()
        if (!request.headers.accept?.includes('text/html')) return next()

        const requestUrl = new URL(request.url, 'http://localhost')
        const pathname = requestUrl.pathname.length > 1
          ? requestUrl.pathname.replace(/\/+$/, '')
          : requestUrl.pathname

        if (ROUTE_METADATA[pathname] && pathname !== '/') {
          request.url = `${pathname}/index.html${requestUrl.search}`
          return next()
        }

        if (
          /^\/dashboard(?:\/projects(?:\/(?:new|[^/]+(?:\/studio)?))?|\/(?:analytics|profile))?\/?$/.test(pathname)
        ) {
          request.url = `/app.html${requestUrl.search}`
          return next()
        }

        if (/^\/verify-email\/[^/]+\/?$/.test(pathname)) {
          request.url = `/verify-email/index.html${requestUrl.search}`
          return next()
        }

        if (pathname !== '/') {
          response.statusCode = 404
          response.setHeader('Content-Type', 'text/html; charset=utf-8')

          if (request.method === 'HEAD') return response.end()

          const notFoundPage = path.resolve(
            server.config.root,
            server.config.build.outDir,
            '404.html',
          )
          const stream = createReadStream(notFoundPage)
          stream.on('error', next)
          stream.pipe(response)
          return
        }

        return next()
      })
    },
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        const index = bundle['index.html']
        if (!index || index.type !== 'asset') return

        const template = typeof index.source === 'string'
          ? index.source
          : Buffer.from(index.source).toString('utf8')

        for (const pathname of Object.keys(ROUTE_METADATA)) {
          if (pathname === '/') continue
          this.emitFile({
            type: 'asset',
            fileName: `${pathname.slice(1)}/index.html`,
            source: renderSeoHtml(template, pathname),
          })
        }

        this.emitFile({
          type: 'asset',
          fileName: 'app.html',
          source: renderSeoHtml(template, '/dashboard'),
        })
        this.emitFile({
          type: 'asset',
          fileName: 'verify-email/index.html',
          source: renderSeoHtml(template, '/verify-email/token'),
        })
        this.emitFile({
          type: 'asset',
          fileName: '404.html',
          source: renderSeoHtml(template, '/404'),
        })
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), seoPagesPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
})
