import { Outlet } from 'react-router-dom'
import clsx from 'clsx'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import EmailVerificationBanner from '@/components/dashboard/EmailVerificationBanner'
import SubscriptionBanner from '@/components/dashboard/SubscriptionBanner'
import { SidebarProvider, useSidebar } from '@/context/SidebarContext'
import { SocketProvider } from '@/context/SocketContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { useAuth } from '@/context/AuthContext'

function DashboardShell() {
  const { collapsed } = useSidebar()
  const { user } = useAuth()

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-[#090d17]">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-96 bg-[radial-gradient(ellipse_at_70%_0%,rgb(10_132_255/0.08),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_70%_0%,rgb(10_132_255/0.1),transparent_70%)]" />
      <Sidebar />
      <div
        className={clsx(
          'flex min-h-screen flex-col transition-all duration-200',
          collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'
        )}
      >
        <Header />
        {user && !user.isEmailVerified && <EmailVerificationBanner />}
        <SubscriptionBanner />
        <main className="relative z-10 flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 lg:p-9">
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
