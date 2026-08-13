import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserCheck, Check, X, PhoneCall } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

interface IdentityVerification {
  uuid: string
  type: string
  status: string
  user: { uuid: string; name: string }
  private_notes: string | null
  created_at: string
}

interface ReferenceCheck {
  uuid: string
  referee_name: string
  referee_phone: string | null
  referee_email: string | null
  relationship: string | null
  employment_period: string | null
  status: string
  helper: { uuid: string; name: string }
  created_at: string
}

export function AdminVerificationsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('identity')
  const [statusFilter, setStatusFilter] = useState('pending')

  const { data: identity, isLoading: identityLoading } = useQuery({
    queryKey: ['admin-verifications', statusFilter],
    queryFn: () => api.get<{ data: IdentityVerification[] }>('/admin/verifications', { status: statusFilter || undefined }),
  })

  const { data: references, isLoading: refsLoading } = useQuery({
    queryKey: ['admin-references'],
    queryFn: () => api.get<{ data: ReferenceCheck[] }>('/admin/reference-checks'),
    enabled: tab === 'references',
  })

  const decide = useMutation({
    mutationFn: ({ uuid, status }: { uuid: string; status: string }) => api.post(`/admin/verifications/${uuid}/decide`, { status, notes: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-verifications'] })
      toast.success('Decision recorded')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  const completeRef = useMutation({
    mutationFn: ({ uuid, worked }: { uuid: string; worked: boolean }) =>
      api.post(`/admin/reference-checks/${uuid}/complete`, { worked_there: worked, would_rehire: worked, performance_notes: 'Contacted and verified.' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-references'] })
      toast.success('Reference check completed')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Identity verification requests and reference checks.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="references">Reference checks</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'identity' ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected'].map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)}>
                {s}
              </Button>
            ))}
          </div>
          {identityLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : (identity?.data.length ?? 0) === 0 ? (
            <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">No {statusFilter} verifications.</p>
          ) : (
            identity?.data.map((v) => (
              <Card key={v.uuid} className="gap-3 py-5">
                <CardContent>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="size-4 text-primary" />
                        <span className="font-medium">{v.user.name}</span>
                        <Badge variant="outline" className="uppercase">{v.type}</Badge>
                        <Badge variant={v.status === 'approved' ? 'success' : v.status === 'rejected' ? 'destructive' : 'warning'}>{v.status}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">Requested {formatDateTime(v.created_at)}</div>
                    </div>
                    {v.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => decide.mutate({ uuid: v.uuid, status: 'approved' })}><Check /> Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => decide.mutate({ uuid: v.uuid, status: 'rejected' })}><X /> Reject</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {refsLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : (references?.data.length ?? 0) === 0 ? (
            <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">No reference check requests.</p>
          ) : (
            references?.data.map((r) => (
              <Card key={r.uuid} className="gap-3 py-5">
                <CardContent>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <PhoneCall className="size-4 text-primary" />
                        <span className="font-medium">{r.referee_name}</span>
                        <span className="text-sm text-muted-foreground">for {r.helper.name}</span>
                        <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{r.status}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {[r.relationship, r.employment_period].filter(Boolean).join(' · ')}
                        {r.referee_phone && ` · ${r.referee_phone}`}
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => completeRef.mutate({ uuid: r.uuid, worked: true })}>Mark verified</Button>
                        <Button size="sm" variant="outline" onClick={() => completeRef.mutate({ uuid: r.uuid, worked: false })}>Unable to verify</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
