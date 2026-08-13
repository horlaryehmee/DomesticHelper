import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  MapPin, Briefcase, Clock, Heart, MessageSquare, BadgeCheck, ShieldCheck,
  CalendarDays, FileCheck2, Info, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { TrustScoreRing, trustLabel, type TrustCategory } from '@/components/ui/trust-score'
import { VerificationBadge, type VerificationBadgeKey } from '@/components/ui/verification-badges'
import { RatingStars } from '@/components/ui/rating'
import { PageLoader } from '@/components/ui/spinner'
import { ErrorState, EmptyState } from '@/components/ui/states'
import { api, ApiError } from '@/lib/api'
import { formatDate, formatSalary, yearsLabel } from '@/lib/format'
import type { EmploymentHistoryEntry, HelperSummary, ReviewSummary } from '@/lib/types'
import { useAuth } from '@/lib/auth'

export function HelperProfilePage() {
  const { uuid } = useParams<{ uuid: string }>()
  const { user } = useAuth()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['helper', uuid],
    queryFn: () =>
      api.get<{ data: HelperSummary; reviews: ReviewSummary[]; employment_history: EmploymentHistoryEntry[] }>(`/helpers/${uuid}`),
  })

  const saveMutation = useMutation({
    mutationFn: () => api.post(`/employers/saved-helpers/${uuid}`),
    onSuccess: () => toast.success('Helper saved to your list'),
    onError: () => toast.error('Could not save helper'),
  })

  const messageMutation = useMutation({
    mutationFn: async () => {
      if (!uuid) return
      const res = await api.post<{ data: { uuid: string } }>(`/conversations/with/${uuid}`)
      return res.data.uuid
    },
    onSuccess: (convUuid) => {
      if (convUuid) window.location.href = `/${user?.user_type}/messages?conversation=${convUuid}`
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not start conversation'),
  })

  if (isLoading) return <PageLoader label="Loading profile…" />
  if (isError || !data) return <ErrorState retry={() => refetch()} />

  const helper = data.data
  const score = helper.trust_score
  const category: TrustCategory = score.category

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Header card */}
          <Card className="gap-5">
            <div className="flex flex-col gap-6 px-6 py-2 sm:flex-row sm:items-start">
              <Avatar className="size-28 rounded-2xl">
                <AvatarImage src={helper.photo_url ?? undefined} alt={helper.name} className="object-cover" />
                <AvatarFallback name={helper.name} className="rounded-2xl text-3xl" />
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{helper.name}</h1>
                  {helper.verification_status === 'verified' && (
                    <Badge variant="success"><BadgeCheck className="size-3.5" /> Verified</Badge>
                  )}
                  {helper.verification_status === 'under_review' && <Badge variant="warning">Under Review</Badge>}
                  {helper.verification_status === 'flagged' && <Badge variant="warning">Flagged Concern</Badge>}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="size-4" /> {[helper.city, helper.state].filter(Boolean).join(', ')}</span>
                  <span className="flex items-center gap-1"><Briefcase className="size-4" /> {yearsLabel(helper.years_experience)} experience</span>
                  <span className="flex items-center gap-1"><Clock className="size-4" /> {helper.availability?.replace(/_/g, ' ')}</span>
                </div>
                {helper.bio && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{helper.bio}</p>}

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(helper.verification_badges as VerificationBadgeKey[]).map((b) => (
                    <VerificationBadge key={b} badge={b} />
                  ))}
                  {helper.verification_badges.length === 0 && (
                    <span className="text-sm text-muted-foreground">No verifications completed yet.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t px-6 pt-4">
              {user?.user_type === 'employer' && (
                <>
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    <Heart /> Save
                  </Button>
                  <Button variant="outline" onClick={() => messageMutation.mutate()} disabled={messageMutation.isPending}>
                    <MessageSquare /> Message
                  </Button>
                  <Button asChild variant="secondary">
                    <Link to={`/employer/verification-reports?helper=${helper.uuid}`}>
                      <FileCheck2 /> Request Verification Report
                    </Link>
                  </Button>
                </>
              )}
              {!user && (
                <Button asChild variant="secondary">
                  <Link to="/register"><ShieldCheck /> Join to contact this helper</Link>
                </Button>
              )}
              {user?.user_type === 'helper' && (
                <span className="text-sm text-muted-foreground">This is how your profile appears to employers.</span>
              )}
            </div>
          </Card>

          {/* Skills */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-lg">Skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {helper.skills.map((s) => (
                <Badge key={s.id} variant="secondary" className="px-3 py-1 text-sm">{s.name}</Badge>
              ))}
              <Badge variant="outline" className="px-3 py-1 text-sm">Salary: {formatSalary(helper.expected_salary_min, helper.expected_salary_max)}</Badge>
              <Badge variant="outline" className="px-3 py-1 text-sm capitalize">Employment type: {helper.employment_type?.replace(/_/g, ' ')}</Badge>
            </CardContent>
          </Card>

          {/* Employment history */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="size-5 text-primary" /> Verified employment history
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.employment_history.length === 0 ? (
                <EmptyState title="No verified employment history available" description="This helper has no verified past employment on the platform yet." />
              ) : (
                <div className="space-y-4">
                  {data.employment_history.map((e) => (
                    <div key={e.uuid} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4">
                      <div>
                        <div className="font-medium">{e.job_role}</div>
                        <div className="mt-0.5 text-sm text-muted-foreground">
                          {formatDate(e.start_date)} – {formatDate(e.end_date)}
                          {e.location && ` · ${e.location}`}
                        </div>
                      </div>
                      <Badge variant="success"><BadgeCheck className="size-3" /> Verified</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card className="gap-4">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">Verified reviews</CardTitle>
              {helper.average_rating > 0 && <RatingStars rating={helper.average_rating} showValue />}
            </CardHeader>
            <CardContent>
              {data.reviews.length === 0 ? (
                <EmptyState title="No reviews yet" description="Reviews appear here only from verified employment relationships." />
              ) : (
                <div className="space-y-4">
                  {data.reviews.map((r) => (
                    <div key={r.uuid} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Star className="size-4 fill-warning text-warning" />
                          <span className="font-medium">{r.rating}.0</span>
                          <span className="text-sm text-muted-foreground">· {r.work_type ?? r.job_role}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.employer_name} · {formatDate(r.created_at)}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed">{r.feedback}</p>
                      {r.duration_worked && <div className="mt-1 text-xs text-muted-foreground">Duration: {r.duration_worked}</div>}
                      {r.responses?.map((resp, i) => (
                        <div key={i} className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                          <span className="font-medium">{resp.author_name}: </span>
                          {resp.content}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card className="items-center gap-4 py-8 text-center">
            <TrustScoreRing score={score.score} category={category} size={150} stroke={11} />
            <div>
              <div className="font-semibold">{score.category === 'new' ? 'Building Trust' : trustLabel(category)}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {score.category === 'new' ? 'No verified events yet — score builds as verified employment and reviews accumulate.' : `Based on ${helper.verified_jobs_count} verified job${helper.verified_jobs_count === 1 ? '' : 's'} and ${helper.reviews_count} moderated review${helper.reviews_count === 1 ? '' : 's'}.`}
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Info className="size-3.5" /> How is this score calculated?</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>How trust scores work</DialogTitle>
                  <DialogDescription className="text-left">
                    Every helper starts at a neutral 50. The score moves only on verified events, and every change is audited and reversible.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                  {[
                    ['Verified job completion', '+20'],
                    ['Positive moderated review (4–5 stars)', '+10'],
                    ['Long-term employment (12+ months)', '+10'],
                    ['Additional verified employment', '+5'],
                    ['Identity verified (NIN + photo)', '+5'],
                    ['Verified complaint', '−15'],
                    ['Verified job abandonment', '−20'],
                  ].map(([label, pts]) => (
                    <div key={label} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span>{label}</span>
                      <span className={`font-mono font-bold ${pts.startsWith('+') ? 'text-success' : 'text-destructive'}`}>{pts}</span>
                    </div>
                  ))}
                  <p className="pt-2 text-xs text-muted-foreground">
                    Complaints never affect a score until our admin team verifies them. Helpers can dispute any event; upheld disputes restore the score.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </Card>

          <Card className="gap-4">
            <CardHeader><CardTitle className="text-base">At a glance</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{[helper.city, helper.state].filter(Boolean).join(', ')}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Experience</span><span className="font-medium">{yearsLabel(helper.years_experience)}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Availability</span><span className="font-medium capitalize">{helper.availability?.replace(/_/g, ' ')}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Salary</span><span className="font-medium">{formatSalary(helper.expected_salary_min, helper.expected_salary_max)}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Average rating</span><RatingStars rating={helper.average_rating} size="size-3.5" showValue /></div>
            </CardContent>
          </Card>

          <Card className="gap-3 border-success/30 bg-success/5">
            <CardContent className="flex gap-3 pt-6 text-sm">
              <ShieldCheck className="size-5 shrink-0 text-success" />
              <p className="text-muted-foreground">
                Only verified, approved information appears on this profile. NIN, private addresses and phone numbers are never shown publicly.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
