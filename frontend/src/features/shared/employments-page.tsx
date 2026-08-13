import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Users, BadgeCheck, ShieldQuestion } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { api, ApiError } from '@/lib/api'
import { formatDate, formatNaira } from '@/lib/format'
import { useAuth } from '@/lib/auth'

interface EmploymentRecord {
  uuid: string
  job_role: string
  start_date: string | null
  end_date: string | null
  salary: number | null
  employment_type: string
  location: string | null
  status: string
  verification_status: string
  termination_reason: string | null
  performance_rating: number | null
  employer: { uuid: string; name: string }
  helper: { uuid: string; name: string }
  review: { uuid: string; status: string } | null
}

interface PageData {
  data: EmploymentRecord[]
  meta: { current_page: number; last_page: number; total: number }
}

export function EmploymentsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [completing, setCompleting] = useState<EmploymentRecord | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['employments', page],
    queryFn: () => api.get<PageData>('/employments', { page }),
  })

  const completeMutation = useMutation({
    mutationFn: ({ uuid, payload }: { uuid: string; payload: Record<string, unknown> }) =>
      api.post(`/employments/${uuid}/complete`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employments'] })
      setCompleting(null)
      toast.success('Employment record updated')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  const verifyMutation = useMutation({
    mutationFn: (uuid: string) => api.post(`/employments/${uuid}/request-verification`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employments'] })
      toast.success('Verification request sent to the other party')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
  if (isError) return <ErrorState retry={() => refetch()} />

  const records = data?.data ?? []
  const isEmployer = user?.user_type === 'employer'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEmployer ? 'Track current hires and close out completed engagements.' : 'Your employment records and verified history.'}
        </p>
      </div>

      {records.length === 0 ? (
        <EmptyState icon={Users} title="No employment records yet" description="Employment records appear when a hire is confirmed on the platform." />
      ) : (
        <div className="space-y-4">
          {records.map((r) => (
            <Card key={r.uuid} className="gap-3 py-5">
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.job_role}</span>
                      <Badge variant={r.status === 'active' ? 'success' : r.status === 'completed' ? 'secondary' : r.status === 'disputed' ? 'warning' : 'outline'}>
                        {r.status}
                      </Badge>
                      {r.verification_status === 'verified' && (
                        <Badge variant="success"><BadgeCheck className="size-3" /> Verified</Badge>
                      )}
                      {r.verification_status !== 'verified' && <Badge variant="outline"><ShieldQuestion className="size-3" /> Unverified</Badge>}
                    </div>
                    <div className="mt-1.5 text-sm text-muted-foreground">
                      With {isEmployer ? r.helper.name : r.employer.name}
                      {r.location && ` · ${r.location}`}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {formatDate(r.start_date)} to {r.end_date ? formatDate(r.end_date) : 'present'}
                      {r.salary ? ` · ${formatNaira(r.salary)}/mo` : ''}
                    </div>
                    {r.termination_reason && <div className="mt-1 text-xs text-muted-foreground">Reason for leaving: {r.termination_reason}</div>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isEmployer && r.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => setCompleting(r)}>
                        Complete / end employment
                      </Button>
                    )}
                    {r.verification_status !== 'verified' && r.status !== 'active' && (
                      <Button size="sm" variant="outline" onClick={() => verifyMutation.mutate(r.uuid)} disabled={verifyMutation.isPending}>
                        Request verification
                      </Button>
                    )}
                    {isEmployer && r.status !== 'active' && !r.review && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">Leave a review</Button>
                        </DialogTrigger>
                        <ReviewDialog record={r} />
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {completing && (
            <CompleteDialog
              record={completing}
              onClose={() => setCompleting(null)}
              onSubmit={(payload) => completeMutation.mutate({ uuid: completing.uuid, payload })}
              pending={completeMutation.isPending}
            />
          )}
        </div>
      )}

      {data && data.meta.last_page > 1 && (
        <Pagination meta={data.meta as never} onChange={setPage} />
      )}
    </div>
  )
}

function CompleteDialog({ record, onClose, onSubmit, pending }: {
  record: EmploymentRecord
  onClose: () => void
  onSubmit: (p: Record<string, unknown>) => void
  pending: boolean
}) {
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('Contract completed')
  const [rating, setRating] = useState('5')

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete employment: {record.job_role}</DialogTitle>
          <DialogDescription>
            Closing this employment lets it become part of the helper&apos;s verified history once confirmed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>End date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason for leaving</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Performance (1 to 5)</Label>
            <Input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending} onClick={() => onSubmit({ end_date: endDate, termination_reason: reason, performance_rating: Number(rating) })}>
            Confirm completion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReviewDialog({ record }: { record: EmploymentRecord }) {
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState('')

  const submit = useMutation({
    mutationFn: () =>
      api.post('/reviews', {
        helper_uuid: record.helper.uuid,
        employment_record_uuid: record.uuid,
        rating,
        feedback,
        work_type: record.job_role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employments'] })
      toast.success('Review submitted for moderation')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed to submit review'),
  })

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Review {record.helper.name}</DialogTitle>
        <DialogDescription>
          Only reviews tied to real employment are accepted, and every review is moderated before it appears publicly.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setRating(i)} className={`text-2xl cursor-pointer ${i <= rating ? 'text-warning' : 'text-muted'}`}>
              ★
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label>Your feedback</Label>
          <textarea
            className="flex min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="How was your experience with this helper?"
          />
        </div>
      </div>
      <DialogFooter>
        <Button disabled={submit.isPending || feedback.length < 10} onClick={() => submit.mutate()}>
          Submit review
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
