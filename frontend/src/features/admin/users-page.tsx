import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, ShieldOff, ShieldCheck, FileCheck2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api, ApiError, getToken } from '@/lib/api'
import { formatDate } from '@/lib/format'

interface UserRow {
  uuid: string
  name: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  user_type: string
  status: string
  helper_profile: { verification_status: string | null; city: string | null } | null
  employer_profile: { profile_type: string | null } | null
  created_at: string
}

interface RegistrationDetails {
  nin_last4: string
  guarantor_name: string
  guarantor_phone: string
  guarantor_relationship: string
  address_line: string | null
  has_address_proof: boolean
}

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', type, status, q, page],
    queryFn: () => api.get<{ data: UserRow[]; meta: { current_page: number; last_page: number; total: number } }>('/admin/users', { type: type || undefined, status: status || undefined, q: q || undefined, page }),
  })
  const { data: registration, isLoading: detailsLoading, isError: detailsError } = useQuery({
    queryKey: ['admin-registration-details', selectedUser?.uuid],
    queryFn: () => api.get<{ data: RegistrationDetails }>(`/admin/users/${selectedUser!.uuid}/registration-details`),
    enabled: !!selectedUser,
    retry: false,
  })

  const downloadProof = async () => {
    if (!selectedUser) return
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.uuid}/address-proof`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!response.ok) throw new Error('Could not download address proof')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      const mime = response.headers.get('content-type') ?? ''
      const extension = mime.includes('pdf') ? 'pdf' : mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
      link.download = `address-proof-${selectedUser.uuid}.${extension}`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      toast.error('Could not download address proof')
    }
  }

  const suspend = useMutation({
    mutationFn: ({ uuid, newStatus }: { uuid: string; newStatus: string }) => api.patch(`/admin/users/${uuid}/status`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Account status updated')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage employers, helpers and staff accounts.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, email, phone…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className="w-64 pl-9" />
        </div>
        <Select value={type || 'all'} onValueChange={(v) => { setType(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger size="sm" className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="employer">Employers</SelectItem>
            <SelectItem value="helper">Helpers</SelectItem>
            <SelectItem value="admin">Staff</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger size="sm" className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="gap-0">
        {isLoading ? (
          <div className="space-y-2 p-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((u) => (
                <TableRow key={u.uuid}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8"><AvatarFallback name={u.name}>{u.name.charAt(0)}</AvatarFallback></Avatar>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.uuid.slice(0, 8)}…</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.user_type === 'helper' ? 'secondary' : u.user_type === 'employer' ? 'outline' : 'default'}>{u.user_type}</Badge>
                    {u.employer_profile?.profile_type === 'agency' && <div className="mt-1 text-xs text-muted-foreground">Agency</div>}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{u.email ?? 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{u.phone ?? ''}</div>
                  </TableCell>
                  <TableCell>
                    {u.user_type === 'helper' ? (
                      <Badge variant={u.helper_profile?.verification_status === 'verified' ? 'success' : u.helper_profile?.verification_status === 'flagged' ? 'destructive' : 'warning'}>
                        {u.helper_profile?.verification_status ?? 'unverified'}
                      </Badge>
                    ) : (
                      <Badge variant={u.status === 'active' ? 'success' : 'outline'}>{u.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {u.user_type !== 'admin' && <Button size="sm" variant="ghost" onClick={() => setSelectedUser(u)}><FileCheck2 /> Documents</Button>}
                    {u.status === 'active' ? (
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => suspend.mutate({ uuid: u.uuid, newStatus: 'suspended' })}>
                        <ShieldOff /> Suspend
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => suspend.mutate({ uuid: u.uuid, newStatus: 'active' })}>
                        <ShieldCheck /> Reactivate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {data && data.meta.last_page > 1 && <Pagination meta={data.meta as never} onChange={setPage} />}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registration documents</DialogTitle><DialogDescription>{selectedUser?.name} · Sensitive details are for staff review only.</DialogDescription></DialogHeader>
          {detailsLoading ? <Skeleton className="h-32" /> : detailsError ? <p className="text-sm text-muted-foreground">No registration documents are available for this account.</p> : registration && <div className="space-y-3 text-sm">
            <p><strong>NIN:</strong> ending in {registration.data.nin_last4}</p>
            <p><strong>Address:</strong> {registration.data.address_line ?? 'Not provided'}</p>
            <p><strong>Guarantor:</strong> {registration.data.guarantor_name}</p>
            <p><strong>Relationship:</strong> {registration.data.guarantor_relationship}</p>
            <p><strong>Guarantor phone:</strong> {registration.data.guarantor_phone}</p>
            {registration.data.has_address_proof && <Button variant="outline" onClick={downloadProof}>Download proof of address</Button>}
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
