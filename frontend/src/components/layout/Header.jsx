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
    <header className="glass sticky top-0 z-30 flex min-h-[4.25rem] shrink-0 items-center justify-between gap-2 border-b border-black/5 px-4 py-2 dark:border-white/[0.08] sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle navigation"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
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
