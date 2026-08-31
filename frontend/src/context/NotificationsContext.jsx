import { createContext, useContext, useEffect, useState } from 'react'
import { useSocket } from './SocketContext'
import { playNotificationSound, playCompletionSound } from '@/lib/sound'

const NotificationsContext = createContext(null)

const MAX_NOTIFICATIONS = 30
const COMPLETION_EVENT_TYPES = new Set(['project_completed', 'output:updated'])

export function NotificationsProvider({ children }) {
  const { socket } = useSocket()
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!socket) return undefined

    const handler = (payload) => {
      setItems((prev) => [
        { id: `${payload.projectId}-${payload.timestamp}-${Math.random()}`, read: false, ...payload },
        ...prev,
      ].slice(0, MAX_NOTIFICATIONS))

      if (COMPLETION_EVENT_TYPES.has(payload.type)) {
        playCompletionSound()
      } else {
        playNotificationSound()
      }
    }

    socket.on('project:event', handler)
    return () => socket.off('project:event', handler)
  }, [socket])

  const unreadCount = items.filter((i) => !i.read).length

  const markAllRead = () => setItems((prev) => prev.map((i) => ({ ...i, read: true })))
  const clearAll = () => setItems([])

  return (
    <NotificationsContext.Provider value={{ items, unreadCount, markAllRead, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
