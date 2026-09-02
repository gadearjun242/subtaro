import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'

const PANEL_GAP = 8 // px between trigger and panel

export default function Dropdown({ trigger, children, align = 'right', panelClassName }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  const computeCoords = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setCoords({
      top: rect.bottom + PANEL_GAP,
      left: rect.left,
      right: window.innerWidth - rect.right,
    })
  }, [])

  const toggle = () => {
    if (!open) computeCoords()
    setOpen((o) => !o)
  }

  // Recompute once more after the panel actually mounts, in case
  // its own width/height (unknown beforehand) would push it
  // off-screen — keeps it fully visible regardless of trigger position.
  useLayoutEffect(() => {
    if (open) computeCoords()
  }, [open, computeCoords])

  // Close on outside click (portal means the trigger and panel are
  // no longer DOM-adjacent, so we check both refs), and on
  // scroll/resize so a stale position is never shown.
  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
    }

    const onScrollOrResize = () => setOpen(false)

    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  return (
    <>
      <div ref={triggerRef} onClick={toggle}>
        {trigger}
      </div>

      {createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'fixed',
                top: coords.top,
                ...(align === 'right' ? { right: coords.right } : { left: coords.left }),
              }}
              className={clsx(
                'z-[100] min-w-[14rem] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900',
                panelClassName
              )}
              onClick={() => setOpen(false)}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

export const DropdownItem = ({ icon: Icon, children, className, ...props }) => (
  <button
    className={clsx(
      'flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
      className
    )}
    {...props}
  >
    {Icon && <Icon className="h-4 w-4" />}
    {children}
  </button>
)
