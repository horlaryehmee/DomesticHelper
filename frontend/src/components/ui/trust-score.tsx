import { cn } from '@/lib/utils'

export type TrustCategory = 'high' | 'moderate' | 'needs_review' | 'new'

export function trustCategory(score: number, eventsCount = 0): TrustCategory {
  if (eventsCount === 0) return 'new'
  if (score >= 80) return 'high'
  if (score >= 50) return 'moderate'
  return 'needs_review'
}

export function trustLabel(category: TrustCategory): string {
  switch (category) {
    case 'high':
      return 'High Trust'
    case 'moderate':
      return 'Moderate Trust'
    case 'needs_review':
      return 'Needs Review'
    case 'new':
      return 'Building Trust'
  }
}

export function TrustScoreRing({
  score,
  category,
  size = 120,
  stroke = 9,
  className,
}: {
  score: number
  category: TrustCategory
  size?: number
  stroke?: number
  className?: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circumference - (clamped / 100) * circumference

  const color =
    category === 'high'
      ? 'var(--color-success)'
      : category === 'moderate'
        ? 'var(--color-primary)'
        : category === 'needs_review'
          ? 'var(--color-warning)'
          : 'var(--color-muted-foreground)'

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-semibold leading-none" style={{ fontSize: size / 4.2 }}>
          {clamped}
        </span>
        {size >= 100 && (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Trust score
          </span>
        )}
      </div>
    </div>
  )
}
