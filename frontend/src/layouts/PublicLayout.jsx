import { Outlet } from 'react-router-dom'
import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'

export default function PublicLayout() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f3f2ed] dark:bg-[#090d17]">
      <div className="pointer-events-none absolute inset-x-0 top-14 -z-0 mx-auto h-[36rem] max-w-7xl bg-[radial-gradient(ellipse_at_50%_0%,rgb(10_132_255/0.07),transparent_65%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,rgb(10_132_255/0.12),transparent_65%)]" />
      <PublicHeader />
      <main className="relative z-10 flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
