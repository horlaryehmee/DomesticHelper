import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { HelperCard } from '@/components/shared/helper-card'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { HelperSummary, PaginationMeta } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'

interface Meta {
  skills: { id: number; name: string }[]
  states: string[]
  availability: { value: string; label: string }[]
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const q = params.get('q') ?? ''
  const page = Number(params.get('page') ?? 1)
  const sort = params.get('sort') ?? 'relevance'

  const filters = {
    q,
    page,
    sort,
    state: params.get('state') ?? undefined,
    gender: params.get('gender') ?? undefined,
    availability: params.get('availability') ?? undefined,
    verification: params.get('verification') ?? undefined,
    skills: params.getAll('skill').map(Number),
    min_experience: params.get('min_experience') ?? undefined,
    trust_min: params.get('trust_min') ?? undefined,
    salary_min: params.get('salary_min') ?? undefined,
    salary_max: params.get('salary_max') ?? undefined,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['helpers', filters],
    queryFn: () => api.get<{ data: HelperSummary[]; meta: PaginationMeta }>('/helpers', { ...filters, per_page: 12 }),
  })

  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api.get<Meta>('/meta') })

  const saveMutation = useMutation({
    mutationFn: (uuid: string) => api.post(`/employers/saved-helpers/${uuid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-helpers'] })
      toast.success('Helper saved')
    },
    onError: () => toast.error('Could not save helper'),
  })

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page') // filter changes reset to page 1
    setParams(next)
  }

  const setPage = (p: number) => {
    const next = new URLSearchParams(params)
    if (p <= 1) next.delete('page')
    else next.set('page', String(p))
    setParams(next)
  }

  const setSkill = (id: number, checked: boolean) => {
    const next = new URLSearchParams(params)
    next.delete('skill')
    const skills = filters.skills.filter((s) => s !== id)
    if (checked) skills.push(id)
    skills.forEach((s) => next.append('skill', String(s)))
    next.delete('page')
    setParams(next)
  }

  const clearAll = () => setParams(new URLSearchParams())

  const hasActiveFilters = filters.state || filters.gender || filters.availability || filters.verification || filters.skills.length > 0 || filters.min_experience || filters.trust_min || filters.salary_min || filters.salary_max

  const filtersPanel = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Filters</h2>
        {hasActiveFilters && (
          <button onClick={clearAll} className="cursor-pointer text-xs font-medium text-primary hover:underline">
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>State</Label>
        <Select value={filters.state ?? 'all'} onValueChange={(v) => setParam('state', v === 'all' ? null : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Any state" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any state</SelectItem>
            {meta?.states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Gender</Label>
        <Select value={filters.gender ?? 'all'} onValueChange={(v) => setParam('gender', v === 'all' ? null : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="male">Male</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Availability</Label>
        <Select value={filters.availability ?? 'all'} onValueChange={(v) => setParam('availability', v === 'all' ? null : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            {meta?.availability.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Verification</Label>
        <Select value={filters.verification ?? 'all'} onValueChange={(v) => setParam('verification', v === 'all' ? null : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            <SelectItem value="verified">Verified only</SelectItem>
            <SelectItem value="under_review">Under review</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Minimum experience</Label>
        <Select value={filters.min_experience ?? 'all'} onValueChange={(v) => setParam('min_experience', v === 'all' ? null : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            <SelectItem value="1">1+ years</SelectItem>
            <SelectItem value="2">2+ years</SelectItem>
            <SelectItem value="5">5+ years</SelectItem>
            <SelectItem value="10">10+ years</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Minimum trust score</Label>
          <span className="text-xs font-medium text-primary">{filters.trust_min ?? 0}</span>
        </div>
        <Slider
          min={0}
          max={100}
          step={5}
          value={[Number(filters.trust_min ?? 0)]}
          onValueChange={([v]) => setParam('trust_min', v === 0 ? null : String(v))}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Maximum monthly salary</Label>
        <Select value={filters.salary_max ?? 'all'} onValueChange={(v) => setParam('salary_max', v === 'all' ? null : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            <SelectItem value="50000">₦50k</SelectItem>
            <SelectItem value="75000">₦75k</SelectItem>
            <SelectItem value="100000">₦100k</SelectItem>
            <SelectItem value="150000">₦150k</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Skills</Label>
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {meta?.skills.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
              <Checkbox checked={filters.skills.includes(s.id)} onCheckedChange={(c) => setSkill(s.id, c === true)} />
              {s.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Find a helper</h1>
        <p className="mt-1 text-muted-foreground">Search verified domestic staff by skill, location, experience and trust.</p>
      </div>

      {/* Search bar */}
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          setParam('q', (form.get('q') as string) || null)
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder='Try "nanny in Lekki" or "driver with 5 years experience"' className="h-11 pl-9" />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="h-11">Search</Button>
          <Button type="button" variant="outline" className="h-11 lg:hidden" onClick={() => setDrawerOpen(true)}>
            <SlidersHorizontal /> Filters
          </Button>
        </div>
      </form>

      {/* Sort row */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.meta.total} helper${data.meta.total === 1 ? '' : 's'} found` : 'Searching…'}
        </p>
        <Select value={sort} onValueChange={(v) => setParam('sort', v)}>
          <SelectTrigger size="sm" className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="trust_score">Trust score</SelectItem>
            <SelectItem value="experience">Experience</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="recently_active">Recently active</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-lg border bg-card p-5">{filtersPanel}</div>
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
            <div className="absolute inset-y-0 right-0 w-80 max-w-[85vw] overflow-y-auto bg-background p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Filters</h2>
                <button className="cursor-pointer rounded-md p-1.5 hover:bg-accent" onClick={() => setDrawerOpen(false)} aria-label="Close filters">
                  <X className="size-5" />
                </button>
              </div>
              {filtersPanel}
              <Button className="mt-6 w-full" onClick={() => setDrawerOpen(false)}>Show results</Button>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="space-y-5">
          {isLoading && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 w-full" />)}
          {isError && <ErrorState retry={() => refetch()} />}
          {data && data.data.length === 0 && (
            <EmptyState
              icon={Search}
              title="No helpers match your search"
              description="Try different keywords, a wider location, or clear some filters."
              action={<Button variant="outline" onClick={clearAll}>Clear all filters</Button>}
            />
          )}
          {data?.data.map((helper) => (
            <HelperCard
              key={helper.uuid}
              helper={helper}
              onSave={user?.user_type === 'employer' ? () => saveMutation.mutate(helper.uuid) : undefined}
            />
          ))}
          {data && data.meta.last_page > 1 && (
            <Pagination meta={data.meta} onChange={setPage} />
          )}
        </div>
      </div>
    </div>
  )
}
