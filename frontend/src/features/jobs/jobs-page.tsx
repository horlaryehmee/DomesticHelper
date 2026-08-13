import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Briefcase, MapPin, Search, Building2, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { formatDate, formatSalary } from '@/lib/format'
import type { JobSummary, PaginationMeta } from '@/lib/types'

export function JobsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const state = params.get('state') ?? ''
  const page = Number(params.get('page') ?? 1)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['jobs', q, state, page],
    queryFn: () => api.get<{ data: JobSummary[]; meta: PaginationMeta }>('/jobs', { q: q || undefined, state: state || undefined, page }),
  })

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setParams(next)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
        <p className="mt-1 text-muted-foreground">Opportunities posted by verified employers.</p>
      </div>

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          setParam('q', (new FormData(e.currentTarget).get('q') as string) || null)
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Job title or keyword…" className="h-11 pl-9" />
        </div>
        <div className="w-full sm:w-56">
          <Select value={state || 'all'} onValueChange={(v) => setParam('state', v === 'all' ? null : v)}>
            <SelectTrigger className="h-11 w-full"><SelectValue placeholder="All states" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {['Lagos', 'FCT Abuja', 'Rivers', 'Oyo', 'Ogun', 'Kano', 'Edo', 'Kaduna'].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="h-11">Search</Button>
      </form>

      <div className="mt-8 grid gap-5">
        {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
        {isError && <ErrorState retry={() => refetch()} />}
        {data && data.data.length === 0 && (
          <EmptyState icon={Briefcase} title="No jobs match your search" description="Try different keywords or a wider location." />
        )}
        {data?.data.map((job) => (
          <Card key={job.uuid} className="gap-3 py-5 transition-shadow hover:shadow-md">
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link to={`/jobs/${job.uuid}`} className="text-lg font-semibold hover:text-primary hover:underline">
                    {job.title}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {[job.city, job.state].filter(Boolean).join(', ')}</span>
                    <span className="flex items-center gap-1"><Building2 className="size-3.5" /> {job.employer?.name}</span>
                    <span className="flex items-center gap-1"><Clock className="size-3.5" /> Starts {job.start_date ? formatDate(job.start_date) : 'negotiable'}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-muted-foreground">{job.description}</p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <div className="font-semibold">{formatSalary(job.salary_min, job.salary_max)}</div>
                  <Badge variant={job.accommodation_available ? 'success' : 'secondary'}>
                    {job.accommodation_available ? 'Accommodation available' : job.employment_type.replace(/_/g, ' ')}
                  </Badge>
                  <Button asChild size="sm">
                    <Link to={`/jobs/${job.uuid}`}>View & apply</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data && data.meta.last_page > 1 && (
        <Pagination className="mt-8" meta={data.meta} onChange={(p) => setParam('page', p === 1 ? null : String(p))} />
      )}
    </div>
  )
}
