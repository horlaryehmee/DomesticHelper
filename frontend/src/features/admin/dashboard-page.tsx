import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Briefcase, FileText, ClipboardCheck, Star, CreditCard, UserCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { api } from '@/lib/api'
import { compactNumber, formatNaira } from '@/lib/format'

interface AdminStats {
  total_users: number
  employers: number
  helpers: number
  verified_helpers: number
  helpers_under_review: number
  flagged_cases: number
  pending_verifications: number
  pending_reports: number
  pending_disputes: number
  pending_reviews: number
  active_jobs: number
  completed_hires: number
  revenue: number
  verification_report_purchases: number
  signups_30d: { date: string; count: number }[]
  jobs_30d: { date: string; count: number }[]
  revenue_30d: { date: string; total: number }[]
}

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get<{ data: AdminStats }>('/dashboard'),
  })

  const stats = data?.data

  const cards = [
    { label: 'Total users', value: stats?.total_users ?? 0, icon: Users, to: '/admin/users' },
    { label: 'Employers', value: stats?.employers ?? 0, icon: Users, to: '/admin/users' },
    { label: 'Helpers', value: stats?.helpers ?? 0, icon: Users, to: '/admin/users' },
    { label: 'Verified helpers', value: stats?.verified_helpers ?? 0, icon: UserCheck, to: '/admin/verifications' },
    { label: 'Under review', value: stats?.helpers_under_review ?? 0, icon: UserCheck, to: '/admin/verifications' },
    { label: 'Flagged cases', value: stats?.flagged_cases ?? 0, icon: ClipboardCheck, to: '/admin/reports' },
    { label: 'Pending reports', value: stats?.pending_reports ?? 0, icon: FileText, to: '/admin/reports' },
    { label: 'Pending disputes', value: stats?.pending_disputes ?? 0, icon: ClipboardCheck, to: '/admin/disputes' },
    { label: 'Pending reviews', value: stats?.pending_reviews ?? 0, icon: Star, to: '/admin/reviews' },
    { label: 'Active jobs', value: stats?.active_jobs ?? 0, icon: Briefcase, to: '/admin/jobs' },
    { label: 'Completed hires', value: stats?.completed_hires ?? 0, icon: UserCheck, to: '/admin/users' },
    { label: 'Revenue', value: formatNaira(stats?.revenue ?? 0), icon: CreditCard, to: '/admin/payments' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform overview and moderation queues.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="gap-3 py-5 transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <c.icon className="size-5 text-primary" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-xl font-bold">{isLoading ? <Skeleton className="h-6 w-16" /> : c.value}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign-ups (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.signups_30d ?? []}>
                  <defs>
                    <linearGradient id="signups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="var(--color-primary)" fill="url(#signups)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue (30 days, ₦)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.revenue_30d ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => compactNumber(v)} />
                  <Tooltip formatter={(v) => formatNaira(Number(v))} />
                  <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
