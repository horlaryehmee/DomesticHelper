import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Briefcase, Users, Heart, FileCheck2, CalendarClock, Star, ClipboardCheck, ArrowRight, Plus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { HelperCard } from '@/components/shared/helper-card'
import { api } from '@/lib/api'
import type { HelperSummary } from '@/lib/types'
import { useAuth } from '@/lib/auth'

interface EmployerStats {
  active_jobs: number
  total_applications: number
  current_hires: number
  completed_hires: number
  saved_helpers: number
  reports_purchased: number
  interviews_pending: number
  reviews_pending: number
  profile_completion: number
}

interface DashboardData {
  data: EmployerStats
  saved_helpers: HelperSummary[]
  recent_notifications: { id: string; data: { title: string; body: string; action_url?: string }; created_at: string; read_at: string | null }[]
}

export function EmployerDashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
  })

  const stats = data?.data

  const cards = [
    { label: 'Active jobs', value: stats?.active_jobs ?? 0, icon: Briefcase, to: '/employer/jobs' },
    { label: 'Applications received', value: stats?.total_applications ?? 0, icon: Users, to: '/employer/applications' },
    { label: 'Current hires', value: stats?.current_hires ?? 0, icon: ClipboardCheck, to: '/employer/employments' },
    { label: 'Completed hires', value: stats?.completed_hires ?? 0, icon: Users, to: '/employer/employments' },
    { label: 'Saved helpers', value: stats?.saved_helpers ?? 0, icon: Heart, to: '/employer/saved-helpers' },
    { label: 'Reports purchased', value: stats?.reports_purchased ?? 0, icon: FileCheck2, to: '/employer/verification-reports' },
    { label: 'Pending interviews', value: stats?.interviews_pending ?? 0, icon: CalendarClock, to: '/employer/interviews' },
    { label: 'Reviews to submit', value: stats?.reviews_pending ?? 0, icon: Star, to: '/employer/reviews' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.first_name} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here is what is happening with your hiring today.</p>
        </div>
        <Button asChild>
          <Link to="/employer/jobs"><Plus /> Post a job</Link>
        </Button>
      </div>

      {/* Profile completion */}
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
              <Link to="/employer/profile">Complete profile <ArrowRight /></Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Saved helpers */}
        <Card className="gap-4">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Saved helpers</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/employer/saved-helpers">View all <ArrowRight /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data && data.saved_helpers.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No saved helpers yet.{' '}
                <Link to="/search" className="font-medium text-primary hover:underline">Find helpers</Link>
              </p>
            )}
            {data?.saved_helpers.slice(0, 3).map((h) => <HelperCard key={h.uuid} helper={h} />)}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="gap-4">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent notifications</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/employer/notifications">View all <ArrowRight /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.recent_notifications.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
            )}
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
  )
}
