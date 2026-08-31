import { useEffect, useRef } from 'react'
import { useSocket } from '@/context/SocketContext'

/**
 * Joins the `project:<id>` socket room and forwards every
 * `project:event` payload for that project to `onEvent`.
 */
export function useProjectSocket(projectId, onEvent) {
  const { socket, connected, joinProject, leaveProject } = useSocket()
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    if (!socket || !connected || !projectId) return undefined

    joinProject(projectId)

    const handleEvent = (payload) => {
      if (payload?.projectId === projectId) {
        handlerRef.current?.(payload)
      }
    }

    socket.on('project:event', handleEvent)

    return () => {
      socket.off('project:event', handleEvent)
      leaveProject(projectId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, projectId])
}
