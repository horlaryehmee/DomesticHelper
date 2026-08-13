import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { MapPin, Building2, Clock, Home, CalendarDays, Briefcase } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PageLoader } from '@/components/ui/spinner'
import { ErrorState } from '@/components/ui/states'
import { api, ApiError } from '@/lib/api'
import { formatDate, formatSalary } from '@/lib/format'
import type { JobSummary } from '@/lib/types'
import { useAuth } from '@/lib/auth'

export function JobDetailPage() {
  const { uuid } = useParams<{ uuid: string }>()
  const { user } = useAuth()
  const [coverNote, setCoverNote] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['job', uuid],
    queryFn: () => api.get<{ data: JobSummary }>(`/jobs/${uuid}`),
  })

  const applyMutation = useMutation({
    mutationFn: () => api.post(`/jobs/${uuid}/apply`, { cover_note: coverNote || null }),
    onSuccess: () => toast.success('Application submitted!'),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not apply'),
  })

  if (isLoading) return <PageLoader />
  if (isError || !data) return <ErrorState retry={() => refetch()} />

  const job = data.data
  const isEmployer = user?.user_type === 'employer'
  const applied = job.my_application && !['withdrawn'].includes(job.my_application)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="size-4" /> {[job.city, job.state].filter(Boolean).join(', ')}</span>
            <span className="flex items-center gap-1"><Building2 className="size-4" /> {job.employer?.name}</span>
            <span className="flex items-center gap-1"><CalendarDays className="size-4" /> Starts {job.start_date ? formatDate(job.start_date) : 'negotiable'}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{formatSalary(job.salary_min, job.salary_max)}</div>
          <div className="text-xs capitalize text-muted-foreground">{job.salary_type} salary</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Badge variant="secondary"><Briefcase className="size-3" /> {job.work_type}</Badge>
        <Badge variant="secondary" className="capitalize">{job.employment_type.replace(/_/g, ' ')}</Badge>
        <Badge variant={job.accommodation_available ? 'success' : 'secondary'}>
          <Home className="size-3" /> {job.accommodation_available ? 'Accommodation available' : 'No accommodation'}
        </Badge>
        {job.working_hours && <Badge variant="outline"><Clock className="size-3" /> {job.working_hours}</Badge>}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Job description</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{job.description}</p>
              {job.responsibilities && (
                <>
                  <h3 className="mt-6 font-semibold">Responsibilities</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{job.responsibilities}</p>
                </>
              )}
              {job.requirements && (
                <>
                  <h3 className="mt-6 font-semibold">Requirements</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{job.requirements}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="gap-4">
            <CardContent className="space-y-4 pt-6">
              {user?.user_type === 'helper' && (
                applied ? (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                    You have applied for this job. Status: <strong>{job.my_application}</strong>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label>Cover note (optional)</Label>
                      <Textarea rows={4} value={coverNote} onChange={(e) => setCoverNote(e.target.value)} placeholder="Introduce yourself and your experience…" />
                    </div>
                    <Button className="w-full" onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
                      Apply for this job
                    </Button>
                  </>
                )
              )}
              {!user && (
                <Button asChild className="w-full">
                  <Link to="/login">Log in to apply</Link>
                </Button>
              )}
              {isEmployer && <p className="text-center text-sm text-muted-foreground">Employers cannot apply to jobs.</p>}
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader><CardTitle className="text-base">About the employer</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="font-medium">{job.employer?.name}</span></div>
              <div className="capitalize text-muted-foreground">{job.employer?.profile_type === 'agency' ? 'Agency' : 'Individual household'}</div>
              {job.employer?.state && <div className="text-muted-foreground">Based in {job.employer.state}</div>}
              <Separator />
              <p className="text-xs text-muted-foreground">Employer identity is verified through phone OTP before jobs can be posted.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
