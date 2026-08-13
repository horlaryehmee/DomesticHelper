import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Briefcase, Undo2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatRelative } from '@/lib/format'

interface Application {
  uuid: string
  status: string
  cover_note: string | null
  job: { uuid: string; title: string; work_type: string; city: string | null; state: string | null; status: string }
  created_at: string
}

export function HelperApplicationsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => api.get<{ data: Application[] }>('/helpers/applications'),
  })

  const withdraw = useMutation({
    mutationFn: (uuid: string) => api.post(`/helpers/applications/${uuid}/withdraw`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
      toast.success('Application withdrawn')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  if (isLoading) return <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>

  const applications = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track the status of every job you have applied for.</p>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No applications yet"
          description="Browse open jobs and apply to roles that match your skills."
          action={<Button asChild><Link to="/jobs">Browse jobs</Link></Button>}
        />
      ) : (
        <div className="space-y-4">
          {applications.map((a) => (
            <Card key={a.uuid} className="gap-3 py-5">
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/jobs/${a.job.uuid}`} className="font-semibold hover:text-primary hover:underline">{a.job.title}</Link>
                      <Badge variant={
                        a.status === 'hired' ? 'success' : a.status === 'rejected' || a.status === 'withdrawn' ? 'destructive' : a.status === 'applied' ? 'secondary' : 'warning'
                      }>
                        {a.status}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {a.job.work_type}{[a.job.city, a.job.state].filter(Boolean).length > 0 && ` · ${[a.job.city, a.job.state].filter(Boolean).join(', ')}`}
                    </div>
                    {a.cover_note && <p className="mt-2 rounded-md bg-muted/40 p-2.5 text-sm text-muted-foreground">{a.cover_note}</p>}
                    <div className="mt-1 text-xs text-muted-foreground">Applied {formatRelative(a.created_at)}</div>
                  </div>
                  {a.status === 'applied' && (
                    <Button size="sm" variant="outline" onClick={() => withdraw.mutate(a.uuid)} disabled={withdraw.isPending}>
                      <Undo2 /> Withdraw
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
