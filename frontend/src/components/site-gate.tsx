import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/ui/spinner'
import { ComingSoonPage } from '@/features/misc/coming-soon-page'
import { getPreviewToken, setPreviewToken } from '@/lib/api'
import { useAuth } from '@/lib/auth'

interface SiteStatus {
  enabled: boolean
  access: boolean
}

export function SiteGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const [previewToken] = useState(() => {
    const fromLink = new URLSearchParams(window.location.hash.slice(1)).get('preview')
    return fromLink || getPreviewToken()
  })

  useEffect(() => {
    if (!window.location.hash.startsWith('#preview=')) return
    setPreviewToken(previewToken)
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }, [previewToken])

  const allowedAuthPage = location.pathname === '/login' || location.pathname === '/forgot-password'
  const isAdmin = user?.user_type === 'admin'
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['site-status', previewToken],
    queryFn: async (): Promise<SiteStatus> => {
      const response = await fetch('/api/site-status', {
        headers: previewToken ? { 'X-Site-Preview-Token': previewToken } : {},
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Could not load site status')
      return response.json() as Promise<SiteStatus>
    },
    enabled: !authLoading && !isAdmin && !allowedAuthPage,
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })

  if (authLoading || (!isAdmin && !allowedAuthPage && isPending)) return <PageLoader />
  if (isAdmin || allowedAuthPage || data?.enabled === false || data?.access) return <>{children}</>
  if (isError) return <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center"><p>We could not load the site right now.</p><button className="font-semibold text-primary underline" onClick={() => refetch()}>Try again</button></main>
  return <ComingSoonPage />
}
