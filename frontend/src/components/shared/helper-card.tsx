import { Link } from 'react-router-dom'
import { MapPin, Briefcase, Clock, Heart } from 'lucide-react'
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

const PRIORITY_BADGES: VerificationBadgeKey[] = ['identity_verified', 'nin_verified', 'employment_verified', 'phone_verified', 'reference_checked']

export function HelperCard({ helper, onSave, saved }: { helper: HelperSummary; onSave?: () => void; saved?: boolean }) {
  const { user } = useAuth()
  const score = helper.trust_score
  const scoreColor =
    score.category === 'high'
      ? 'text-success'
      : score.category === 'moderate'
        ? 'text-primary'
        : score.category === 'needs_review'
          ? 'text-warning'
          : 'text-muted-foreground'

  const badges = PRIORITY_BADGES.filter((b) => helper.verification_badges.includes(b))

  return (
    <Card className="group relative gap-4 overflow-hidden py-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4 px-5">
        <Link to={`/helpers/${helper.uuid}`} className="shrink-0">
          <Avatar className="size-16 rounded-xl">
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

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Briefcase className="size-3.5" /> {yearsLabel(helper.years_experience)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {helper.availability?.replace(/_/g, ' ')}
            </span>
            <span>{formatSalary(helper.expected_salary_min, helper.expected_salary_max)}</span>
            {helper.average_rating > 0 && <RatingStars rating={helper.average_rating} size="size-3.5" showValue />}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 pt-1">
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
