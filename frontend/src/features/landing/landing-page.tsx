import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, Search, UserCheck, Handshake, FileCheck2, Scale, Star, BadgeCheck,
  Phone, Fingerprint, Briefcase, ChevronRight, Quote, Sparkles, AlertTriangle, Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { TrustScoreRing } from '@/components/ui/trust-score'
import { HelperCard } from '@/components/shared/helper-card'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import type { HelperSummary, PaginationMeta } from '@/lib/types'
import { useAuth } from '@/lib/auth'

const faqs = [
  { q: 'How do trust scores work?', a: 'Every helper starts at a neutral score of 50. Points are added only for verified events — confirmed employment, positive moderated reviews, long-term roles — and subtracted only when our admin team verifies a serious complaint. No single employer can change a helper\u2019s score.' },
  { q: 'How is a helper\u2019s identity verified?', a: 'We verify phone and email with OTPs, and offer NIN and photo verification which our verification officers review. NIN data is encrypted and never displayed publicly — only a verification badge is shown.' },
  { q: 'Who can leave a review?', a: 'Only employers who have a confirmed employment record with the helper on the platform. Every review is moderated before it appears publicly, and helpers can reply, report, or dispute reviews.' },
  { q: 'What happens when a report is submitted?', a: 'The helper is notified immediately and given the right to respond. Our team reviews the evidence. Until a complaint is verified, it stays private and never affects the helper\u2019s public trust score.' },
  { q: 'What can helpers dispute?', a: 'Helpers can dispute reviews, reports, trust score events and verification results. If a dispute is upheld, any score impact is reversed — false accusations are corrected.' },
  { q: 'Is my personal information safe?', a: 'NIN, exact addresses, private phone numbers, evidence files and internal notes are never shown publicly. Evidence is stored on a private, access-controlled file system.' },
]

const verificationSteps = [
  { icon: Phone, title: 'Phone & Email', text: 'OTP-verified contact details confirm the helper is reachable.' },
  { icon: Fingerprint, title: 'NIN Check', text: 'National ID validated and stored encrypted — never displayed.' },
  { icon: UserCheck, title: 'Photo Verification', text: 'A verification officer confirms the photo matches the identity.' },
  { icon: Briefcase, title: 'Employment Check', text: 'Previous employers confirm roles, dates and performance.' },
]

