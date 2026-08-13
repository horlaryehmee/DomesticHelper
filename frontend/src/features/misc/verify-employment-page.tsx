import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PageLoader, Spinner } from '@/components/ui/spinner'
import { ErrorState } from '@/components/ui/states'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/format'

interface VerificationTokenData {
  status: string
  helper_name: string
  job_role: string
  start_date: string | null
  end_date: string | null
}

export function VerifyEmploymentPage() {
  const { token } = useParams<{ token: string }>()
  const [response, setResponse] = useState<string | null>(null)
  const [jobRole, setJobRole] = useState('')
  const [notes, setNotes] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [performance, setPerformance] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['verify-token', token],
    queryFn: () => api.get<{ data: VerificationTokenData }>(`/verify-employment/${token}`),
  })

  const respondMutation = useMutation({
    mutationFn: () =>
      api.post(`/verify-employment/${token}`, {
        response,
        job_role: jobRole || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        performance: performance ? Number(performance) : undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => toast.success('Thank you. Your response has been recorded.'),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not submit response'),
  })

  if (isLoading) return <PageLoader />
  if (isError) return <ErrorState retry={() => refetch()} />

  const info = data!.data
  const answered = info.status !== 'pending'

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-lg gap-5">
        <CardHeader className="items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </span>
          <CardTitle className="text-2xl">Confirm employment details</CardTitle>
          <CardDescription>
            {answered
              ? 'This verification request has already been answered.'
              : 'Your confirmation helps build this helper\u2019s verified employment history.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Helper</span><span className="font-medium">{info.helper_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium">{info.job_role}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span className="font-medium">{formatDate(info.start_date)} to {formatDate(info.end_date)}</span></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Status</span><Badge variant={answered ? 'secondary' : 'warning'}>{info.status}</Badge></div>
          </div>

          {!answered ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'confirmed', label: 'Confirmed' },
                  { key: 'unable_to_confirm', label: 'Unable to confirm' },
                  { key: 'disputed', label: 'Disputed' },
                ].map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setResponse(o.key)}
                    className={`cursor-pointer rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                      response === o.key ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              {response === 'confirmed' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Confirmed job role</Label>
                    <Input value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder={info.job_role} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Performance (1 to 5)</Label>
                    <Input type="number" min={1} max={5} value={performance} onChange={(e) => setPerformance(e.target.value)} placeholder="e.g. 4" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Start date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
              )}

              {response === 'disputed' && (
                <div className="space-y-1.5">
                  <Label>Please explain</Label>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What is incorrect about these details?" />
                </div>
              )}

              <Button className="w-full" disabled={!response || respondMutation.isPending} onClick={() => respondMutation.mutate()}>
                {respondMutation.isPending ? <Spinner label="Submitting…" /> : 'Submit response'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Confirmed records become part of the helper&apos;s public, verified employment history.
              </p>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">If you believe this is a mistake, please contact support.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
