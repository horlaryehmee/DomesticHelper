import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { RatingStars } from '@/components/ui/rating'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useAuth } from '@/lib/auth'

interface Review {
  uuid: string
  rating: number
  work_type: string | null
  duration_worked: string | null
  feedback: string
  status: string
  employment: { uuid: string; job_role: string; start_date: string | null; end_date: string | null } | null
  employer: { uuid: string; name: string }
  helper: { uuid: string; name: string }
  responses: { author_name: string; content: string; created_at: string }[]
  created_at: string
}

export function ReviewsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [replyTarget, setReplyTarget] = useState<Review | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => api.get<{ data: Review[] }>('/reviews'),
  })

  const replyMutation = useMutation({
    mutationFn: ({ uuid, content }: { uuid: string; content: string }) => api.post(`/reviews/${uuid}/respond`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      setReplyTarget(null)
      toast.success('Reply posted')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  if (isLoading) return <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
  if (isError) return <ErrorState retry={() => refetch()} />

  const reviews = data?.data ?? []
  const isEmployer = user?.user_type === 'employer'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEmployer ? 'Reviews you have written. They appear publicly after moderation.' : 'Reviews from verified employers about your work.'}
        </p>
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description={isEmployer ? 'Leave a review from your employment records.' : 'Reviews will appear after verified employers complete engagements with you.'} />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <Card key={r.uuid} className="gap-3 py-5">
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <RatingStars rating={r.rating} size="size-4" />
                      <Badge variant={
                        r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warning' : r.status === 'disputed' ? 'warning' : 'destructive'
                      }>
                        {r.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {isEmployer ? `About ${r.helper.name}` : `From ${r.employer.name}`}
                      {r.employment?.job_role ? ` · ${r.employment.job_role}` : ''} · {formatDate(r.created_at)}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{r.feedback}</p>
                    {r.responses?.map((resp, i) => (
                      <div key={i} className="mt-2 rounded-md bg-muted/50 p-3 text-sm">
                        <span className="font-medium">{resp.author_name}: </span>
                        {resp.content}
                      </div>
                    ))}
                  </div>
                  {!isEmployer && (
                    <Dialog open={!!replyTarget && replyTarget.uuid === r.uuid} onOpenChange={(o) => !o && setReplyTarget(null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setReplyTarget(r)}>Reply</Button>
                      </DialogTrigger>
                      {replyTarget?.uuid === r.uuid && (
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reply to review</DialogTitle>
                            <DialogDescription>Your reply appears publicly under the review.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-1.5">
                            <Label>Your reply</Label>
                            <Textarea rows={3} onChange={(e) => (replyTarget as Review & { draft?: string }).draft = e.target.value} />
                          </div>
                          <DialogFooter>
                            <Button
                              disabled={replyMutation.isPending}
                              onClick={() => {
                                const t = replyTarget as Review & { draft?: string }
                                if (t.draft && t.draft.length >= 2) replyMutation.mutate({ uuid: t.uuid, content: t.draft })
                              }}
                            >
                              Post reply
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      )}
                    </Dialog>
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
