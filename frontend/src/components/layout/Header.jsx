import { Menu, User, Settings, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useSidebar } from '@/context/SidebarContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuth } from '@/context/AuthContext'
import NotificationBell from '@/components/common/NotificationBell'
import SoundToggle from '@/components/common/SoundToggle'
import Avatar from '@/components/common/Avatar'
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown'

export default function Header() {
  const { toggleSidebar } = useSidebar()
  const { title, subtitle } = usePageTitle()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out successfully')
    } catch {
      toast.error('Logged out locally')
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-slate-900 dark:text-white sm:text-lg">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden truncate text-xs text-slate-400 sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <SoundToggle />
        <NotificationBell />
        <Dropdown
          trigger={
            <button className="flex cursor-pointer items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Avatar name={user?.name} src={user?.avatar} size="sm" />
            </button>
          }
        >
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {user?.name}
            </p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
          <div className="p-1">
            <DropdownItem icon={User} onClick={() => navigate('/dashboard/profile')}>
              My profile
            </DropdownItem>
            <DropdownItem icon={Settings} onClick={() => navigate('/dashboard/profile?tab=settings')}>
              Settings
            </DropdownItem>
            <DropdownItem
              icon={LogOut}
              onClick={handleLogout}
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              Log out
            </DropdownItem>
          </div>
        </Dropdown>
      </div>
    </header>
  )
}
