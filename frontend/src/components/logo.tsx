import { cn } from '@/lib/utils'
import logoSrc from '@/assets/brand/hire-safe-logo.png'
import markSrc from '@/assets/brand/hire-safe-mark.png'

/**
 * The Hire Safe wordmark, as artwork supplied by the brand.
 *
 * `Lockup` is the stacked "hire / safe" logo with the coral spark.
 * `Mark` is the horizontal "hire" + spark crop, for tight bar heights.
 *
 * The artwork is deep purple + coral on a transparent background, so it reads
 * on both the light page background and the dark ink used behind it here.
 */

export function LogoMark({ className, alt = 'Hire Safe' }: { className?: string; alt?: string }) {
  return <img src={markSrc} alt={alt} className={cn('w-auto object-contain', className)} />
}

export function LogoLockup({ className, alt = 'Hire Safe' }: { className?: string; alt?: string }) {
  return <img src={logoSrc} alt={alt} className={cn('w-auto object-contain', className)} />
}

/**
 * Full brand lockup: the mark plus the product surface label (e.g. "Admin").
 * Used in the sidebars, so the label sits under the wordmark baseline.
 */
export function LogoBrand({
  label,
  size = 'md',
  className,
}: {
  label?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      {size === 'md' ? (
        <LogoMark className="h-8" />
      ) : (
        <LogoMark className="h-7" />
      )}
      {label && (
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      )}
    </span>
  )
}
