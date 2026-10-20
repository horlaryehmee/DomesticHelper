import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  const [view, setView] = useState<'grid' | 'list'>('grid')
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
  const activeFilterCount = [filters.state, filters.gender, filters.availability, filters.verification, filters.min_experience, filters.trust_min, filters.salary_min, filters.salary_max].filter(Boolean).length + filters.skills.length
  const activeChips = Array.from(params.entries()).filter(([key]) => !['page', 'sort'].includes(key)).map(([key, value]) => ({
    key, value,
    label: key === 'skill' ? meta?.skills.find((skill) => skill.id === Number(value))?.name ?? 'Skill' : `${({ q: 'Search', state: 'Location', gender: 'Gender', availability: 'Availability', verification: 'Verification', min_experience: 'Experience ≥', trust_min: 'Trust ≥', salary_min: 'Salary ≥', salary_max: 'Salary ≤' } as Record<string, string>)[key] ?? key}: ${value.replace(/_/g, ' ')}`,
  }))

  const filtersPanel = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold">Refine search</h2>
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
    <div className="helper-directory min-h-screen bg-slate-50 pb-12">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-7">
        <div className="relative border-b border-slate-200 pb-6">
          <div className="relative flex items-start justify-between gap-6">
            <div><h1 className="text-3xl font-bold tracking-tight">Find a helper</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">Browse profiles and compare skills, experience, and verification.</p></div>

          </div>

      {/* Search bar */}
      <form
        className="relative mt-6 flex max-w-3xl gap-2 rounded-lg border border-slate-200 bg-white p-1.5 text-foreground shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-primary/20"
        onSubmit={(e) => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          setParam('q', (form.get('q') as string) || null)
        }}
      >
        <div className="relative flex-1">
          <Input key={q} name="q" defaultValue={q} aria-label="Search helpers" placeholder="Search by role, skill, or location" className="h-11 border-0 bg-transparent pl-3 shadow-none focus-visible:ring-0" />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="h-10 rounded-lg px-5 font-semibold sm:px-7">Search</Button>
        </div>
      </form>
      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Explore</span>
        {meta?.skills.slice(0, 6).map((skill) => <button key={skill.id} onClick={() => setSkill(skill.id, !filters.skills.includes(skill.id))} aria-pressed={filters.skills.includes(skill.id)} className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary', filters.skills.includes(skill.id) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-muted-foreground hover:border-primary/40 hover:text-primary')}>{skill.name}</button>)}
      </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">

      {/* Sort row */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div><h2 className="text-sm font-semibold">
          {data ? `${data.meta.total} helper${data.meta.total === 1 ? '' : 's'} found` : 'Searching…'}
        </h2></div>
        <div className="flex items-center gap-2">
        <div className="hidden items-center rounded-sm border bg-white p-1 sm:flex" aria-label="Result layout">
          <button type="button" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')} className={cn('rounded-sm px-3 py-1.5 text-xs font-medium transition-colors', view === 'grid' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent')}>Grid</button>
          <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')} className={cn('rounded-sm px-3 py-1.5 text-xs font-medium transition-colors', view === 'list' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent')}>List</button>
        </div>
        <Button type="button" variant="outline" className="h-10 rounded-xl bg-white lg:hidden" onClick={() => setDrawerOpen(true)}>Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}</Button>
        <span className="hidden text-sm text-muted-foreground sm:inline">Sort by</span>
        <Select value={sort} onValueChange={(v) => setParam('sort', v)}>
          <SelectTrigger size="sm" aria-label="Sort helpers" className="h-10 w-40 rounded-xl bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem>
            <SelectItem value="trust_score">Trust score</SelectItem>
            <SelectItem value="experience">Experience</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="recently_active">Recently active</SelectItem>
          </SelectContent>
        </Select>
        </div>
      </div>

      {activeChips.length > 0 && <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Active filters">{activeChips.map((chip) => <button key={`${chip.key}-${chip.value}`} onClick={() => chip.key === 'skill' ? setSkill(Number(chip.value), false) : setParam(chip.key, null)} className="inline-flex items-center gap-2 rounded-lg border border-primary/15 bg-white px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent" aria-label={`Remove ${chip.label}`}>{chip.label}<X className="size-3" /></button>)}<button onClick={clearAll} className="px-2 text-xs font-semibold text-muted-foreground hover:text-primary">Reset all</button></div>}
      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-4">{filtersPanel}</div>
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
        <div className="min-w-0">
          <div className={cn('helper-results grid items-stretch gap-3', view === 'grid' && 'sm:grid-cols-2 xl:grid-cols-3')}>
          {isLoading && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
          {isError && <div className="col-span-full"><ErrorState retry={() => refetch()} /></div>}
          {data && data.data.length === 0 && (
            <div className="col-span-full"><EmptyState
              icon={Search}
              title="No helpers match your search"
              description="Try different keywords, a wider location, or clear some filters."
              action={<Button variant="outline" onClick={clearAll}>Clear all filters</Button>}
            /></div>
          )}
          {data?.data.map((helper, index) => (
            <div key={helper.uuid} className="helper-result" style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}>
            <HelperCard
              helper={helper}
              variant={view}
              onSave={user?.user_type === 'employer' ? () => saveMutation.mutate(helper.uuid) : undefined}
            />
            </div>
          ))}
          </div>
          {data && data.meta.last_page > 1 && (
            <div className="mt-8"><Pagination meta={data.meta} onChange={setPage} /></div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
