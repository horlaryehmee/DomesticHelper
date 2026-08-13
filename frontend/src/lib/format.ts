export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-NG', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date))
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelative(date: string | null | undefined): string {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(date)
}

export function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return 'Negotiable'
  if (min && max && min === max) return formatNaira(min)
  if (min && max) return `${formatNaira(min)} – ${formatNaira(max)}`
  if (min) return `From ${formatNaira(min)}`
  return `Up to ${formatNaira(max as number)}`
}

export function yearsLabel(years: number): string {
  if (years < 1) return 'Under 1 year'
  if (years === 1) return '1 year'
  return `${years} years`
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}
