import { Link } from 'react-router-dom'
import { m as motion } from 'framer-motion'
import { Captions, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="relative flex min-h-[72vh] flex-col items-center justify-center overflow-hidden bg-grid px-4 text-center">
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-brand-500/10 blur-[100px]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10"
      >
        <span className="text-[7rem] font-black leading-none text-slate-100 dark:text-slate-900 sm:text-[9rem]">
          404
        </span>
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-xl shadow-brand-500/30">
            <Captions className="h-8 w-8" />
          </span>
        </span>
      </motion.div>
      <h1 className="relative z-10 mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
        This page went missing its subtitles
      </h1>
      <p className="relative z-10 mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link to="/" className="relative z-10 mt-8">
        <Button>
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Button>
      </Link>
    </div>
  )
}
