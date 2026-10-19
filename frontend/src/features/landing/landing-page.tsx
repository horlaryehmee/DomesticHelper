import { useLayoutEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, Search, UserCheck, Handshake, FileCheck2, Scale, Star, BadgeCheck,
  Fingerprint, Briefcase, ChevronRight, Quote, Sparkles,
  MapPin, ArrowLeft, ArrowRight, Clock3, ExternalLink, BookOpen, MessageCircleQuestion,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, DotsCard } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { TrustScoreRing, trustCategory, trustLabel } from '@/components/ui/trust-score'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { api } from '@/lib/api'
import { formatSalary, yearsLabel } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import type { HelperSummary, PaginationMeta } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { HeroAnimation } from './hero-animation'
import { HeroBackground } from '@/components/ui/hero-background'
import DataRain from '@/components/ui/data-rain'
import { CommunityStoryDialog } from '@/features/community/community-story-dialog'
import './landing-marquee.css'

const marqueeMessages = [
  'Verified identities',
  'Real employment history',
  'Fair, moderated reviews',
  'Trust you can check',
  'Safer hiring for everyone',
]

const exampleScoreEvents = [
  { id: 'job-completed', label: 'Verified job completion', points: 20 },
  { id: 'positive-review', label: 'Positive moderated review', points: 10 },
  { id: 'long-term-employment', label: 'Long-term employment', points: 10 },
  { id: 'additional-employment', label: 'Additional verified employment', points: 5 },
  { id: 'identity-verified', label: 'Identity verified', points: 5 },
  { id: 'verified-complaint', label: 'Verified complaint', points: -15 },
  { id: 'job-abandonment', label: 'Verified job abandonment', points: -20 },
]

const audienceContent = {
  employer: {
    icon: UserCheck,
    title: 'Hire with more confidence',
    description: 'Find the right person for your home or agency with a clearer view of their experience and verification history.',
    benefits: [
      'Compare skills, experience, and trust scores',
      'Review verified employment and moderated feedback',
      'Interview, hire, and keep a clear employment record',
      'Report concerns through a fair review process',
    ],
    action: 'Get started as an employer',
  },
  helper: {
    icon: Sparkles,
    title: 'Let your work speak for you',
    description: 'Build a profile that shows families what you do well, backed by verified jobs and reviews you can respond to.',
    benefits: [
      'Keep your work history together in one profile',
      'Build trust through verified jobs and reviews',
      'Find roles that fit your skills and availability',
      'Respond to feedback and dispute unfair claims',
    ],
    action: 'Create your helper profile',
  },
}

interface CommunityStoryPreview {
  uuid: string
  title: string
  description: string
  content_type: 'experience' | 'video'
  source_url: string | null
  media_url: string | null
  poster_url: string | null
  slides: { id: number; url: string; mime_type: string }[]
}

interface PublicHelperReview {
  uuid: string
  feedback: string
  employer_name: string
}

interface ExperienceQuote extends PublicHelperReview {
  helperId: string
  helperName: string
}

function hasOriginalStoryDescription(description: string) {
  return !/^(An Instagram (reel|post) shared as part of the community experience library|A community-sourced video shared to help)/i.test(description)
}

function TrustMarquee() {
  const messages = (hidden: boolean) => (
    <div className="trust-marquee-group" aria-hidden={hidden}>
      {Array.from({ length: 3 }, (_, repeat) => marqueeMessages.map((message) => (
        <span className="trust-marquee-item" key={`${repeat}-${message}`}>
          <span>{message}</span>
          <span className="trust-marquee-divider" aria-hidden="true" />
        </span>
      )))}
    </div>
  )

  return (
    <div className="trust-marquee" aria-label="Hire Safe: verified identities, real employment history, fair moderated reviews, trust you can check, and safer hiring for everyone">
      <div className="trust-marquee-track">
        {messages(false)}
        {messages(true)}
      </div>
    </div>
  )
}

