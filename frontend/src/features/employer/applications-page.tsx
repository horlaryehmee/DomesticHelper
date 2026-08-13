import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatRelative } from '@/lib/format'

interface Application {
  uuid: string
  status: string
  cover_note: string | null
  job: { uuid: string; title: string; work_type: string }
  helper: {
    uuid: string
    name: string
    photo_url: string | null
    city: string | null
    years_experience: number
    skills: string[] | null
    verification_status: string | null
    trust_score: number | null
  }
  created_at: string
}

export function EmployerApplicationsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.get<{ data: Application[] }>('/employers/applications'),
  })

  const update = useMutation({
    mutationFn: ({ uuid, status }: { uuid: string; status: string }) => api.patch(`/employers/applications/${uuid}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Application updated')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>

  const applications = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review, shortlist and move applicants through the hiring flow.</p>
      </div>

      {applications.length === 0 ? (
        <EmptyState icon={Users} title="No applications yet" description="Applications to your jobs will appear here." />
      ) : (
        <div className="space-y-4">
          {applications.map((a) => (
            <Card key={a.uuid} className="gap-3 py-5">
              <CardContent>
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar className="size-14 rounded-xl">
                    <AvatarImage src={a.helper.photo_url ?? undefined} />
                    <AvatarFallback name={a.helper.name} className="rounded-xl">{a.helper.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/helpers/${a.helper.uuid}`} className="font-semibold hover:text-primary hover:underline">{a.helper.name}</Link>
                      {a.helper.verification_status === 'verified' && <Badge variant="success">Verified</Badge>}
                      <Badge variant={a.status === 'applied' ? 'secondary' : a.status === 'hired' ? 'success' : a.status === 'rejected' ? 'destructive' : 'warning'}>
                        {a.status}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      Applied for <span className="font-medium text-foreground">{a.job.title}</span>
                      {a.helper.city && ` · ${a.helper.city}`} · {a.helper.years_experience} yrs experience
                      {typeof a.helper.trust_score === 'number' && ` · Trust ${a.helper.trust_score}`}
                    </div>
                    {a.cover_note && <p className="mt-2 rounded-md bg-muted/40 p-2.5 text-sm text-muted-foreground">{a.cover_note}</p>}
                    <div className="mt-1 text-xs text-muted-foreground">{formatRelative(a.created_at)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Select
                      value={a.status}
                      onValueChange={(v) => update.mutate({ uuid: a.uuid, status: v })}
                    >
                      <SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shortlisted">Shortlist</SelectItem>
                        <SelectItem value="interview">Move to interview</SelectItem>
                        <SelectItem value="hired">Hire</SelectItem>
                        <SelectItem value="rejected">Reject</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/helpers/${a.helper.uuid}`}>View profile</Link>
                      </Button>
                    </div>
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
