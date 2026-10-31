import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { domAnimation, LazyMotion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import PublicLayout from '@/layouts/PublicLayout'
import ProtectedRoute from '@/routes/ProtectedRoute'
import PublicOnlyRoute from '@/routes/PublicOnlyRoute'
import FullScreenLoader from '@/components/common/FullScreenLoader'
import { resolveSeoMetadata } from '@/seoMetadata'

const AuthLayout = lazy(() => import('@/layouts/AuthLayout'))
const DashboardLayout = lazy(() => import('@/layouts/DashboardLayout'))
const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))

function RouteMetadata() {
  const { pathname } = useLocation()

  useEffect(() => {
    const metadata = resolveSeoMetadata(pathname)
    const setMetaContent = (selector, content) => {
      let element = document.querySelector(selector)
      if (content === null) {
        element?.remove()
        return
      }
      if (!element) {
        element = document.createElement('meta')
        if (selector.startsWith('meta[name=')) {
          element.name = selector.match(/meta\[name="([^"]+)"\]/)[1]
        } else {
          element.setAttribute('property', selector.match(/meta\[property="([^"]+)"\]/)[1])
        }
        document.head.append(element)
      }
      element.setAttribute('content', content)
    }

    document.title = metadata.title
    setMetaContent('meta[name="description"]', metadata.description)
    setMetaContent('meta[name="robots"]', metadata.robots)
    setMetaContent('meta[property="og:title"]', metadata.title)
    setMetaContent('meta[property="og:description"]', metadata.description)
    setMetaContent('meta[property="og:url"]', metadata.canonical)
    setMetaContent('meta[name="twitter:title"]', metadata.title)
    setMetaContent('meta[name="twitter:description"]', metadata.description)

    let canonical = document.querySelector('link[rel="canonical"]')
    if (metadata.canonical) {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.append(canonical)
      }
      canonical.href = metadata.canonical
    } else {
      canonical?.remove()
    }
  }, [pathname])

  return null
}

// Auth and dashboard screens stay split from the public landing bundle.
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

export function AppRoutes() {
  return (
    <LazyMotion features={domAnimation}>
      <>
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
      </>
    </LazyMotion>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
