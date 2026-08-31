import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  LayoutDashboard,
  FolderKanban,
  Plus,
  BarChart3,
  UserCog,
  LogOut,
  ChevronsLeft,
} from 'lucide-react'
import Logo from '@/components/common/Logo'
import ThemeToggle from '@/components/common/ThemeToggle'
import { useSidebar } from '@/context/SidebarContext'
import { useAuth } from '@/context/AuthContext'
import Avatar from '@/components/common/Avatar'
import toast from 'react-hot-toast'

// "New Project" is intentionally NOT in this list — it gets its own
// standout CTA button above the regular nav (see below).
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/projects', label: 'Projects', icon: FolderKanban, end: true },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, end: true },
  { to: '/dashboard/profile', label: 'Profile & Settings', icon: UserCog, end: true },
]

export default function Sidebar() {
  const { collapsed, mobileOpen, closeMobile, toggleSidebar } = useSidebar()
  const { user, logout } = useAuth()
  const location = useLocation()
  const isNewProjectActive = location.pathname === '/dashboard/projects/new'

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out successfully')
    } catch {
      toast.error('Something went wrong, but you have been logged out locally.')
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 cursor-pointer bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900',
          collapsed ? 'lg:w-[76px]' : 'lg:w-64',
          'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Top: logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
          <Logo showText={!collapsed} />
          <button
            onClick={toggleSidebar}
            className="hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:flex"
          >
            <ChevronsLeft className={clsx('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>

        {/* New Project — a standout gradient CTA, visually distinct from the plain nav links below */}
        <div className={clsx('shrink-0 px-3 pt-4', collapsed && 'px-2.5')}>
          <NavLink
            to="/dashboard/projects/new"
            onClick={closeMobile}
            title={collapsed ? 'New Project' : undefined}
            className={clsx(
              'flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/30 transition-all hover:shadow-lg hover:shadow-brand-500/40 hover:brightness-110 active:scale-[0.98]',
              collapsed ? 'justify-center' : 'justify-center',
              isNewProjectActive && 'ring-2 ring-brand-300 ring-offset-2 dark:ring-offset-slate-900'
            )}
          >
            <Plus className="h-[18px] w-[18px] shrink-0" strokeWidth={2.5} />
            {!collapsed && <span>New Project</span>}
          </NavLink>
        </div>

        {/* Middle: scrollable nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeMobile}
              className={({ isActive }) =>
                clsx(
                  'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                )
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: fixed theme + user + logout */}
        <div className="shrink-0 space-y-1 border-t border-slate-100 p-3 dark:border-slate-800">
          <div
            className={clsx(
              'flex items-center gap-3 rounded-xl px-2 py-2',
              collapsed && 'justify-center'
            )}
          >
            <Avatar name={user?.name} src={user?.avatar} size="sm" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className={clsx(
              'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && 'Log out'}
          </button>

          <div className={clsx('flex items-center px-1 pt-1', collapsed ? 'justify-center' : 'justify-between')}>
            {!collapsed && <span className="text-xs font-medium text-slate-400">Theme</span>}
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  )
}
