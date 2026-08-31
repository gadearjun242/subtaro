import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/format'
import Dropdown from '@/components/ui/Dropdown'
import { useNotifications } from '@/context/NotificationsContext'

export default function NotificationBell() {
  const { items, unreadCount, markAllRead, clearAll } = useNotifications()

  return (
    <Dropdown
      panelClassName="w-80 p-0 overflow-hidden"
      trigger={
        <button
          onClick={markAllRead}
          className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
      }
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="text-sm font-bold text-slate-900 dark:text-white">Notifications</p>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="flex cursor-pointer items-center gap-1 text-xs font-medium text-slate-400 hover:text-brand-500"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto scrollbar-thin">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Inbox className="h-7 w-7 text-slate-300 dark:text-slate-700" />
            <p className="text-xs text-slate-400">
              Live updates from your projects will show up here.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="border-b border-slate-50 px-4 py-3 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
            >
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {item.message || item.type}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {item.projectId} · {formatDistanceToNow(item.timestamp)}
              </p>
            </div>
          ))
        )}
      </div>
    </Dropdown>
  )
}
