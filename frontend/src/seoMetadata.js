export const SITE_ORIGIN = 'https://subtaro.onrender.com'

export const ROUTE_METADATA = {
  '/': {
    title: 'AI Subtitle Generator for Video & Audio | Subtaro',
    description:
      'Generate, edit, and style AI subtitles for video and audio. Create speaker-aware captions and export finished videos with Subtaro.',
    indexable: true,
  },
  '/pricing': {
    title: 'AI Subtitle Generator Pricing | Subtaro',
    description:
      'Compare Subtaro plans for AI subtitle generation, caption editing, styling, and video export. Every account starts with a 10-day free trial.',
    indexable: true,
  },
  '/privacy': {
    title: 'Privacy Policy | Subtaro',
    description: 'Learn how Subtaro collects, uses, and protects your personal information.',
    indexable: true,
  },
  '/terms': {
    title: 'Terms of Service | Subtaro',
    description: 'Review the terms and conditions for using Subtaro subtitle generation services.',
    indexable: true,
  },
  '/contact': {
    title: 'Contact Subtaro | Support and Questions',
    description: 'Contact the Subtaro team for support, product questions, or feedback about AI subtitles.',
    indexable: true,
  },
  '/login': {
    title: 'Log In | Subtaro',
    description: 'Log in to manage your Subtaro subtitle projects.',
    indexable: false,
  },
  '/register': {
    title: 'Create Your Subtaro Account',
    description: 'Create a Subtaro account to start generating and editing AI subtitles.',
    indexable: false,
  },
}

const APP_METADATA = {
  title: 'Subtaro Dashboard',
  description: 'Manage your Subtaro account and subtitle projects.',
  indexable: false,
}

const NOT_FOUND_METADATA = {
  title: 'Page Not Found | Subtaro',
  description: 'The page you are looking for could not be found.',
  indexable: false,
}

const VERIFY_EMAIL_METADATA = {
  title: 'Verify Your Email | Subtaro',
  description: 'Verify your email address to finish creating your Subtaro account.',
  indexable: false,
}

function normalizePathname(pathname) {
  const path = pathname === '/index.html' ? '/' : pathname
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

export function resolveSeoMetadata(pathname) {
  const path = normalizePathname(pathname)
  const metadata = ROUTE_METADATA[path]
    || (path.startsWith('/dashboard/') || path === '/dashboard'
      ? APP_METADATA
      : path.startsWith('/verify-email/')
        ? VERIFY_EMAIL_METADATA
        : NOT_FOUND_METADATA)

  return {
    ...metadata,
    robots: metadata.indexable ? 'index, follow' : 'noindex, nofollow',
    canonical: metadata.indexable ? `${SITE_ORIGIN}${path === '/' ? '/' : path}` : null,
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function updateMeta(html, key, name, value) {
  const tagPattern = new RegExp(`<meta\\s+${key}="${name}"[^>]*>`, 'i')
  if (value === null) return html.replace(tagPattern, '')

  const content = escapeHtml(value)
  return html.replace(tagPattern, (tag) => (
    tag.replace(/\bcontent="[^"]*"/i, `content="${content}"`)
  ))
}

export function renderSeoHtml(html, pathname) {
  const metadata = resolveSeoMetadata(pathname)
  const title = `<title>${escapeHtml(metadata.title)}</title>`
  const titlePattern = /<title>[\s\S]*?<\/title>/i

  html = html.replace(titlePattern, title)
  html = updateMeta(html, 'name', 'description', metadata.description)
  html = updateMeta(html, 'name', 'robots', metadata.robots)
  html = updateMeta(html, 'property', 'og:title', metadata.title)
  html = updateMeta(html, 'property', 'og:description', metadata.description)
  html = updateMeta(html, 'property', 'og:url', metadata.canonical)
  html = updateMeta(html, 'name', 'twitter:title', metadata.title)
  html = updateMeta(html, 'name', 'twitter:description', metadata.description)

  const canonicalPattern = /<link\s+rel="canonical"[^>]*>/i
  if (metadata.canonical) {
    html = html.replace(canonicalPattern, (tag) => (
      tag.replace(/\bhref="[^"]*"/i, `href="${escapeHtml(metadata.canonical)}"`)
    ))
  } else {
    html = html.replace(canonicalPattern, '')
  }

  return html
}
