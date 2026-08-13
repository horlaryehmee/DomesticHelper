import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RatingStars } from '@/components/ui/rating'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/format'

interface Review {
  uuid: string
  rating: number
  work_type: string | null
  feedback: string
  status: string
  employer: { uuid: string; name: string }
  helper: { uuid: string; name: string }
  created_at: string
}

export function AdminReviewsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('pending')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', statusFilter],
    queryFn: () => api.get<{ data: Review[] }>('/admin/reviews', { status: statusFilter || undefined }),
  })

  const moderate = useMutation({
    mutationFn: ({ uuid, status }: { uuid: string; status: string }) => api.post(`/admin/reviews/${uuid}/moderate`, { status, note: 'Moderated via admin panel.' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
      toast.success('Review moderated')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  if (isLoading) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>

  const reviews = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every public review passes through moderation here.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['pending', 'approved', 'disputed', 'removed'].map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)} className="shrink-0">
            {s}
          </Button>
        ))}
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">No reviews in this state.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <Card key={r.uuid} className="gap-3 py-5">
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <RatingStars rating={r.rating} size="size-4" />
                      <Badge variant={r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warning' : 'destructive'}>{r.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {r.employer.name} → {r.helper.name} · {formatDate(r.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{r.feedback}</p>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => moderate.mutate({ uuid: r.uuid, status: 'approved' })}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => moderate.mutate({ uuid: r.uuid, status: 'rejected' })}>Reject</Button>
                    </div>
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
