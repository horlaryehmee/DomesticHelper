import { BadgeCheck, Mail, Phone, Camera, Fingerprint, MapPin, Briefcase, UserCheck, FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export type VerificationBadgeKey =
  | 'phone_verified'
  | 'email_verified'
  | 'identity_verified'
  | 'photo_verified'
  | 'nin_verified'
  | 'address_verified'
  | 'employment_verified'
  | 'reference_checked'
  | 'profile_verified'

export const BADGE_META: Record<VerificationBadgeKey, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  phone_verified: { label: 'Phone Verified', icon: Phone },
  email_verified: { label: 'Email Verified', icon: Mail },
  identity_verified: { label: 'Identity Verified', icon: BadgeCheck },
  photo_verified: { label: 'Photo Verified', icon: Camera },
  nin_verified: { label: 'NIN Verified', icon: Fingerprint },
  address_verified: { label: 'Address Verified', icon: MapPin },
  employment_verified: { label: 'Employment Verified', icon: Briefcase },
  reference_checked: { label: 'Reference Checked', icon: UserCheck },
  profile_verified: { label: 'Profile Verified', icon: FileCheck },
}

export function VerificationBadge({
  badge,
  className,
}: {
  badge: VerificationBadgeKey
  className?: string
}) {
  const meta = BADGE_META[badge]
  if (!meta) return null
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success-foreground',
        className,
      )}
      title={meta.label}
    >
      <Icon className="size-3" />
      {meta.label}
    </span>
  )
}

export function VerificationBadgeCompact({ badge, className }: { badge: VerificationBadgeKey; className?: string }) {
  const meta = BADGE_META[badge]
  if (!meta) return null
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex size-5 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success-foreground',
        className,
      )}
      title={meta.label}
    >
      <Icon className="size-3" />
    </span>
  )
}