const faqs = [
  { category: 'hiring', q: 'How do trust scores work?', a: 'Every helper starts at a neutral score of 50. Points are added only for verified events: confirmed employment, positive moderated reviews and long-term roles. They are subtracted only when our admin team verifies a serious complaint. No single employer can change a helper\u2019s score.' },
  { category: 'hiring', q: 'How is a helper\u2019s identity verified?', a: 'Helpers can request NIN and photo verification, which our verification officers review. NIN data is encrypted and never displayed publicly; only an approved verification badge is shown.' },
  { category: 'hiring', q: 'Who can leave a review?', a: 'Verified profile reviews require a confirmed employment record on Hire Safe. Anyone can also share a community story about a helper who is not on the platform. Stories are moderated before publication and do not change trust scores.' },
  { category: 'safety', q: 'What happens when a report is submitted?', a: 'The helper is notified immediately and given the right to respond. Our team reviews the evidence. Until a complaint is verified, it stays private and never affects the helper\u2019s public trust score.' },
  { category: 'safety', q: 'What can helpers dispute?', a: 'Helpers can dispute reviews, reports, trust score events and verification results. If a dispute is upheld, any score impact is reversed, and false accusations are corrected.' },
  { category: 'safety', q: 'Is my personal information safe?', a: 'NIN, exact addresses, private phone numbers, evidence files and internal notes are never shown publicly. Evidence is stored on a private, access-controlled file system.' },
]

