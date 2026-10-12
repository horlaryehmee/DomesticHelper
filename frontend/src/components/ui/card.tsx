import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm', className)}
      {...props}
    />
  )
}

function DotsCard({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dots-card"
      className={cn('relative w-full bg-transparent text-card-foreground', className)}
      {...props}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-border" aria-hidden="true" />
      <span className="absolute inset-x-0 bottom-0 h-px bg-border" aria-hidden="true" />
      <div className="relative h-full border-x border-border py-8">
        {[
          'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
          'top-0 right-0 translate-x-1/2 -translate-y-1/2',
          'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
          'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
        ].map((position) => (
          <span
            key={position}
            className={cn('absolute z-10 size-1 rounded-full bg-coral ring-4 ring-background', position)}
            aria-hidden="true"
          />
        ))}
        {children}
      </div>
    </div>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto]', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-title" className={cn('leading-none font-semibold', className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-description" className={cn('text-muted-foreground text-sm', className)} {...props} />
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('flex items-center px-6', className)} {...props} />
}

export { Card, DotsCard, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
