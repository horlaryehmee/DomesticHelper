import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

interface AuditLog {
  id: number
  action: string
  entity_type: string | null
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user: { name: string; uuid: string } | null
  created_at: string
}

export function AdminAuditLogsPage() {
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', action, page],
    queryFn: () => api.get<{ data: AuditLog[]; meta: { current_page: number; last_page: number; total: number } }>('/admin/audit-logs', { action: action || undefined, page }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every sensitive action — decisions, score changes, payments, suspensions.</p>
      </div>

      <Input placeholder="Filter by action, e.g. report.decided" value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }} className="max-w-sm" />

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (data?.data.length ?? 0) === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">No log entries match.</p>
      ) : (
        <div className="space-y-2">
          {data?.data.map((l) => (
            <Card key={l.id} className="gap-2 py-3">
              <CardContent className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <ScrollText className="size-4 text-primary" />
                    <Badge variant="outline">{l.action}</Badge>
                    {l.entity_type && <span className="text-xs text-muted-foreground">{l.entity_type}#{l.entity_id}</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {l.user?.name ?? 'system'} · {formatDateTime(l.created_at)} · {l.ip_address ?? 'no ip'}
                  </div>
                </div>
                {(l.old_values || l.new_values) && (
                  <div className="max-w-sm truncate font-mono text-xs text-muted-foreground">
                    {JSON.stringify(l.new_values ?? l.old_values)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.meta.last_page > 1 && <Pagination meta={data.meta as never} onChange={setPage} />}
    </div>
  )
}
