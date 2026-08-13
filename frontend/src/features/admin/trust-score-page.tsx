import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Gauge, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

interface Rule {
  id: number
  slug: string
  name: string
  event_type: string
  points: number
  active: boolean
  description: string | null
}

interface Event {
  uuid: string
  event_type: string
  points: number
  note: string | null
  helper_name: string
  helper_uuid: string
  created_at: string
}

export function AdminTrustScorePage() {
  const queryClient = useQueryClient()
  const [editingPoints, setEditingPoints] = useState<Record<number, string>>({})

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['trust-rules'],
    queryFn: () => api.get<{ data: Rule[] }>('/admin/trust-score/rules'),
  })

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['trust-events'],
    queryFn: () => api.get<{ data: Event[] }>('/admin/trust-score/events'),
  })

  const saveRule = useMutation({
    mutationFn: ({ id, points, active }: { id: number; points: number; active?: boolean }) =>
      api.put(`/admin/trust-score/rules/${id}`, { points, ...(active !== undefined ? { active } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-rules'] })
      toast.success('Rule updated')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  const recalc = useMutation({
    mutationFn: () => api.post('/admin/trust-score/recalculate'),
    onSuccess: () => toast.success('All trust scores recalculated'),
    onError: () => toast.error('Recalculation failed'),
  })

  if (rulesLoading) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>

  const ruleList = rules?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trust scores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure scoring rules and inspect the event ledger. Scores are always computed from auditable events.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => recalc.mutate()} disabled={recalc.isPending}>
            <RefreshCw /> Recalculate all scores
          </Button>
          <ManualAdjustDialog />
        </div>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <div className="grid gap-4 sm:grid-cols-2">
            {ruleList.map((r) => (
              <Card key={r.id} className="gap-3 py-5">
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        <Badge variant={r.active ? 'success' : 'outline'}>{r.active ? 'active' : 'inactive'}</Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{r.event_type}</div>
                    </div>
                    <span className={`font-mono text-xl font-bold ${r.points >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {r.points >= 0 ? '+' : ''}{r.points}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-8 w-24"
                      value={editingPoints[r.id] ?? String(r.points)}
                      onChange={(e) => setEditingPoints((s) => ({ ...s, [r.id]: e.target.value }))}
                    />
                    <Button size="sm" variant="outline" onClick={() => saveRule.mutate({ id: r.id, points: Number(editingPoints[r.id] ?? r.points) })}>
                      Save points
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => saveRule.mutate({ id: r.id, points: r.points, active: !r.active })}>
                      {r.active ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="events">
          {eventsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : (
            <div className="space-y-2">
              {events?.data.map((e) => (
                <Card key={e.uuid} className="gap-2 py-3">
                  <CardContent className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{e.helper_name}</span>
                        <Badge variant="outline">{e.event_type}</Badge>
                        <span className={`font-mono font-bold ${e.points >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {e.points >= 0 ? '+' : ''}{e.points}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{e.note} · {formatDateTime(e.created_at)}</div>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{e.helper_uuid.slice(0, 8)}…</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ManualAdjustDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [helperUuid, setHelperUuid] = useState('')
  const [points, setPoints] = useState('')
  const [note, setNote] = useState('')

  const adjust = useMutation({
    mutationFn: () => api.post(`/admin/trust-score/helpers/${helperUuid}/adjust`, { points: Number(points), note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trust-events'] })
      setOpen(false)
      toast.success('Manual adjustment recorded (audited)')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Gauge /> Manual adjustment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual trust score adjustment</DialogTitle>
          <DialogDescription>
            Admin-only, always audited. Employers can never reach this action.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Helper UUID</Label>
            <Input value={helperUuid} onChange={(e) => setHelperUuid(e.target.value)} placeholder="Paste helper UUID" />
          </div>
          <div className="space-y-1.5">
            <Label>Points (positive or negative, excluding 0)</Label>
            <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason (required — recorded in the audit trail)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={adjust.isPending || !helperUuid || !points || Number(points) === 0 || note.length < 10} onClick={() => adjust.mutate()}>
            Apply adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
