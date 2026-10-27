import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

export default function CTA() {
  const { isAuthenticated } = useAuth()

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black px-6 py-20 ring-1 ring-black/5 text-center sm:px-16">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 animate-blob rounded-full bg-brand-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 animate-blob rounded-full bg-accent-500/30 blur-3xl" style={{ animationDelay: '2.5s' }} />
        <div className="relative z-10">
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Your next video, captioned.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-slate-300">
            Start your 10-day free trial. Upload your first file in under a minute.
          </p>
          <Link to={isAuthenticated ? '/dashboard/projects/new' : '/register'} className="mt-8 inline-block">
            <Button size="lg">
              Try free for 10 days <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
