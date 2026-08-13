import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Briefcase, CalendarClock, Star, ClipboardCheck, Eye, ShieldCheck, ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { TrustScoreRing, type TrustCategory } from '@/components/ui/trust-score'
import { VerificationBadge, type VerificationBadgeKey } from '@/components/ui/verification-badges'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

interface HelperStats {
  profile_views: number
  applications: number
  interviews_pending: number
  active_employment: number
  verified_jobs: number
  reviews: number
  average_rating: number
  open_reports: number
  open_disputes: number
  profile_completion: number
  verification_status: string | null
  trust_score: { score: number; category: string; label: string }
}

interface DashboardData {
  data: HelperStats
  verification_badges: string[]
  recent_notifications: { id: string; data: { title: string; body: string; action_url?: string }; created_at: string; read_at: string | null }[]
}

export function HelperDashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
  })

  const stats = data?.data

  const cards = [
    { label: 'Profile views', value: stats?.profile_views ?? 0, icon: Eye, to: '/helper/profile' },
    { label: 'Applications', value: stats?.applications ?? 0, icon: Briefcase, to: '/helper/applications' },
    { label: 'Interview requests', value: stats?.interviews_pending ?? 0, icon: CalendarClock, to: '/helper/interviews' },
    { label: 'Verified jobs', value: stats?.verified_jobs ?? 0, icon: ClipboardCheck, to: '/helper/employments' },
    { label: 'Reviews', value: stats?.reviews ?? 0, icon: Star, to: '/helper/reviews' },
    { label: 'Open reports', value: stats?.open_reports ?? 0, icon: ClipboardCheck, to: '/helper/reports' },
    { label: 'Open disputes', value: stats?.open_disputes ?? 0, icon: ShieldCheck, to: '/helper/disputes' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.first_name} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here is how your profile is doing.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Trust & verification */}
        <Card className="items-center gap-4 py-7 text-center">
          <TrustScoreRing
            score={stats?.trust_score?.score ?? 50}
            category={(stats?.trust_score?.category ?? 'new') as TrustCategory}
            size={140}
          />
          <div>
            <div className="font-semibold">{stats?.trust_score?.label ?? 'Building Trust'}</div>
            <div className="mt-1 text-sm text-muted-foreground">Keep completing verified employment to grow your score.</div>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 px-4">
            {(data?.verification_badges as VerificationBadgeKey[] | undefined)?.slice(0, 4).map((b) => <VerificationBadge key={b} badge={b} />)}
          </div>
          {stats?.verification_status !== 'verified' && (
            <Button asChild variant="outline" size="sm">
              <Link to="/helper/verification">Complete verification <ArrowRight /></Link>
            </Button>
          )}
        </Card>

        <div className="space-y-6">
          {/* Completion */}
          <Card className="gap-3">
            <CardContent className="flex flex-wrap items-center gap-4 pt-6">
              <div className="min-w-48 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Profile completion</span>
                  <span className="text-muted-foreground">{stats?.profile_completion ?? 0}%</span>
                </div>
                <Progress value={stats?.profile_completion ?? 0} className="mt-2" />
              </div>
              {stats && stats.profile_completion < 100 && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/helper/profile">Complete profile <ArrowRight /></Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <Link key={c.label} to={c.to}>
                <Card className="gap-3 py-5 transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <c.icon className="size-5 text-primary" />
                    </span>
                    <div>
                      <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-7 w-10" /> : c.value}</div>
                      <div className="text-xs text-muted-foreground">{c.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Notifications */}
          <Card className="gap-4">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent notifications</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/helper/notifications">View all <ArrowRight /></Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.recent_notifications.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>}
              {data?.recent_notifications.map((n) => (
                <div key={n.id} className={`rounded-md border p-3 text-sm ${n.read_at ? 'bg-background' : 'bg-primary/5'}`}>
                  <div className="font-medium">{n.data.title}</div>
                  <div className="mt-0.5 text-muted-foreground">{n.data.body}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
