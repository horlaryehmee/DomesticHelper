import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ExternalLink, Images } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

interface Item { uuid:string; content_type:string; title:string; description:string; category:string; subject_name:string|null; source_url:string|null; status:string; verification_level:string; submitter_name:string; submitter_email:string; submitter_phone:string|null; moderation_note:string|null; created_at:string; slides:{id:number;url:string}[] }

export function AdminCommunityExperiencesPage() {
  const [status, setStatus] = useState('all')
  const { data, isLoading } = useQuery({ queryKey:['admin-community-experiences', status], queryFn:()=>api.get<{data:Item[]}>('/admin/community-experiences',{status:status==='all'?undefined:status}) })
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold tracking-tight">Community experiences</h1><p className="mt-1 text-sm text-muted-foreground">Review off-platform accounts and sourced videos before they appear publicly.</p></div>
    <div className="flex gap-2 overflow-x-auto">{['all','pending','published','rejected','removed'].map((s)=><Button key={s} size="sm" variant={status===s?'default':'outline'} onClick={()=>setStatus(s)}>{s}</Button>)}</div>
    {isLoading ? [1,2].map((i)=><Skeleton key={i} className="h-44" />) : <div className="space-y-4">{(data?.data??[]).map((item)=><ModerationCard key={item.uuid} item={item}/>) }{!data?.data.length&&<p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">No submissions in this state.</p>}</div>}
  </div>
}

function ModerationCard({item}:{item:Item}) {
  const client=useQueryClient(); const [decision,setDecision]=useState(item.status==='pending'?'published':item.status); const [level,setLevel]=useState(item.verification_level); const [note,setNote]=useState(item.moderation_note??''); const [slides,setSlides]=useState<FileList|null>(null)
  const moderate=useMutation({mutationFn:()=>api.post(`/admin/community-experiences/${item.uuid}/moderate`,{status:decision,verification_level:level,moderation_note:note}),onSuccess:()=>{client.invalidateQueries({queryKey:['admin-community-experiences']});toast.success('Moderation decision saved')},onError:(e)=>toast.error(e instanceof ApiError?e.message:'Could not save')})
  const upload=useMutation({mutationFn:()=>{const form=new FormData();Array.from(slides??[]).forEach((file)=>form.append('slides[]',file));return api.upload(`/admin/community-experiences/${item.uuid}/media`,form)},onSuccess:()=>{setSlides(null);client.invalidateQueries({queryKey:['admin-community-experiences']});toast.success('Slides uploaded')},onError:(e)=>toast.error(e instanceof ApiError?e.message:'Could not upload slides')})
  return <Card><CardContent><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{item.content_type}</Badge><Badge variant="warning">{item.category.replace(/_/g,' ')}</Badge><span className="text-xs text-muted-foreground">Submitted by {item.submitter_name} · {item.submitter_email}{item.submitter_phone?` · ${item.submitter_phone}`:''}</span></div><h2 className="mt-3 font-semibold">{item.title}</h2><p className="mt-2 whitespace-pre-line text-sm">{item.description}</p>{item.subject_name&&<p className="mt-2 text-sm"><strong>Named subject:</strong> {item.subject_name}</p>}{item.source_url&&<a className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline" href={item.source_url} target="_blank" rel="noreferrer">Open source <ExternalLink className="size-3"/></a>}
    <div className="mt-4 rounded-lg border border-dashed p-3"><Label className="flex items-center gap-2"><Images className="size-4"/>Instagram slides {item.slides?.length ? `(${item.slides.length} uploaded)` : ''}</Label><div className="mt-2 flex flex-wrap items-center gap-2"><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e)=>setSlides(e.target.files)} className="min-w-0 flex-1 text-sm"/><Button size="sm" variant="outline" disabled={!slides?.length||upload.isPending} onClick={()=>upload.mutate()}>{upload.isPending?'Uploading…':'Upload slides'}</Button></div></div>
    <div className="mt-5 grid gap-3 md:grid-cols-[180px_200px_1fr_auto]"><div><Label>Decision</Label><Select value={decision} onValueChange={setDecision}><SelectTrigger className="mt-1 w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="published">Publish</SelectItem><SelectItem value="rejected">Reject</SelectItem><SelectItem value="removed">Remove</SelectItem></SelectContent></Select></div><div><Label>Review level</Label><Select value={level} onValueChange={setLevel}><SelectTrigger className="mt-1 w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="submitted">Submitted account</SelectItem><SelectItem value="source_linked">Source linked</SelectItem><SelectItem value="evidence_reviewed">Evidence reviewed</SelectItem></SelectContent></Select></div><div><Label>Internal moderation note</Label><Textarea className="mt-1" rows={2} value={note} onChange={(e)=>setNote(e.target.value)}/></div><Button className="self-end" disabled={moderate.isPending||note.length<10} onClick={()=>moderate.mutate()}>Save</Button></div>
  </CardContent></Card>
}
