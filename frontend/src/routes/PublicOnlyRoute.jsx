import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/** For pages like /login and /register: bounce logged-in users to the dashboard. */
export default function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (!isLoading && isAuthenticated) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
