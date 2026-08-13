import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RatingStars({
  rating,
  size = 'size-4',
  showValue = false,
  className,
}: {
  rating: number
  size?: string
  showValue?: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="relative inline-flex">
        <span className="flex gap-0.5 text-muted">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={cn(size, 'fill-current')} />
          ))}
        </span>
        <span
          className="absolute inset-0 flex gap-0.5 overflow-hidden text-warning"
          style={{ width: `${(Math.max(0, Math.min(5, rating)) / 5) * 100}%` }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={cn(size, 'fill-current shrink-0')} />
          ))}
        </span>
      </span>
      {showValue && <span className="text-sm font-medium">{rating.toFixed(1)}</span>}
    </span>
  )
}

export function RatingInput({
  value,
  onChange,
  size = 'size-6',
}: {
  value: number
  onChange: (v: number) => void
  size?: string
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onClick={() => onChange(i)}
          className="cursor-pointer transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <Star className={cn(size, i <= value ? 'fill-warning text-warning' : 'fill-muted text-muted')} />
        </button>
      ))}
    </div>
  )
}
