import React from 'react'
import { PassThrough } from 'node:stream'
import { renderToPipeableStream } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StaticRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { AppRoutes } from './App'

export function render(pathname) {
  const queryClient = new QueryClient()
  const app = (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <StaticRouter location={pathname}>
            <AppRoutes />
          </StaticRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )

  return new Promise((resolve, reject) => {
    const output = new PassThrough()
    const chunks = []
    let renderError

    output.on('data', (chunk) => chunks.push(chunk))
    output.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    output.on('error', reject)

    const { pipe } = renderToPipeableStream(app, {
      onAllReady() {
        if (renderError) {
          reject(renderError)
          return
        }
        pipe(output)
      },
      onShellError: reject,
      onError(error) {
        renderError = error
      },
    })
  })
}
