import { useLocation, useParams } from 'react-router-dom'

const STATIC_TITLES = [
  { test: (p) => p === '/dashboard', title: 'Overview', subtitle: 'Your subtitle pipeline at a glance' },
  { test: (p) => p === '/dashboard/projects', title: 'Projects', subtitle: 'Every video & audio job you have run' },
  { test: (p) => p === '/dashboard/projects/new', title: 'New Project', subtitle: 'Upload a file to generate subtitles' },
  { test: (p) => p === '/dashboard/analytics', title: 'Analytics', subtitle: 'Usage, processing time & output stats' },
  { test: (p) => p === '/dashboard/profile', title: 'Profile & Settings', subtitle: 'Manage your account' },
]

export function usePageTitle() {
  const location = useLocation()
  const params = useParams()

  if (params.projectId && location.pathname.includes('/projects/')) {
    return { title: 'Project Details', subtitle: params.projectId }
  }

  const match = STATIC_TITLES.find((entry) => entry.test(location.pathname))
  return match || { title: 'Dashboard', subtitle: '' }
}
