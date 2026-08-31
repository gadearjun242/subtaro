import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import PublicLayout from '@/layouts/PublicLayout'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import ProtectedRoute from '@/routes/ProtectedRoute'
import PublicOnlyRoute from '@/routes/PublicOnlyRoute'

import Landing from '@/pages/public/Landing'
import Pricing from '@/pages/public/Pricing'
import Privacy from '@/pages/public/Privacy'
import Terms from '@/pages/public/Terms'
import Contact from '@/pages/public/Contact'
import NotFound from '@/pages/public/NotFound'

import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import VerifyEmail from '@/pages/auth/VerifyEmail'

import Overview from '@/pages/dashboard/Overview'
import ProjectsList from '@/pages/dashboard/ProjectsList'
import NewProject from '@/pages/dashboard/NewProject'
import ProjectDetail from '@/pages/dashboard/ProjectDetail'
import Analytics from '@/pages/dashboard/Analytics'
import Profile from '@/pages/dashboard/Profile'

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
    </BrowserRouter>
  )
}
