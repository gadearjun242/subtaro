import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import clsx from 'clsx'

export default function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={clsx(
        'relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
        className
      )}
    >
      <Sun className={clsx('h-[18px] w-[18px] transition-all', isDark ? 'scale-0 -rotate-90' : 'scale-100 rotate-0')} />
      <Moon className={clsx('absolute h-[18px] w-[18px] transition-all', isDark ? 'scale-100 rotate-0' : 'scale-0 rotate-90')} />
    </button>
  )
}
