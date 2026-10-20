import { Link } from 'react-router-dom'
import { MapPin, Clock, Heart } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RatingStars } from '@/components/ui/rating'
import { VerificationBadgeCompact, type VerificationBadgeKey } from '@/components/ui/verification-badges'
import { formatSalary, yearsLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { HelperSummary } from '@/lib/types'
import { useAuth } from '@/lib/auth'

const PRIORITY_BADGES: VerificationBadgeKey[] = ['identity_verified', 'nin_verified', 'employment_verified', 'reference_checked']

export function HelperCard({ helper, onSave, saved, variant = 'list' }: { helper: HelperSummary; onSave?: () => void; saved?: boolean; variant?: 'list' | 'grid' }) {
  const { user } = useAuth()
  const score = helper.trust_score
  const scoreColor =
    score.category === 'high'
      ? 'text-success-foreground'
      : score.category === 'moderate'
        ? 'text-primary'
        : score.category === 'needs_review'
          ? 'text-warning-foreground'
          : 'text-muted-foreground'

  const badges = PRIORITY_BADGES.filter((b) => helper.verification_badges.includes(b))

  if (variant === 'grid') {
    return (
      <Card className="helper-profile-card group h-full gap-0 overflow-hidden rounded-xl border-slate-200 bg-white py-0 shadow-sm">
        <div className="flex items-start gap-3 p-4">
          <Link to={`/helpers/${helper.uuid}`} className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Avatar className="size-14 rounded-lg bg-slate-100">
              <AvatarImage src={helper.photo_url ?? undefined} alt={helper.name} className="object-cover" />
              <AvatarFallback name={helper.name} className="rounded-lg text-lg" />
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/helpers/${helper.uuid}`} className="truncate text-base font-semibold leading-tight hover:text-primary hover:underline">{helper.name}</Link>
              {user?.user_type === 'employer' && onSave && <button type="button" onClick={onSave} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-primary" aria-label={saved ? `Remove ${helper.name} from saved helpers` : `Save ${helper.name}`}><Heart className={cn('size-4', saved && 'fill-destructive text-destructive')} /></button>}
            </div>
            <p className="mt-1 truncate text-xs font-medium text-primary">{helper.skills[0]?.name || 'Domestic helper'}</p>
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" />{[helper.city, helper.state].filter(Boolean).join(', ') || 'Nigeria'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-4 py-2.5 text-xs text-muted-foreground">
          <span>{yearsLabel(helper.years_experience)} experience</span>
          <span className={cn('font-semibold', scoreColor)}>{score.score}/100 trust</span>
          {helper.verification_status === 'verified' && <span className="font-medium text-success-foreground">Verified</span>}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          <span className="min-w-0 truncate text-xs font-semibold">{formatSalary(helper.expected_salary_min, helper.expected_salary_max)}{(helper.expected_salary_min || helper.expected_salary_max) && <span className="font-normal text-muted-foreground"> / month</span>}</span>
          <Link to={`/helpers/${helper.uuid}`} className="shrink-0 text-xs font-semibold text-primary hover:underline">View profile →</Link>
        </div>
      </Card>
    )
  }

  return (
    <Card className="group relative gap-2 overflow-hidden py-3 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 px-4">
        <Link to={`/helpers/${helper.uuid}`} className="shrink-0">
          <Avatar className="size-12 rounded-lg">
            <AvatarImage src={helper.photo_url ?? undefined} alt={helper.name} className="object-cover" />
            <AvatarFallback name={helper.name} className="rounded-xl text-lg" />
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/helpers/${helper.uuid}`} className="font-semibold hover:text-primary hover:underline">
                {helper.name}
              </Link>
              <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5" />
                {[helper.city, helper.state].filter(Boolean).join(', ') || 'Nigeria'}
              </div>
            </div>
            <div className={cn('text-right', scoreColor)}>
              <div className="text-2xl font-bold leading-none">{score.score}</div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-wide opacity-80">Trust</div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {helper.skills.slice(0, 3).map((s) => (
              <Badge key={s.id} variant="secondary" className="font-normal">
                {s.name}
              </Badge>
            ))}
            {helper.skills.length > 3 && <span className="text-xs text-muted-foreground">+{helper.skills.length - 3}</span>}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
               {yearsLabel(helper.years_experience)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {helper.availability?.replace(/_/g, ' ')}
            </span>
            <span>{formatSalary(helper.expected_salary_min, helper.expected_salary_max)}</span>
            {helper.average_rating > 0 && <RatingStars rating={helper.average_rating} size="size-3.5" showValue />}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pt-1">
        <div className="flex items-center gap-1.5">
          {badges.map((b) => (
            <VerificationBadgeCompact key={b} badge={b} />
          ))}
          {helper.verification_status === 'verified' && badges.length === 0 && (
            <Badge variant="success">Verified</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user?.user_type === 'employer' && onSave && (
            <Button variant="outline" size="sm" onClick={onSave} aria-label="Save helper">
              <Heart className={cn(saved && 'fill-destructive text-destructive')} />
            </Button>
          )}
          <Button asChild size="sm">
            <Link to={`/helpers/${helper.uuid}`}>View Profile</Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}
