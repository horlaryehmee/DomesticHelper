import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarClock, MapPin, Phone, Video, Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useAuth } from '@/lib/auth'

interface Interview {
  uuid: string
  mode: 'in_person' | 'phone' | 'video'
  scheduled_at: string
  location: string | null
  notes: string | null
  status: string
  job: { uuid: string; title: string } | null
  employer: { uuid: string; name: string }
  helper: { uuid: string; name: string; photo_url: string | null }
}

const modeIcon = { in_person: MapPin, phone: Phone, video: Video }

export function InterviewsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['interviews'],
    queryFn: () => api.get<{ data: Interview[] }>('/interviews'),
  })

  const respond = useMutation({
    mutationFn: ({ uuid, response }: { uuid: string; response: string }) => api.post(`/interviews/${uuid}/respond`, { response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
      toast.success('Response sent')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
  if (isError) return <ErrorState retry={() => refetch()} />

  const interviews = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Interviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your interview requests and schedule.</p>
      </div>

      {interviews.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No interviews yet" description="Interview requests will appear here." />
      ) : (
        <div className="space-y-4">
          {interviews.map((i) => {
            const Icon = modeIcon[i.mode]
            const otherName = user?.user_type === 'employer' ? i.helper.name : i.employer.name
            const canRespond = user?.user_type === 'helper' && i.status === 'requested'
            return (
              <Card key={i.uuid} className="gap-3 py-5">
                <CardContent>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{otherName}</span>
                        <Badge variant={i.status === 'requested' ? 'warning' : i.status === 'accepted' ? 'success' : i.status === 'declined' ? 'destructive' : 'secondary'}>
                          {i.status}
                        </Badge>
                      </div>
                      {i.job && <div className="mt-0.5 text-sm text-muted-foreground">For: {i.job.title}</div>}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><CalendarClock className="size-3.5" /> {formatDateTime(i.scheduled_at)}</span>
                        <span className="flex items-center gap-1 capitalize"><Icon className="size-3.5" /> {i.mode.replace(/_/g, ' ')}</span>
                        {i.location && <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {i.location}</span>}
                      </div>
                      {i.notes && <p className="mt-2 text-sm text-muted-foreground">{i.notes}</p>}
                    </div>
                    {canRespond && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => respond.mutate({ uuid: i.uuid, response: 'accepted' })}>
                          <Check /> Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => respond.mutate({ uuid: i.uuid, response: 'declined' })}>
                          <X /> Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
