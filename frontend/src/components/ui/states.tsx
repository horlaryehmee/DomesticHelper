import * as React from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 px-6 text-center', className)}>
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-6 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-1">
        <h3 className="font-medium">{title}</h3>
        {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this page. Please try again.',
  retry,
  className,
}: {
  title?: string
  description?: string
  retry?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-16 px-6 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <span className="text-destructive text-xl font-bold">!</span>
      </div>
      <div className="space-y-1">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </div>
      {retry && (
        <button
          onClick={retry}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  )
}
