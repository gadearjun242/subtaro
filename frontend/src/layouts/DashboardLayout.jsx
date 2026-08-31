import { Outlet } from 'react-router-dom'
import clsx from 'clsx'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import EmailVerificationBanner from '@/components/dashboard/EmailVerificationBanner'
import { SidebarProvider, useSidebar } from '@/context/SidebarContext'
import { SocketProvider } from '@/context/SocketContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { useAuth } from '@/context/AuthContext'

function DashboardShell() {
  const { collapsed } = useSidebar()
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div
        className={clsx(
          'flex min-h-screen flex-col transition-all duration-200',
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'
        )}
      >
        <Header />
        {user && !user.isEmailVerified && <EmailVerificationBanner />}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  return (
    <SocketProvider>
      <NotificationsProvider>
        <SidebarProvider>
          <DashboardShell />
        </SidebarProvider>
      </NotificationsProvider>
    </SocketProvider>
  )
}
