import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Inquiry { id: number; audience: string; topic: string; name: string; email: string; phone: string | null; subject: string; message: string; status: string; created_at: string }

export function AdminContactInquiriesPage() {
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useQuery({ queryKey: ['contact-inquiries', page], queryFn: () => api.get<{ data: { data: Inquiry[]; current_page: number; last_page: number } }>('/admin/contact-inquiries', { page }) })
  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/admin/contact-inquiries/${id}`, { status }),
    onSuccess: () => { client.invalidateQueries({ queryKey: ['contact-inquiries'] }); toast.success('Inquiry updated') },
    onError: error => toast.error(error instanceof ApiError ? error.message : 'Could not update inquiry'),
  })

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight">Contact inquiries</h1><p className="mt-1 text-sm text-muted-foreground">Messages sent through the public Contact page.</p></div>
    {isLoading && <p>Loading inquiries…</p>}
    {isError && <p className="text-destructive">Could not load inquiries.</p>}
    {data?.data.data.length === 0 && <p className="rounded-xl border bg-card p-6 text-muted-foreground">No inquiries yet.</p>}
    {data?.data.data.map(item => <Card key={item.id} className="gap-3">
      <CardHeader><CardTitle className="text-base">{item.subject}</CardTitle><p className="text-sm text-muted-foreground">HS-{item.id} · {item.name} · {item.email}{item.phone ? ` · ${item.phone}` : ''}</p><p className="text-xs capitalize text-muted-foreground">{item.audience} / {item.topic} · {new Date(item.created_at).toLocaleString()}</p></CardHeader>
      <CardContent className="space-y-4"><p className="whitespace-pre-wrap text-sm">{item.message}</p><div className="flex items-center gap-3"><label className="text-sm" htmlFor={`status-${item.id}`}>Status</label><select id={`status-${item.id}`} className="rounded-md border bg-background px-3 py-2 text-sm" value={item.status} disabled={update.isPending} onChange={event => update.mutate({ id: item.id, status: event.target.value })}><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select><a className="text-sm text-primary underline" href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: ${item.subject} (HS-${item.id})`)}`}>Reply by email</a></div></CardContent>
    </Card>)}
    {data && data.data.last_page > 1 && <div className="flex items-center justify-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm">Page {page} of {data.data.last_page}</span><Button variant="outline" disabled={page >= data.data.last_page} onClick={() => setPage(page + 1)}>Next</Button></div>}
  </div>
}
