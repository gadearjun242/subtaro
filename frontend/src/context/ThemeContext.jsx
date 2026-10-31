import { createContext, useContext, useEffect, useSyncExternalStore } from 'react'

const ThemeContext = createContext(null)
const THEME_CHANGE_EVENT = 'subtaro:theme-change'

function getStoredTheme() {
  return window.localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
}

function subscribeToTheme(onChange) {
  window.addEventListener('storage', onChange)
  window.addEventListener(THEME_CHANGE_EVENT, onChange)

  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(THEME_CHANGE_EVENT, onChange)
  }
}

function updateStoredTheme(nextTheme) {
  const resolvedTheme = typeof nextTheme === 'function'
    ? nextTheme(getStoredTheme())
    : nextTheme

  if (resolvedTheme !== 'light' && resolvedTheme !== 'dark') {
    throw new TypeError('Theme must be "light" or "dark"')
  }

  window.localStorage.setItem('theme', resolvedTheme)
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

export function ThemeProvider({ children }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getStoredTheme,
    () => 'dark',
  )

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
  }, [theme])

  const toggleTheme = () => updateStoredTheme((current) => (
    current === 'dark' ? 'light' : 'dark'
  ))

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme: updateStoredTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
