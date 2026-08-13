import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Briefcase, Users } from 'lucide-react'
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
import { Pagination } from '@/components/ui/pagination'
import { api, ApiError } from '@/lib/api'
import { formatSalary } from '@/lib/format'
import type { JobSummary, PaginationMeta } from '@/lib/types'

interface Meta { states: string[]; job_categories: { id: number; name: string }[] }

export function EmployerJobsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['employer-jobs', page],
    queryFn: () => api.get<{ data: JobSummary[]; meta: PaginationMeta }>('/employers/jobs', { page }),
  })

  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api.get<Meta>('/meta') })

  const setStatus = useMutation({
    mutationFn: ({ uuid, status }: { uuid: string; status: string }) => api.patch(`/employers/jobs/${uuid}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] })
      toast.success('Job status updated')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Post and manage job listings.</p>
        </div>
        <JobFormDialog meta={meta} />
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (data?.data.length ?? 0) === 0 ? (
        <EmptyState icon={Briefcase} title="No jobs posted yet" description="Post your first job to start receiving applications from verified helpers." />
      ) : (
        <div className="space-y-4">
          {data?.data.map((job) => (
            <Card key={job.uuid} className="gap-3 py-5">
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/jobs/${job.uuid}`} className="font-semibold hover:text-primary hover:underline">{job.title}</Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant={job.status === 'active' ? 'success' : 'secondary'}>{job.status}</Badge>
                      <span>{[job.city, job.state].filter(Boolean).join(', ')}</span>
                      <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                      <span className="flex items-center gap-1"><Users className="size-3.5" /> {job.applications_count ?? 0} applicants</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/employer/applications`}>View applicants</Link>
                    </Button>
                    {job.status === 'active' ? (
                      <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ uuid: job.uuid, status: 'closed' })}>
                        Close
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setStatus.mutate({ uuid: job.uuid, status: 'active' })}>
                        Re-open
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.meta.last_page > 1 && <Pagination meta={data.meta as never} onChange={setPage} />}
    </div>
  )
}

function JobFormDialog({ meta }: { meta?: Meta }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: '', work_type: '', description: '', responsibilities: '', requirements: '',
    salary_min: '', salary_max: '', salary_type: 'monthly', location: '', state: '', city: '',
    working_hours: '', accommodation_available: false, employment_type: 'full_time', start_date: '',
  })

  const create = useMutation({
    mutationFn: () => api.post('/employers/jobs', { ...form, status: 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] })
      setOpen(false)
      toast.success('Job posted!')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not post job'),
  })

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> Post a job</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Post a new job</DialogTitle>
          <DialogDescription>Helpers will find this listing on the public job board.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Job title</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Live-in Nanny for Two Children" />
          </div>
          <div className="space-y-1.5">
            <Label>Work type</Label>
            <Select value={form.work_type} onValueChange={(v) => set('work_type', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {meta?.job_categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the role and your household…" />
          </div>
          <div className="space-y-1.5">
            <Label>Responsibilities</Label>
            <Textarea rows={2} value={form.responsibilities} onChange={(e) => set('responsibilities', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Requirements</Label>
            <Textarea rows={2} value={form.requirements} onChange={(e) => set('requirements', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Salary min (₦/month)</Label>
            <Input type="number" value={form.salary_min} onChange={(e) => set('salary_min', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Salary max (₦/month)</Label>
            <Input type="number" value={form.salary_max} onChange={(e) => set('salary_max', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Select value={form.state} onValueChange={(v) => set('state', v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {meta?.states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>City / Area</Label>
            <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Employment type</Label>
            <Select value={form.employment_type} onValueChange={(v) => set('employment_type', v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full time</SelectItem>
                <SelectItem value="part_time">Part time</SelectItem>
                <SelectItem value="live_in">Live-in</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Working hours</Label>
            <Input value={form.working_hours} onChange={(e) => set('working_hours', e.target.value)} placeholder="e.g. 8am – 5pm" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={form.accommodation_available} onChange={(e) => set('accommodation_available', e.target.checked)} className="size-4" />
            Accommodation available
          </label>
        </div>
        <DialogFooter>
          <Button disabled={create.isPending || !form.title || !form.work_type || form.description.length < 30} onClick={() => create.mutate()}>
            Post job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
