import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileText, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { useAuth } from '@/lib/auth'
import { useQuery as useMetaQuery } from '@tanstack/react-query'

interface Report {
  uuid: string
  category: string
  description: string
  status: string
  outcome: string | null
  helper: { uuid: string; name: string }
  reporter: { uuid: string; name: string }
  helper_response: string | null
  admin_decision: string | null
  created_at: string
  decided_at: string | null
}

interface Meta {
  report_categories: { value: string; label: string }[]
}

export function ReportsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [respondTarget, setRespondTarget] = useState<Report | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.get<{ data: Report[] }>('/reports'),
  })

  const { data: meta } = useMetaQuery({ queryKey: ['meta'], queryFn: () => api.get<Meta>('/meta') })

  const respondMutation = useMutation({
    mutationFn: ({ uuid, response }: { uuid: string; response: string }) => api.post(`/reports/${uuid}/respond`, { response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setRespondTarget(null)
      toast.success('Your response has been recorded for review')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  if (isLoading) return <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
  if (isError) return <ErrorState retry={() => refetch()} />

  const reports = data?.data ?? []
  const isEmployer = user?.user_type === 'employer'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEmployer
              ? 'Reports are reviewed by our team before they can affect anything publicly.'
              : 'Reports concerning you. You always have the right to respond.'}
          </p>
        </div>
        {isEmployer && <NewReportDialog meta={meta} />}
      </div>

      {reports.length === 0 ? (
        <EmptyState icon={FileText} title="No reports" description={isEmployer ? 'You have not submitted any reports.' : 'No reports have been submitted concerning you.'} />
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <Card key={r.uuid} className="gap-3 py-5">
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">{r.category.replace(/_/g, ' ')}</Badge>
                      <Badge variant={r.status === 'closed' ? 'secondary' : 'warning'}>{r.status.replace(/_/g, ' ')}</Badge>
                      {r.outcome && <Badge variant={r.outcome === 'verified' ? 'destructive' : 'success'}>{r.outcome.replace(/_/g, ' ')}</Badge>}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{r.description}</p>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {isEmployer ? `Concerning: ${r.helper.name}` : `Reported by: ${r.reporter.name}`} · {formatDateTime(r.created_at)}
                    </div>
                    {r.helper_response && (
                      <div className="mt-3 rounded-md border-l-2 border-primary/40 bg-muted/40 p-3 text-sm">
                        <span className="font-medium">Helper response: </span>
                        {r.helper_response}
                      </div>
                    )}
                    {r.admin_decision && (
                      <div className="mt-2 rounded-md border-l-2 border-muted-foreground/40 bg-muted/40 p-3 text-sm">
                        <span className="font-medium">Team decision: </span>
                        {r.admin_decision}
                      </div>
                    )}
                  </div>
                  {!isEmployer && r.status !== 'closed' && !r.helper_response && (
                    <Button size="sm" variant="outline" onClick={() => setRespondTarget(r)}>
                      Respond to report
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {respondTarget && (
        <Dialog open onOpenChange={(o) => !o && setRespondTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Respond to report</DialogTitle>
              <DialogDescription>
                Your response is recorded and reviewed by our team. Unverified reports never affect your trust score.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label>Your response</Label>
              <Textarea
                rows={4}
                placeholder="Share your side of the story…"
                onChange={(e) => (respondTarget as Report & { draft?: string }).draft = e.target.value}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  const el = respondTarget as Report & { draft?: string }
                  if (el.draft && el.draft.length >= 10) respondMutation.mutate({ uuid: el.uuid, response: el.draft })
                }}
                disabled={respondMutation.isPending}
              >
                Submit response
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function NewReportDialog({ meta }: { meta?: Meta }) {
  const queryClient = useQueryClient()
  const [helperUuid, setHelperUuid] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')

  const submit = useMutation({
    mutationFn: () => api.post('/reports', { helper_uuid: helperUuid, category, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Report submitted. Our team will review it.')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not submit report'),
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button><ShieldAlert /> Submit a report</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit a report</DialogTitle>
          <DialogDescription>
            Reports document concerns for review. They do not automatically change a helper&apos;s public trust score. Our team verifies first, and the helper can respond.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Helper profile UUID (from their profile page)</Label>
            <Input value={helperUuid} onChange={(e) => setHelperUuid(e.target.value)} placeholder="Paste the helper's profile UUID" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {meta?.report_categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Details</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what happened, with dates where possible." />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={submit.isPending || !helperUuid || !category || description.length < 20} onClick={() => submit.mutate()}>
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
