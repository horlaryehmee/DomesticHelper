import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

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
}

export function AdminReportsPage() {
  const [statusFilter, setStatusFilter] = useState('submitted')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: () => api.get<{ data: Report[] }>('/admin/reports', { status: statusFilter || undefined }),
  })

  if (isLoading) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>

  const reports = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only verified outcomes affect trust scores. Every decision is audited and reversible.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['submitted', 'under_review', 'awaiting_helper_response', 'closed'].map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)} className="shrink-0">
            {s.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>

      {reports.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">No reports in this state.</p>
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
                      {r.outcome && <Badge variant={r.outcome === 'verified' || r.outcome === 'partially_verified' ? 'destructive' : 'success'}>{r.outcome.replace(/_/g, ' ')}</Badge>}
                      <span className="text-xs text-muted-foreground">{r.helper.name} · reported by {r.reporter.name} · {formatDateTime(r.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm">{r.description}</p>
                    {r.helper_response && (
                      <div className="mt-2 rounded-md border-l-2 border-primary/40 bg-muted/40 p-3 text-sm">
                        <span className="font-medium">Helper response: </span>{r.helper_response}
                      </div>
                    )}
                    {r.admin_decision && (
                      <div className="mt-2 rounded-md border-l-2 border-muted-foreground/40 bg-muted/40 p-3 text-sm">
                        <span className="font-medium">Decision: </span>{r.admin_decision}
                      </div>
                    )}
                  </div>
                  {r.status !== 'closed' && <DecideDialog report={r} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function DecideDialog({ report }: { report: Report }) {
  const queryClient = useQueryClient()
  const [outcome, setOutcome] = useState('')
  const [decision, setDecision] = useState('')

  const decide = useMutation({
    mutationFn: () => api.post(`/admin/reports/${report.uuid}/decide`, { outcome, decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      toast.success('Decision recorded')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm"><FileText /> Review &amp; decide</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report decision</DialogTitle>
          <DialogDescription>
            &ldquo;Verified&rdquo; and &ldquo;Partially verified&rdquo; will create a trust score event. Other outcomes leave the score unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select outcome" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unsubstantiated">Unsubstantiated</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="partially_verified">Partially verified</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Decision notes (required, recorded in audit trail)</Label>
            <Textarea rows={4} value={decision} onChange={(e) => setDecision(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={decide.isPending || !outcome || decision.length < 10} onClick={() => decide.mutate()}>
            Record decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
