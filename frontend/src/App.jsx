import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import PublicLayout from '@/layouts/PublicLayout'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import ProtectedRoute from '@/routes/ProtectedRoute'
import PublicOnlyRoute from '@/routes/PublicOnlyRoute'
import FullScreenLoader from '@/components/common/FullScreenLoader'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'

const SITE_ORIGIN = 'https://subtaro.onrender.com'
const ROUTE_METADATA = {
  '/': {
    title: 'Subtaro — AI Subtitles for Video & Audio',
    description: 'Upload video or audio and get accurate, editable AI subtitles in minutes.',
  },
  '/pricing': {
    title: 'Pricing — Subtaro',
    description: 'Compare Subtaro plans for generating and editing accurate AI subtitles.',
  },
  '/privacy': {
    title: 'Privacy Policy — Subtaro',
    description: 'Learn how Subtaro handles and protects your information.',
  },
  '/terms': {
    title: 'Terms of Service — Subtaro',
    description: 'Read the terms for using Subtaro AI subtitle generation services.',
  },
  '/contact': {
    title: 'Contact — Subtaro',
    description: 'Get in touch with the Subtaro team for help with AI subtitles.',
  },
  '/login': {
    title: 'Log In — Subtaro',
    description: 'Log in to Subtaro to generate and edit AI subtitles for your videos and audio.',
  },
  '/register': {
    title: 'Create Your Account — Subtaro',
    description: 'Create a Subtaro account to start generating accurate AI subtitles.',
  },
}

function RouteMetadata() {
  const { pathname } = useLocation()

  useEffect(() => {
    const metadata = ROUTE_METADATA[pathname]
    const canonicalUrl = `${SITE_ORIGIN}${pathname === '/' ? '/' : pathname}`
    const title = metadata?.title || 'Subtaro — AI Subtitles for Video & Audio'
    const description = metadata?.description || 'Upload video or audio and get accurate, editable AI subtitles in minutes.'

    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[name="robots"]')?.setAttribute(
      'content',
      metadata ? 'index, follow' : 'noindex, nofollow',
    )
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl)
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title)
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description)
  }, [pathname])

  return null
}

// Login and registration load eagerly for immediate access; other route
// pages stay code-split to keep the initial bundle smaller.
const Landing = lazy(() => import('@/pages/public/Landing'))
const Pricing = lazy(() => import('@/pages/public/Pricing'))
const Privacy = lazy(() => import('@/pages/public/Privacy'))
const Terms = lazy(() => import('@/pages/public/Terms'))
const Contact = lazy(() => import('@/pages/public/Contact'))
const NotFound = lazy(() => import('@/pages/public/NotFound'))
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'))

const Overview = lazy(() => import('@/pages/dashboard/Overview'))
const ProjectsList = lazy(() => import('@/pages/dashboard/ProjectsList'))
const NewProject = lazy(() => import('@/pages/dashboard/NewProject'))
const ProjectDetail = lazy(() => import('@/pages/dashboard/ProjectDetail'))
const Studio = lazy(() => import('@/pages/dashboard/Studio'))
const Analytics = lazy(() => import('@/pages/dashboard/Analytics'))
const Profile = lazy(() => import('@/pages/dashboard/Profile'))

export default function App() {
  return (
    <BrowserRouter>
      <RouteMetadata />
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-white !text-slate-800 dark:!bg-slate-800 dark:!text-slate-100 !text-sm !rounded-xl',
          success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />
      <Suspense fallback={null}>
        <Routes>
          {/* Public site */}
          <Route element={<PublicLayout />}>
            <Route index element={<Landing />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="contact" element={<Contact />} />
          </Route>

          {/* Auth (redirects to dashboard if already logged in) */}
          <Route element={<PublicOnlyRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
            </Route>
          </Route>

          {/* Standalone - works whether logged in or not */}
          <Route path="verify-email/:token" element={<VerifyEmail />} />

          {/* Private dashboard */}
          <Route
            element={(
              <Suspense fallback={<FullScreenLoader label="Loading…" />}>
                <ProtectedRoute />
              </Suspense>
            )}
          >
            {/* Full-screen editor: intentionally outside the dashboard chrome */}
            <Route path="dashboard/projects/:projectId/studio" element={<Studio />} />
            <Route path="dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="projects" element={<ProjectsList />} />
              <Route path="projects/new" element={<NewProject />} />
              <Route path="projects/:projectId" element={<ProjectDetail />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