export function LandingPage() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['landing-helpers'],
    queryFn: () => api.get<{ data: HelperSummary[]; meta: PaginationMeta }>('/helpers', { per_page: 3, sort: 'trust_score' }),
  })

  const heroCta = user ? (user.user_type === 'employer' ? '/search' : '/jobs') : '/register'

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="pointer-events-none absolute -top-32 right-0 size-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <Badge variant="secondary" className="mb-5 gap-1.5 px-3 py-1">
              <ShieldCheck className="size-3.5 text-primary" /> Nigeria&apos;s domestic staff trust network
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Find Domestic Helpers <span className="text-primary">You Can Trust</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Discover verified domestic staff, check employment history, review trust scores, and hire with greater confidence.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/search">
                  <Search /> Find a Helper
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to={heroCta}>
                  Create Your Profile <ChevronRight />
                </Link>
              </Button>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                ['30+', 'Verified helpers'],
                ['100%', 'Moderated reviews'],
                ['0–100', 'Transparent trust score'],
              ].map(([value, label]) => (
                <div key={label} className="border-l-2 border-primary/30 pl-3">
                  <div className="text-xl font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <Card className="mx-auto max-w-md gap-5 p-6 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <ShieldCheck className="size-7 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">A verified helper profile</div>
                  <div className="text-sm text-muted-foreground">Lekki, Lagos · Nanny</div>
                </div>
                <div className="ml-auto">
                  <TrustScoreRing score={85} category="high" size={72} stroke={6} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Identity Verified', 'Phone Verified', 'Employment Verified', 'Reference Checked'].map((b) => (
                  <Badge key={b} variant="success" className="font-normal">
                    <BadgeCheck className="size-3" /> {b}
                  </Badge>
                ))}
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
                <div className="flex items-center gap-2 font-medium"><Star className="size-4 fill-warning text-warning" /> 4.8 average from 3 verified employers</div>
                <div className="text-muted-foreground">6 years experience · Verified employment history · Reference checked</div>
              </div>
              <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success-foreground">
                <Lock className="mr-1.5 inline size-4" /> NIN &amp; address never shown publicly. Only verified information appears on profiles.
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary">How it works</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Hire with confidence in four steps</h2>
          <p className="mt-3 text-muted-foreground">A clear process that protects both families and honest workers.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Search, step: '01', title: 'Search & filter', text: 'Find helpers by skill, location, experience, salary and trust score.' },
            { icon: FileCheck2, step: '02', title: 'Verify & check', text: 'Review verified badges, employment history and moderated reviews.' },
            { icon: Handshake, step: '03', title: 'Interview & hire', text: 'Request an interview, then confirm the hire to create an employment record.' },
            { icon: Star, step: '04', title: 'Track & review', text: 'Track the employment, confirm its end, and leave a moderated review.' },
          ].map((s) => (
            <Card key={s.step} className="gap-4 py-6">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10">
                    <s.icon className="size-5 text-primary" />
                  </span>
                  <span className="text-3xl font-bold text-muted">{s.step}</span>
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ============ WHY VERIFICATION MATTERS ============ */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge variant="secondary">Why verification matters</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Trust, verified — not assumed</h2>
            <p className="mt-3 text-muted-foreground">
              Hiring someone to work in your home is one of the most personal decisions a family makes. We make sure
              the people you welcome in have a documented, verifiable history — and that good workers can prove it.
            </p>
            <ul className="mt-6 space-y-4">
              {[
                'Every public badge reflects a verification that actually happened',
                'Employment history is confirmed by the previous employer',
                'Reviews come only from real, recorded employment relationships',
                'Accusations stay private until verified — protecting helpers from false claims',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {verificationSteps.map((s) => (
              <Card key={s.title} className="gap-3 py-5">
                <CardContent className="flex flex-col gap-2">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <s.icon className="size-5 text-primary" />
                  </span>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURED HELPERS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="secondary">Search verified helpers</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Meet verified helpers</h2>
            <p className="mt-3 text-muted-foreground">A sample of top-trusted profiles on the network right now.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/search">View all helpers <ChevronRight /></Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-6">
          {isLoading
            ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-full" />)
            : data?.data.map((helper) => <HelperCard key={helper.uuid} helper={helper} />)}
        </div>
      </section>

      {/* ============ TRUST SCORE ============ */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="flex justify-center">
            <div className="rounded-2xl border bg-card p-8 shadow-sm">
              <TrustScoreRing score={85} category="high" size={200} stroke={14} />
              <div className="mt-4 text-center">
                <div className="font-semibold text-success">High Trust</div>
                <div className="text-sm text-muted-foreground">80–100</div>
              </div>
            </div>
          </div>
          <div>
            <Badge variant="secondary">Trust score explained</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">One transparent number</h2>
            <p className="mt-3 text-muted-foreground">
              Every helper starts at 50. The score moves only on verified events — audited, reversible, and never
              driven by a single opinion.
            </p>
            <div className="mt-8 space-y-4">
              {[
                ['Verified job completion', '+20', 'text-success'],
                ['Positive moderated review', '+10', 'text-success'],
                ['Long-term employment (12+ months)', '+10', 'text-success'],
                ['Additional verified employment', '+5', 'text-success'],
                ['Verified complaint', '−15', 'text-destructive'],
                ['Verified job abandonment', '−20', 'text-destructive'],
              ].map(([label, pts, color]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                  <span className="text-sm">{label}</span>
                  <span className={`font-mono text-sm font-bold ${color}`}>{pts}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              We use neutral language — scores below 50 show as &ldquo;Needs Review&rdquo;, never labels like &ldquo;bad&rdquo; or &ldquo;blacklisted&rdquo;.
            </p>
          </div>
        </div>
      </section>

      {/* ============ FOR EMPLOYERS / HELPERS ============ */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <Card className="gap-5 py-8">
          <CardContent className="flex flex-col items-start gap-4">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <UserCheck className="size-6 text-primary" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight">For employers</h2>
            <p className="text-muted-foreground">
              Whether you&apos;re a household or an agency — search verified staff, request verification reports,
              run interviews, and record every hire so the next family can benefit too.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Verified badges &amp; trust scores on every profile</li>
              <li>• Paid verification reports for serious shortlists</li>
              <li>• Moderated reviews from real past employers</li>
              <li>• Report &amp; dispute system with fair process</li>
            </ul>
            <Button asChild className="mt-2">
              <Link to="/register">Register as an employer <ChevronRight /></Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="gap-5 py-8">
          <CardContent className="flex flex-col items-start gap-4">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="size-6 text-primary" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight">For domestic helpers</h2>
            <p className="text-muted-foreground">
              Build a verified reputation that travels with you. Every good job becomes proof, every review becomes
              trust — and you can dispute anything unfair.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Your verified employment history, in one place</li>
              <li>• Reviews you can reply to and disputes you can win</li>
              <li>• Private by design — your NIN is never shown</li>
              <li>• Jobs from verified employers</li>
            </ul>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/register">Create your profile <ChevronRight /></Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* ============ SAFETY ============ */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary">Safety &amp; dispute protection</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Fair process for both sides</h2>
            <p className="mt-3 text-muted-foreground">
              Reports never damage a reputation automatically. Every claim goes through review, and helpers always
              get the right to respond and appeal.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: FileCheck2, title: 'Submit with evidence', text: 'Employers report issues with employment context and supporting documents.' },
              { icon: Scale, title: 'Right of reply', text: 'The helper is notified and can respond before any decision is made.' },
              { icon: ShieldCheck, title: 'Admin review', text: 'Only verified outcomes affect trust scores — and every decision is audited.' },
            ].map((s) => (
              <Card key={s.title} className="gap-4 py-6">
                <CardContent className="flex flex-col items-center gap-3 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <s.icon className="size-6 text-primary" />
                  </span>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary">Testimonials</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Families and workers trust us</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { quote: 'We hired a nanny with a verified 3-year history and real references. The difference in peace of mind is enormous.', name: 'Mrs. Adeyemi', role: 'Employer, Ikeja' },
            { quote: 'My previous employers verified my record and now families contact me directly. My good work finally speaks for itself.', name: 'Esther C.', role: 'Verified Nanny, Lagos' },
            { quote: 'The report system protected us when an engagement went wrong — and the process was fair to the worker too.', name: 'Mr. Okafor', role: 'Employer, Lekki' },
          ].map((t) => (
            <Card key={t.name} className="gap-4 py-6">
              <CardContent className="flex flex-col gap-3">
                <Quote className="size-6 text-primary/40" />
                <p className="text-sm leading-relaxed">“{t.quote}”</p>
                <div className="mt-auto">
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <Badge variant="secondary">FAQ</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="mt-10">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="overflow-hidden rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight">Ready to hire — or be hired — with confidence?</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">
            Join the trust network for domestic staff in Nigeria. Verified profiles, fair reviews and real protection for everyone.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/register">Create Your Profile</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
              <Link to="/search">Find a Helper</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
