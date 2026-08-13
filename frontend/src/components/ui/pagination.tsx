import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export function Pagination({
  meta,
  onChange,
  className,
}: {
  meta: PaginationMeta
  onChange: (page: number) => void
  className?: string
}) {
  if (meta.last_page <= 1) return null

  const pages: (number | '…')[] = []
  const current = meta.current_page
  const last = meta.last_page
  for (let i = 1; i <= last; i++) {
    if (i === 1 || i === last || Math.abs(i - current) <= 1) pages.push(i)
    else if (pages[pages.length - 1] !== '…') pages.push('…')
  }

  return (
    <nav className={className} aria-label="Pagination">
      <div className="flex items-center justify-center gap-1">
        <Button variant="outline" size="icon" disabled={current <= 1} onClick={() => onChange(current - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-2 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === current ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onChange(p)}
              aria-current={p === current ? 'page' : undefined}
            >
              {p}
            </Button>
          ),
        )}
        <Button variant="outline" size="icon" disabled={current >= last} onClick={() => onChange(current + 1)} aria-label="Next page">
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