const verificationSteps = [
  { icon: Fingerprint, title: 'NIN Check', text: 'National ID validated and stored encrypted, never displayed.' },
  { icon: UserCheck, title: 'Photo Verification', text: 'A verification officer confirms the photo matches the identity.' },
  { icon: Briefcase, title: 'Employment Check', text: 'Previous employers confirm roles, dates and performance.' },
]

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-semibold ${light ? 'text-white/85' : 'text-primary'}`}>
      <span className="h-0.5 w-5 rounded-full bg-coral" aria-hidden="true" />
      {children}
    </span>
  )
}

export function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const page = pageRef.current
    if (!page || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const targets = Array.from(page.querySelectorAll('section')).slice(1).flatMap((section) =>
      Array.from(section.children).filter((child): child is HTMLDivElement =>
        child instanceof HTMLDivElement && !child.classList.contains('absolute') && !child.classList.contains('dr-root'),
      ),
    )
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('home-scroll-reveal-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -35px 0px' })

    targets.forEach((target) => {
      target.classList.add('home-scroll-reveal')
      observer.observe(target)
    })

    return () => {
      observer.disconnect()
      targets.forEach((target) => target.classList.remove('home-scroll-reveal', 'home-scroll-reveal-visible'))
    }
  }, [])
  const { user } = useAuth()
  const [selectedHelperId, setSelectedHelperId] = useState<string | null>(null)
  const [selectedScoreEvents, setSelectedScoreEvents] = useState<string[]>(['job-completed', 'positive-review', 'identity-verified'])
  const [audience, setAudience] = useState<'employer' | 'helper'>('employer')
  const [faqCategory, setFaqCategory] = useState<'all' | 'hiring' | 'safety'>('all')
  const { data, isLoading } = useQuery({
    queryKey: ['landing-helpers'],
    queryFn: () => api.get<{ data: HelperSummary[]; meta: PaginationMeta }>('/helpers', { per_page: 3, sort: 'trust_score' }),
  })
  const { data: experienceQuotes = [], isLoading: experienceLoading } = useQuery({
    queryKey: ['landing-experiences', ...(data?.data.map((helper) => helper.uuid) ?? [])],
    enabled: Boolean(data?.data.length),
    queryFn: async (): Promise<ExperienceQuote[]> => {
      const helpers = data?.data ?? []
      const results = await Promise.allSettled(helpers.map((helper) =>
        api.get<{ data: PublicHelperReview[] }>(`/helpers/${helper.uuid}/reviews`),
      ))
      return results.flatMap((result, index) => result.status === 'fulfilled'
        ? result.value.data.slice(0, 2).filter((review) => review.feedback?.trim()).map((review) => ({ ...review, helperId: helpers[index].uuid, helperName: helpers[index].name }))
        : [])
    },
  })
  const { data: communityData, isLoading: communityLoading } = useQuery({
    queryKey: ['landing-community-stories'],
    queryFn: () => api.get<{ data: CommunityStoryPreview[] }>('/community-experiences'),
  })
  const communityStories = communityData?.data
    .filter((story) => story.content_type === 'experience' || story.media_url || story.slides?.length)
    .slice(0, 3) ?? []

  const heroCta = user ? (user.user_type === 'employer' ? '/search' : '/jobs') : '/register'
  const examplePoints = exampleScoreEvents.filter((event) => selectedScoreEvents.includes(event.id)).reduce((sum, event) => sum + event.points, 0)
  const exampleScore = Math.max(0, Math.min(100, 50 + examplePoints))
  const exampleCategory = trustCategory(exampleScore, selectedScoreEvents.length)
  const toggleScoreEvent = (id: string) => setSelectedScoreEvents((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const selectedAudience = audienceContent[audience]
  const AudienceIcon = selectedAudience.icon
  const featuredHelpers = data?.data ?? []
  const selectedHelper = featuredHelpers.find((helper) => helper.uuid === selectedHelperId) ?? featuredHelpers[0]
  const selectedIndex = featuredHelpers.findIndex((helper) => helper.uuid === selectedHelper?.uuid)
  const changeFeaturedHelper = (direction: number) => {
    if (!featuredHelpers.length) return
    const nextIndex = (selectedIndex + direction + featuredHelpers.length) % featuredHelpers.length
    setSelectedHelperId(featuredHelpers[nextIndex].uuid)
  }

  return (
    <div ref={pageRef}>
      {/* ============ HERO ============ */}
      <section className="relative isolate overflow-hidden border-b bg-[#140e1d] text-white">
        <HeroBackground />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <div className="mb-5">
              <SectionLabel light>Safer hiring starts here</SectionLabel>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Hire Domestic Staff <span className="text-coral">You Can Trust</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Hire Safe is a verified trust network: check employment history, review trust scores, and hire with confidence.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="bg-coral text-coral-foreground hover:bg-coral/90" asChild>
                <Link to="/search">
                  <Search /> Find a Helper
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild>
                <Link to={heroCta}>
                  Create Your Profile <ChevronRight />
                </Link>
              </Button>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                ['30+', 'Verified helpers'],
                ['100%', 'Moderated reviews'],
                ['0 to 100', 'Transparent trust score'],
              ].map(([value, label]) => (
                <div key={label} className="border-l-2 border-coral/70 pl-3">
                  <div className="text-xl font-bold">{value}</div>
                  <div className="text-xs text-white/65">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <HeroAnimation />
        </div>
      </section>

      <TrustMarquee />

      {/* ============ HOW IT WORKS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Getting started</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Hire with confidence in four steps</h2>
          <p className="mt-3 text-muted-foreground">A clear process that protects both families and honest workers.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 [&>*+*]:-mt-px sm:[&>*+*]:mt-0 sm:[&>*:nth-child(even)]:-ml-px sm:[&>*:nth-child(n+3)]:-mt-px lg:[&>*:nth-child(n+3)]:mt-0 lg:[&>*:nth-child(n+2)]:-ml-px">
          {[
            { icon: Search, step: '01', title: 'Search & filter', text: 'Find helpers by skill, location, experience, salary and trust score.' },
            { icon: FileCheck2, step: '02', title: 'Verify & check', text: 'Review verified badges, employment history and moderated reviews.' },
            { icon: Handshake, step: '03', title: 'Interview & hire', text: 'Request an interview, then confirm the hire to create an employment record.' },
            { icon: Star, step: '04', title: 'Track & review', text: 'Track the employment, confirm its end, and leave a moderated review.' },
          ].map((s) => (
            <DotsCard key={s.step}>
              <CardContent className="flex h-full flex-col gap-3 px-4 lg:px-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10">
                    <s.icon className="size-5 text-primary" />
                  </span>
                  <span className="text-3xl font-bold text-muted">{s.step}</span>
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </CardContent>
            </DotsCard>
          ))}
        </div>
      </section>

      {/* ============ WHY VERIFICATION MATTERS ============ */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel>Why we verify</SectionLabel>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Trust, verified. Not assumed</h2>
            <p className="mt-3 text-muted-foreground">
              Hiring someone to work in your home is one of the most personal decisions a family makes. We make sure
              the people you welcome in have a documented, verifiable history, and that good workers can prove it.
            </p>
            <ul className="mt-6 space-y-4">
              {[
                'Every public badge reflects a verification that actually happened',
                'Employment history is confirmed by the previous employer',
                'Reviews come only from real, recorded employment relationships',
                'Accusations stay private until verified, protecting helpers from false claims',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid sm:grid-cols-2 [&>*+*]:-mt-px sm:[&>*+*]:mt-0 sm:[&>*:nth-child(even)]:-ml-px sm:[&>*:nth-child(n+3)]:-mt-px">
            {verificationSteps.map((s) => (
              <DotsCard key={s.title}>
                <CardContent className="flex flex-col gap-2 px-5">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <s.icon className="size-5 text-primary" />
                  </span>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
              </DotsCard>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURED HELPERS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <SectionLabel>Find a helper</SectionLabel>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Find someone who fits your home</h2>
            <p className="mt-3 text-muted-foreground">Choose a profile to explore experience, verification, and trust at a glance.</p>
          </div>
          <Button variant="outline" className="w-full sm:w-auto" asChild><Link to="/search">Search all helpers <ChevronRight /></Link></Button>
        </div>
        <div className="mt-7 grid overflow-hidden rounded-2xl border bg-card shadow-sm sm:mt-10 lg:grid-cols-[minmax(270px,0.38fr)_minmax(0,0.62fr)]">
          {isLoading ? (
            <><Skeleton className="h-96 rounded-none" /><Skeleton className="h-96 rounded-none" /></>
          ) : selectedHelper ? (
            <>
              <div className="min-w-0 border-b bg-background/70 p-4 lg:border-b-0 lg:border-r lg:p-6">
                <div className="mb-4 flex items-center justify-between gap-3 lg:px-2">
                  <span className="text-sm font-semibold text-primary">Featured profiles</span>
                  <div className="flex items-center gap-2">
                    <span className="mr-1 text-xs text-muted-foreground">{String(selectedIndex + 1).padStart(2, '0')} / {String(featuredHelpers.length).padStart(2, '0')}</span>
                    {featuredHelpers.length > 1 && <>
                      <Button variant="outline" size="icon" className="size-8" onClick={() => changeFeaturedHelper(-1)} aria-label="Previous helper"><ArrowLeft className="size-4" /></Button>
                      <Button variant="outline" size="icon" className="size-8" onClick={() => changeFeaturedHelper(1)} aria-label="Next helper"><ArrowRight className="size-4" /></Button>
                    </>}
                  </div>
                </div>
                <div className="-mr-4 flex snap-x gap-2 overflow-x-auto pb-1 pr-4 sm:mr-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pr-0 lg:grid-cols-1">
                  {featuredHelpers.map((helper) => {
                    const active = helper.uuid === selectedHelper.uuid
                    return (
                      <button
                        type="button"
                        key={helper.uuid}
                        onClick={() => setSelectedHelperId(helper.uuid)}
                        aria-pressed={active}
                        className={`flex w-44 shrink-0 snap-start cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-full sm:gap-3 sm:p-3 ${active ? 'border-coral/60 bg-coral/10' : 'border-border/70 bg-card hover:border-primary/30'}`}
                      >
                        <Avatar className="size-10 rounded-xl sm:size-12">
                          <AvatarImage src={helper.photo_url ?? undefined} alt="" />
                          <AvatarFallback name={helper.name} className="rounded-xl" />
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{helper.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{helper.skills[0]?.name || 'Domestic helper'} · {helper.city || helper.state || 'Nigeria'}</span>
                        </span>
                        <span className="hidden text-sm font-bold text-primary sm:block">{helper.trust_score.score}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div key={selectedHelper.uuid} className="flex min-w-0 flex-col p-4 sm:p-8">
                <div className="flex items-start justify-between gap-3 sm:gap-5">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <Avatar className="size-14 rounded-xl border-2 border-background shadow-sm sm:size-24 sm:rounded-2xl">
                      <AvatarImage src={selectedHelper.photo_url ?? undefined} alt={selectedHelper.name} />
                      <AvatarFallback name={selectedHelper.name} className="rounded-2xl text-xl" />
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-lg font-bold sm:text-2xl">{selectedHelper.name}</h3>
                        {selectedHelper.verification_status === 'verified' && <BadgeCheck className="size-4 shrink-0 text-coral sm:size-5" aria-label="Verified profile" />}
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground sm:text-sm"><MapPin className="size-3.5 shrink-0 sm:size-4" /><span className="truncate">{[selectedHelper.city, selectedHelper.state].filter(Boolean).join(', ') || 'Nigeria'}</span></p>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-xl bg-primary px-2.5 py-2 text-center text-primary-foreground sm:px-4 sm:py-3">
                    <span className="block text-2xl font-bold leading-none sm:text-3xl">{selectedHelper.trust_score.score}</span>
                    <span className="mt-1 block text-[9px] font-semibold uppercase tracking-wide opacity-80 sm:text-[10px]">Trust</span>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 sm:mt-7">
                  {selectedHelper.skills.slice(0, 4).map((skill) => <span key={skill.id} className="rounded-full border px-3 py-1 text-xs font-medium">{skill.name}</span>)}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4 border-y py-5 text-sm sm:mt-7 sm:grid-cols-3">
                  <div><span className="block text-xs text-muted-foreground">Experience</span><strong className="mt-1 block">{yearsLabel(selectedHelper.years_experience)}</strong></div>
                  <div><span className="block text-xs text-muted-foreground">Availability</span><strong className="mt-1 block capitalize">{selectedHelper.availability?.replace(/_/g, ' ') || 'Ask for details'}</strong></div>
                  <div className="col-span-2 sm:col-span-1"><span className="block text-xs text-muted-foreground">Expected pay</span><strong className="mt-1 block">{formatSalary(selectedHelper.expected_salary_min, selectedHelper.expected_salary_max)}</strong></div>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-5 sm:pt-7">
                  <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><Clock3 className="size-4 text-coral" />Review the full profile before connecting</span>
                  <Button className="w-full sm:w-auto" asChild><Link to={`/helpers/${selectedHelper.uuid}`}>View full profile <ArrowRight /></Link></Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-10 text-center text-muted-foreground lg:col-span-2">No helper profiles are available right now.</div>
          )}
        </div>
      </section>

      {/* ============ TRUST SCORE ============ */}
      <section className="relative isolate overflow-hidden border-y border-white/10 bg-[#10091f]">
        <DataRain fullscreen={false} count={900} flowSpeed={0.65} obstacleRadius={70} palette={{ calm: '#b79cff', mid: '#8754d5', hot: '#f48046' }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#10091f]/55 via-[#10091f]/30 to-[#10091f]/80" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <SectionLabel light>Understanding trust scores</SectionLabel>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">See what moves a trust score</h2>
            <p className="mt-3 text-white/75">
              Every helper starts at 50. Select the verified events below to see how an example score changes.
            </p>
          </div>
          <div className="mt-10 grid overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-[minmax(270px,0.38fr)_minmax(0,0.62fr)]">
            <div className="flex flex-col items-center justify-center border-b bg-primary/5 p-8 text-center lg:border-b-0 lg:border-r lg:p-10">
              <span className="mb-6 text-xs font-bold uppercase tracking-widest text-primary">Example score</span>
              <TrustScoreRing score={exampleScore} category={exampleCategory} size={190} stroke={13} />
              <strong className="mt-5 text-xl">{trustLabel(exampleCategory)}</strong>
              <p className="mt-2 text-sm text-muted-foreground">50 starting points {examplePoints >= 0 ? '+' : '−'} {Math.abs(examplePoints)} from selected events</p>
              <button type="button" onClick={() => setSelectedScoreEvents([])} className="mt-6 cursor-pointer text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Reset example</button>
            </div>
            <div className="p-5 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">Choose verified events</h3>
                <span className="text-xs text-muted-foreground">Tap to add or remove</span>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {exampleScoreEvents.map((event) => {
                  const selected = selectedScoreEvents.includes(event.id)
                  return (
                    <button
                      key={event.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleScoreEvent(event.id)}
                      className={`flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-background hover:border-primary/30'}`}
                    >
                      <span className="flex items-center gap-3 text-sm font-medium"><span className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>{selected ? '✓' : ''}</span>{event.label}</span>
                      <strong className={`shrink-0 text-sm ${event.points < 0 ? 'text-destructive' : 'text-success-foreground'}`}>{event.points > 0 ? '+' : '−'}{Math.abs(event.points)}</strong>
                    </button>
                  )
                })}
              </div>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">This is an illustration using default point values. Only reviewed events affect a real score; rules may be updated by the platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOR EMPLOYERS / HELPERS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Made for both sides</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">A better way to work together</h2>
          <p className="mt-3 text-muted-foreground">Choose the path that fits you and see how Hire Safe helps.</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3" role="group" aria-label="Choose your role">
          {([
            { id: 'employer' as const, label: 'I’m hiring', sub: 'For households and agencies', icon: UserCheck },
            { id: 'helper' as const, label: 'I’m a helper', sub: 'For domestic staff', icon: Sparkles },
          ]).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setAudience(option.id)}
              aria-pressed={audience === option.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-4 ${audience === option.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/30'}`}
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg sm:size-12 ${audience === option.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-primary'}`}><option.icon className="size-5" /></span>
              <span className="min-w-0"><strong className="block text-sm sm:text-base">{option.label}</strong><span className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{option.sub}</span></span>
            </button>
          ))}
        </div>
        <div className="mt-5 grid overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-2">
          <div className={`flex flex-col items-start p-6 sm:p-10 ${audience === 'employer' ? 'bg-primary/5' : 'bg-coral/10'}`}>
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><AudienceIcon className="size-7" /></span>
            <h3 className="mt-6 max-w-sm text-2xl font-bold tracking-tight sm:text-3xl">{selectedAudience.title}</h3>
            <p className="mt-3 max-w-md text-muted-foreground">{selectedAudience.description}</p>
            <Button size="lg" className="mt-7 w-full sm:w-auto" asChild>
              <Link to="/register">{selectedAudience.action} <ArrowRight /></Link>
            </Button>
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-10">
            <h4 className="text-sm font-semibold text-primary">What you can do</h4>
            <ul className="mt-5 divide-y">
              {selectedAudience.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-coral/15 text-coral"><BadgeCheck className="size-4" /></span>
                  <span className="text-sm leading-relaxed">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============ SAFETY ============ */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Your safety matters</SectionLabel>
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
              { icon: ShieldCheck, title: 'Admin review', text: 'Only verified outcomes affect trust scores, and every decision is audited.' },
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

      {/* ============ COMMUNITY STORIES ============ */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <SectionLabel>From the community</SectionLabel>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Stories worth sharing</h2>
              <p className="mt-3 text-muted-foreground">Explore experiences and videos shared by the community, reviewed before they appear here.</p>
            </div>
            <Button variant="outline" className="w-full sm:w-auto" asChild><Link to="/community">Explore all stories <ArrowRight /></Link></Button>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {communityLoading ? [1, 2, 3].map((index) => <Skeleton key={index} className="h-96 rounded-2xl" />) : communityStories.map((story) => (
              <article key={story.uuid} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="relative aspect-[4/3] overflow-hidden bg-primary/8">
                  {story.media_url ? (
                    <video src={story.media_url} poster={story.poster_url ?? undefined} controls playsInline preload="none" aria-label={story.title} className="size-full bg-black object-contain" />
                  ) : story.slides?.length ? (
                    <img src={story.slides[0].url} alt={story.title} loading="lazy" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
                      <BookOpen className="size-9 text-coral" />
                      <span className="text-sm font-medium text-primary">{story.content_type === 'video' ? 'Open the original story' : 'Read this community story'}</span>
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-background/95 px-3 py-1 text-xs font-semibold text-primary shadow-sm">{story.content_type === 'video' ? 'Video story' : 'Community story'}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-semibold leading-snug">{story.title}</h3>
                  {hasOriginalStoryDescription(story.description) && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{story.description}</p>}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-coral" /> Moderated before publishing</span>
                    {story.source_url && <a href={story.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Original source <ExternalLink className="size-3" /></a>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!communityLoading && !communityStories.length && <div className="mt-10 rounded-2xl border border-dashed bg-card px-6 py-12 text-center text-sm text-muted-foreground">Community stories will appear here after review.</div>}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4">
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">Stories reflect contributors’ experiences. A source link identifies the original media; it does not verify every claim.</p>
            <CommunityStoryDialog trigger={<Button size="sm">Share your experience <ChevronRight /></Button>} />
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <SectionLabel>Real experiences</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Words from verified employment</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Approved reviews from employers who worked with helpers on Hire Safe.</p>
        </div>
        {isLoading || experienceLoading ? (
          <div className="mx-auto mt-12 grid max-w-7xl gap-5 px-4 sm:grid-cols-3 sm:px-6">{[1, 2, 3].map((index) => <Skeleton key={index} className="h-56 rounded-2xl" />)}</div>
        ) : experienceQuotes.length ? (
          <div className="experience-marquee mt-12" aria-label="Approved employment reviews">
            <div className="experience-marquee-track">
              {[false, true].map((hidden) => (
                <div key={String(hidden)} className="experience-marquee-group" aria-hidden={hidden}>
                  {experienceQuotes.map((review) => (
                    <article key={review.uuid} className="experience-marquee-card">
                      <Quote className="size-7 text-coral" aria-hidden="true" />
                      <blockquote className="mt-5 line-clamp-4 text-base font-medium leading-relaxed">“{review.feedback}”</blockquote>
                      <div className="mt-auto border-t pt-4">
                        <p className="text-sm font-semibold">{review.employer_name}</p>
                        <Link to={`/helpers/${review.helperId}`} className="mt-0.5 inline-block text-xs text-muted-foreground hover:text-primary hover:underline">Review for {review.helperName}</Link>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mx-auto mt-12 max-w-xl px-4 text-center text-sm text-muted-foreground">Approved employment reviews will appear here as they become available.</p>
        )}
      </section>

      {/* ============ FAQ ============ */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(260px,0.36fr)_minmax(0,0.64fr)] lg:gap-16">
          <div>
            <SectionLabel>Common questions</SectionLabel>
            <h2 className="mt-4 max-w-sm text-3xl font-bold tracking-tight sm:text-4xl">Answers you can count on</h2>
            <p className="mt-4 max-w-sm text-muted-foreground">Find out how verification, reviews, reports, and privacy work before you take the next step.</p>
            <div className="mt-7 flex max-w-sm items-start gap-3 rounded-xl border bg-card p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageCircleQuestion className="size-5" /></span>
              <p className="text-sm leading-relaxed text-muted-foreground">Every decision follows a review process. A single claim cannot change someone’s public trust score.</p>
            </div>
          </div>
          <div>
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter questions">
              {([
                { id: 'all' as const, label: 'All questions' },
                { id: 'hiring' as const, label: 'Hiring & trust' },
                { id: 'safety' as const, label: 'Safety & privacy' },
              ]).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={faqCategory === option.id}
                  onClick={() => setFaqCategory(option.id)}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${faqCategory === option.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary/40'}`}
                >{option.label}</button>
              ))}
            </div>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.filter((faq) => faqCategory === 'all' || faq.category === faqCategory).map((faq) => {
                const number = faqs.indexOf(faq) + 1
                return (
                  <AccordionItem key={faq.q} value={`faq-${number}`} className="overflow-hidden rounded-xl border bg-card px-5 shadow-sm data-[state=open]:border-primary/30">
                    <AccordionTrigger className="items-center py-5 text-left text-base font-semibold hover:no-underline">
                      <span className="flex items-start gap-4"><span className="mt-0.5 font-mono text-xs font-bold text-coral">{String(number).padStart(2, '0')}</span>{faq.q}</span>
                    </AccordionTrigger>
                    <AccordionContent className="pl-8 pr-5 pb-5 leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="relative isolate overflow-hidden rounded-3xl bg-[#140e1d] text-white">
          <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-coral/15 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-28 left-1/4 size-72 rounded-full bg-primary/50 blur-3xl" aria-hidden="true" />
          <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)] lg:items-center lg:gap-16 lg:p-14">
            <div>
              <SectionLabel light>Take the next step</SectionLabel>
              <h2 className="mt-5 max-w-lg text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">A safer way forward starts with one choice.</h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">Whether you’re hiring for your home or looking for your next role, explore the people and opportunities on Hire Safe.</p>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/70">
                <span className="flex items-center gap-1.5"><BadgeCheck className="size-4 text-coral" /> Verification details</span>
                <span className="flex items-center gap-1.5"><BadgeCheck className="size-4 text-coral" /> Moderated reviews</span>
                <span className="flex items-center gap-1.5"><BadgeCheck className="size-4 text-coral" /> Fair process</span>
              </div>
            </div>
            <div className="grid gap-3">
              <Link to="/search" className="group flex items-center gap-4 rounded-2xl border border-white/15 bg-white p-4 text-foreground shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral sm:p-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Search className="size-6" /></span>
                <span className="min-w-0 flex-1"><strong className="block text-base">I’m looking to hire</strong><span className="mt-1 block text-sm text-muted-foreground">Explore helpers and compare their profiles.</span></span>
                <ArrowRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/jobs" className="group flex items-center gap-4 rounded-2xl border border-white/15 bg-white p-4 text-foreground shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral sm:p-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-coral/15 text-coral"><Briefcase className="size-6" /></span>
                <span className="min-w-0 flex-1"><strong className="block text-base">I’m looking for work</strong><span className="mt-1 block text-sm text-muted-foreground">Browse roles that fit your skills.</span></span>
                <ArrowRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="mt-3 text-center text-sm text-white/70">New to Hire Safe? <Link to="/register" className="font-semibold text-white underline decoration-coral decoration-2 underline-offset-4 hover:text-coral">Create your profile</Link></p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

