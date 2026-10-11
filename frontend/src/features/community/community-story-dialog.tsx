import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const initialForm = {
  content_type: 'experience', title: '', description: '', category: 'other', subject_name: '',
  location: '', incident_date: '', source_url: '', submitter_name: '', submitter_email: '', submitter_phone: '', website: '',
}

export function CommunityStoryDialog({ trigger }: { trigger: ReactNode }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const submit = useMutation({
    mutationFn: () => api.post('/community-experiences', form),
    onSuccess: () => {
      setForm(initialForm)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ['community-experiences'] })
      toast.success('Submitted privately for review')
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not submit your experience'),
  })
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const onSubmit = (event: FormEvent) => { event.preventDefault(); submit.mutate() }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Share your experience</DialogTitle><DialogDescription>Tell us what happened in your own words. Your contact details stay private, and nothing is published until a moderator reviews it. Community stories do not affect trust scores.</DialogDescription></DialogHeader>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Submission type</Label><Select value={form.content_type} onValueChange={(v) => update('content_type', v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="experience">Written experience</SelectItem><SelectItem value="video">Sourced video</SelectItem></SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Category</Label><Select value={form.category} onValueChange={(v) => update('category', v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="other">Positive experience or other</SelectItem>{['theft','fraud','misconduct','abuse','property_damage','job_abandonment'].map((v) => <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Title</Label><Input required minLength={8} maxLength={160} value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="A short, factual summary" /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>What happened?</Label><Textarea required minLength={30} maxLength={5000} rows={5} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe what you personally experienced, including dates and context. Avoid private addresses or ID numbers." /></div>
        <div className="space-y-1.5"><Label>Helper’s name (optional)</Label><Input maxLength={120} value={form.subject_name} onChange={(e) => update('subject_name', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Location (optional)</Label><Input maxLength={160} value={form.location} onChange={(e) => update('location', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Experience date (optional)</Label><Input type="date" max={new Date().toISOString().slice(0, 10)} value={form.incident_date} onChange={(e) => update('incident_date', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Public source link {form.content_type === 'video' && '(required)'}</Label><Input type="url" required={form.content_type === 'video'} maxLength={500} value={form.source_url} onChange={(e) => update('source_url', e.target.value)} placeholder="https://www.instagram.com/reel/..." /></div>
        <div className="space-y-1.5"><Label>Your name</Label><Input required maxLength={120} value={form.submitter_name} onChange={(e) => update('submitter_name', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Your email</Label><Input required type="email" maxLength={190} value={form.submitter_email} onChange={(e) => update('submitter_email', e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Your phone (optional)</Label><Input maxLength={40} value={form.submitter_phone} onChange={(e) => update('submitter_phone', e.target.value)} /></div>
        <input tabIndex={-1} autoComplete="off" className="hidden" value={form.website} onChange={(e) => update('website', e.target.value)} aria-hidden="true" />
        <div className="sm:col-span-2"><Button type="submit" className="w-full sm:w-auto" disabled={submit.isPending}>{submit.isPending ? 'Submitting…' : 'Submit for review'}</Button><p className="mt-2 text-xs text-muted-foreground">You confirm this account is honest to the best of your knowledge.</p></div>
      </form>
    </DialogContent>
  </Dialog>
}
