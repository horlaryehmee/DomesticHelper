import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { formatDate, formatSalary } from '@/lib/format'

interface Job {
  uuid: string
  title: string
  work_type: string
  status: string
  city: string | null
  state: string | null
  salary_min: number | null
  salary_max: number | null
  applications_count: number
  employer: { name: string } | null
  created_at: string
}

export function AdminJobsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => api.get<{ data: Job[] }>('/admin/jobs'),
  })

  const moderate = useMutation({
    mutationFn: ({ uuid, status }: { uuid: string; status: string }) => api.post(`/admin/jobs/${uuid}/moderate`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] })
      toast.success('Job moderated')
    },
  })

  if (isLoading) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>

  const jobs = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor and moderate job listings across the platform.</p>
      </div>

      {jobs.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">No jobs found.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((j) => (
            <Card key={j.uuid} className="gap-3 py-5">
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{j.title}</span>
                      <Badge variant={j.status === 'active' ? 'success' : j.status === 'reported' ? 'destructive' : 'secondary'}>{j.status}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {j.employer?.name} · {[j.city, j.state].filter(Boolean).join(', ')} · {formatSalary(j.salary_min, j.salary_max)} · {j.applications_count} applicants · {formatDate(j.created_at)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {j.status === 'reported' && (
                      <Button size="sm" variant="outline" onClick={() => moderate.mutate({ uuid: j.uuid, status: 'closed' })}>
                        <ShieldCheck /> Close listing
                      </Button>
                    )}
                    {j.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => moderate.mutate({ uuid: j.uuid, status: 'closed' })}>
                        Close listing
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
