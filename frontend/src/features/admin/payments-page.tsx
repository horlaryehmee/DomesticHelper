import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CreditCard, Undo2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatDateTime, formatNaira } from '@/lib/format'

interface Payment {
  uuid: string
  provider: string
  amount: number
  currency: string
  status: string
  channel: string | null
  payable_type: string | null
  payer: { uuid: string; name: string } | null
  paid_at: string | null
  created_at: string
  meta?: { revenue?: number }
}

interface PageData {
  data: Payment[]
  meta: { revenue: number; current_page: number; last_page: number; total: number }
}

export function AdminPaymentsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: () => api.get<PageData>('/admin/payments'),
  })

  const refund = useMutation({
    mutationFn: (uuid: string) => api.post(`/admin/payments/${uuid}/refund`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
      toast.success('Refund issued')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Refund failed'),
  })

  if (isLoading) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>

  const payments = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Transactions, verification report purchases and refunds.</p>
        </div>
        <Card className="gap-1 py-3">
          <CardContent className="flex items-center gap-3">
            <CreditCard className="size-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Total revenue</div>
              <div className="text-xl font-bold">{formatNaira(data?.meta.revenue ?? 0)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {payments.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">No transactions yet.</p>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.uuid} className="gap-2 py-4">
              <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{formatNaira(p.amount)}</span>
                      <Badge variant={p.status === 'successful' ? 'success' : p.status === 'failed' ? 'destructive' : p.status === 'refunded' ? 'outline' : 'warning'}>
                        {p.status}
                      </Badge>
                      <Badge variant="secondary">{p.provider}</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {p.payer?.name} · {p.payable_type ?? 'payment'} · {formatDateTime(p.created_at)}
                    </div>
                  </div>
                  {p.status === 'successful' && (
                    <Button size="sm" variant="outline" onClick={() => refund.mutate(p.uuid)} disabled={refund.isPending}>
                      <Undo2 /> Refund
                    </Button>
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
