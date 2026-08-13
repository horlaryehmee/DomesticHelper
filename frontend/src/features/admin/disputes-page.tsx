import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

interface Dispute {
  uuid: string
  reason: string
  explanation: string
  status: string
  disputable_type: string
  helper: { uuid: string; name: string }
  resolution_decision: string | null
  created_at: string
}

export function AdminDisputesPage() {
  const [statusFilter, setStatusFilter] = useState('submitted')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-disputes', statusFilter],
    queryFn: () => api.get<{ data: Dispute[] }>('/admin/disputes', { status: statusFilter || undefined }),
  })

  if (isLoading) return <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>

  const disputes = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Disputes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upholding a dispute against a trust score event reverses its impact, so helpers are protected from false accusations.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['submitted', 'under_review', 'awaiting_response', 'resolved', 'rejected', 'escalated'].map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)} className="shrink-0">
            {s.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>

      {disputes.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">No disputes in this state.</p>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <Card key={d.uuid} className="gap-3 py-5">
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ShieldAlert className="size-4 text-primary" />
                      <Badge variant="outline" className="capitalize">{d.disputable_type.replace(/_/g, ' ')}</Badge>
                      <Badge variant={d.status === 'resolved' ? 'success' : d.status === 'rejected' ? 'destructive' : 'warning'}>{d.status.replace(/_/g, ' ')}</Badge>
                      <span className="text-xs text-muted-foreground">{d.helper.name} · {formatDateTime(d.created_at)}</span>
                    </div>
                    <div className="mt-1.5 font-medium">{d.reason}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{d.explanation}</p>
                    {d.resolution_decision && <p className="mt-2 rounded-md bg-muted/40 p-2.5 text-sm"><span className="font-medium">Resolution: </span>{d.resolution_decision}</p>}
                  </div>
                  {d.status !== 'resolved' && d.status !== 'rejected' && <ResolveDialog dispute={d} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ResolveDialog({ dispute }: { dispute: Dispute }) {
  const queryClient = useQueryClient()
  const [uphold, setUphold] = useState<boolean | null>(null)
  const [decision, setDecision] = useState('')

  const resolve = useMutation({
    mutationFn: () => api.post(`/admin/disputes/${dispute.uuid}/decide`, { uphold, decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] })
      toast.success('Dispute resolved')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">Resolve</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve dispute</DialogTitle>
          <DialogDescription>Upholding a trust-score dispute reverses the original event and restores the score.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          {[
            { value: true, label: 'Uphold (in helper\u2019s favour)' },
            { value: false, label: 'Not upheld' },
          ].map((o) => (
            <button
              key={String(o.value)}
              onClick={() => setUphold(o.value)}
              className={`flex-1 cursor-pointer rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                uphold === o.value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label>Decision notes (required)</Label>
          <Textarea rows={3} value={decision} onChange={(e) => setDecision(e.target.value)} />
        </div>
        <DialogFooter>
          <Button disabled={resolve.isPending || uphold === null || decision.length < 10} onClick={() => resolve.mutate()}>
            Record resolution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
