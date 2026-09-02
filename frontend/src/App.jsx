import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import PublicLayout from '@/layouts/PublicLayout'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import ProtectedRoute from '@/routes/ProtectedRoute'
import PublicOnlyRoute from '@/routes/PublicOnlyRoute'
import FullScreenLoader from '@/components/common/FullScreenLoader'

// Every page is code-split by route: each import() becomes its own
// chunk, so e.g. recharts (Analytics-only) or the pptx-sized dashboard
// bundle never loads on the public landing page, and vice versa.
const Landing = lazy(() => import('@/pages/public/Landing'))
const Pricing = lazy(() => import('@/pages/public/Pricing'))
const Privacy = lazy(() => import('@/pages/public/Privacy'))
const Terms = lazy(() => import('@/pages/public/Terms'))
const Contact = lazy(() => import('@/pages/public/Contact'))
const NotFound = lazy(() => import('@/pages/public/NotFound'))

const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'))

const Overview = lazy(() => import('@/pages/dashboard/Overview'))
const ProjectsList = lazy(() => import('@/pages/dashboard/ProjectsList'))
const NewProject = lazy(() => import('@/pages/dashboard/NewProject'))
const ProjectDetail = lazy(() => import('@/pages/dashboard/ProjectDetail'))
const Analytics = lazy(() => import('@/pages/dashboard/Analytics'))
const Profile = lazy(() => import('@/pages/dashboard/Profile'))

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-white !text-slate-800 dark:!bg-slate-800 dark:!text-slate-100 !text-sm !rounded-xl',
          success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
          error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />
      <Suspense fallback={<FullScreenLoader label="Loading…" />}>
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
          <Route element={<ProtectedRoute />}>
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
