import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldAlert, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

interface Dispute {
  uuid: string
  reason: string
  explanation: string
  status: string
  disputable_type: string
  resolution_decision: string | null
  resolution_reason: string | null
  created_at: string
  resolved_at: string | null
}

export function DisputesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['disputes'],
    queryFn: () => api.get<{ data: Dispute[] }>('/disputes'),
  })

  if (isLoading) return <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>

  const disputes = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Disputes &amp; appeals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fair process for everyone — dispute anything you believe is incorrect, with evidence.
          </p>
        </div>
        <NewDisputeDialog />
      </div>

      {disputes.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No pending disputes" description="If something on your record looks wrong, you can open a dispute here." />
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <Card key={d.uuid} className="gap-3 py-5">
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">{d.disputable_type.replace(/_/g, ' ')}</Badge>
                      <Badge variant={d.status === 'resolved' ? 'success' : d.status === 'rejected' ? 'destructive' : 'warning'}>
                        {d.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="mt-1.5 font-medium">{d.reason}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{d.explanation}</p>
                    <div className="mt-1 text-xs text-muted-foreground">Submitted {formatDateTime(d.created_at)}</div>
                    {d.resolution_decision && (
                      <div className="mt-3 rounded-md border-l-2 border-primary/40 bg-muted/40 p-3 text-sm">
                        <span className="font-medium">Resolution: </span>
                        {d.resolution_decision}
                      </div>
                    )}
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

function NewDisputeDialog() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('review')
  const [uuid, setUuid] = useState('')
  const [reason, setReason] = useState('')
  const [explanation, setExplanation] = useState('')

  const submit = useMutation({
    mutationFn: () => api.post('/disputes', { disputable_type: type, disputable_uuid: uuid, reason, explanation }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] })
      setOpen(false)
      toast.success('Dispute submitted. Our team will review it.')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not submit dispute'),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> New dispute</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a dispute</DialogTitle>
          <DialogDescription>
            Dispute a review, report, trust score event or verification result. If upheld, any incorrect score impact is reversed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>What are you disputing?</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="review">A review</SelectItem>
                <SelectItem value="report">A report</SelectItem>
                <SelectItem value="trust_score_event">A trust score event</SelectItem>
                <SelectItem value="identity_verification">A verification result</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Item UUID (shown in the item details)</Label>
            <Input value={uuid} onChange={(e) => setUuid(e.target.value)} placeholder="Paste the UUID of the item" />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Short reason, e.g. Incorrect details" />
          </div>
          <div className="space-y-1.5">
            <Label>Explanation</Label>
            <Textarea rows={4} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Explain what is incorrect and why…" />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={submit.isPending || !uuid || reason.length < 3 || explanation.length < 20} onClick={() => submit.mutate()}>
            Submit dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
