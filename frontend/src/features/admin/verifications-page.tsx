import { useFeatures } from '@/lib/features'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserCheck, Check, X, PhoneCall } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError, getToken } from '@/lib/api'
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
  const { enabled } = useFeatures()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('accounts')
  const [statusFilter, setStatusFilter] = useState('pending')

  const { data: identity, isLoading: identityLoading } = useQuery({
    queryKey: ['admin-verifications', statusFilter],
    queryFn: () => api.get<{ data: IdentityVerification[] }>('/admin/verifications', { status: statusFilter || undefined }),
  })

  const { data: references, isLoading: refsLoading } = useQuery({
    queryKey: ['admin-references'],
    queryFn: () => api.get<{ data: ReferenceCheck[] }>('/admin/reference-checks'),
    enabled: enabled.reference_checks && tab === 'references',
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
          <TabsTrigger value="accounts">Account approvals</TabsTrigger>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          {enabled.reference_checks && <TabsTrigger value="references">Reference checks</TabsTrigger>}
        </TabsList>
      </Tabs>

      {tab === 'accounts' ? <AccountApprovals /> : tab === 'identity' || !enabled.reference_checks ? (
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

interface ApprovalAccount { uuid: string; name: string; email: string; user_type: string; approval_status: string }
function AccountApprovals() {
 const client=useQueryClient()
 const [status,setStatus]=useState('pending')
 const [page,setPage]=useState(1)
 const [selected,setSelected]=useState<string|null>(null)
 const [notes,setNotes]=useState('')
 const {data,isLoading,error}=useQuery({queryKey:['account-approvals',status,page],queryFn:()=>api.get<{data:ApprovalAccount[];meta:{last_page:number}}>('/admin/account-verifications',{status,page})})
 const {data:details,isLoading:detailsLoading,error:detailsError}=useQuery({queryKey:['registration-review',selected],queryFn:()=>api.get<{data:{nin_last4:string;guarantor_name:string;guarantor_phone:string;guarantor_relationship:string;guarantor_2_name:string|null;guarantor_2_phone:string|null;guarantor_2_relationship:string|null;address_line:string}}>(`/admin/users/${selected}/registration-details`),enabled:!!selected})
 const decision=useMutation({mutationFn:({uuid,status}:{uuid:string;status:string})=>api.post(`/admin/account-verifications/${uuid}/decide`,{status,notes}),onSuccess:()=>{client.invalidateQueries({queryKey:['account-approvals']});setSelected(null);setNotes('');toast.success('Account decision recorded')},onError:(e)=>toast.error(e instanceof ApiError?e.message:'Could not record decision')})
 const download=async(uuid:string)=>{try { const response=await fetch(`/api/admin/users/${uuid}/address-proof`,{headers:{Authorization:`Bearer ${getToken()}`}});if(!response.ok)throw new Error();const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='address-proof';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000) }catch {toast.error('Could not download address proof')} }
 return <div className="space-y-4"><p className="text-sm text-muted-foreground">Review onboarding and private verification details before granting dashboard access.</p><div className="flex gap-2">{['pending','approved','rejected'].map(value=><Button key={value} variant={status===value?'default':'outline'} onClick={()=>{setStatus(value);setPage(1);setSelected(null)}}>{value}</Button>)}</div>
 {error && <p role="alert">Could not load account submissions.</p>}{isLoading ? <Skeleton className="h-24"/> : data?.data.length===0 ? <p className="rounded-lg border p-8 text-center">No {status} accounts.</p> : data?.data.map(account=><Card key={account.uuid}><CardContent className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{account.name}</p><p className="text-sm text-muted-foreground">{account.email} ? {account.user_type}</p></div><Button variant="outline" onClick={()=>{setSelected(selected===account.uuid?null:account.uuid);setNotes('')}}>Review verification details</Button></div>
 {selected===account.uuid && <div className="space-y-4 border-t pt-4">{detailsLoading ? <p>Loading private details?</p> : detailsError ? <p role="alert">Could not load verification details.</p> : details && <><dl className="grid gap-2 text-sm"><dt>NIN (last four digits)</dt><dd>{details.data.nin_last4}</dd><dt>Residential address</dt><dd>{details.data.address_line}</dd><dt>Guarantor 1</dt><dd>{details.data.guarantor_name} / {details.data.guarantor_phone} / {details.data.guarantor_relationship}</dd><dt>Guarantor 2</dt><dd>{details.data.guarantor_2_name ? `${details.data.guarantor_2_name} / ${details.data.guarantor_2_phone} / ${details.data.guarantor_2_relationship}` : 'Not provided. Request an updated onboarding submission.'}</dd></dl><Button variant="outline" onClick={()=>download(account.uuid)}>Download proof of address</Button>{account.approval_status==='pending' && <><label htmlFor="review-notes" className="block text-sm font-medium">Review notes / changes required</label><textarea id="review-notes" className="w-full rounded-md border p-3" value={notes} maxLength={2000} onChange={e=>setNotes(e.target.value)}/><div className="flex gap-3"><Button disabled={decision.isPending} onClick={()=>decision.mutate({uuid:account.uuid,status:'approved'})}>Approve account</Button><Button variant="outline" disabled={decision.isPending} onClick={()=>decision.mutate({uuid:account.uuid,status:'rejected'})}>Request changes</Button></div></>}</>}</div>}
 </CardContent></Card>)}<div className="flex items-center gap-3"><Button variant="outline" disabled={page===1} onClick={()=>setPage(page-1)}>Previous</Button><span>Page {page}</span><Button variant="outline" disabled={!data || page>=data.meta.last_page} onClick={()=>setPage(page+1)}>Next</Button></div></div>
}
