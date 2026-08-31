import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import FullScreenLoader from '@/components/common/FullScreenLoader'

/** For pages like /login and /register: bounce logged-in users to the dashboard. */
export default function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <FullScreenLoader label="Loading…" />

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
