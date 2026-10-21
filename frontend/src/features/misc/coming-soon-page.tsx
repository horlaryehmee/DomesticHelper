import { useEffect, useState, type FormEvent } from 'react'
import { LogoLockup } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, ApiError } from '@/lib/api'

export function ComingSoonPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Coming Soon | Hire Safe'
    return () => { document.title = previousTitle }
  }, [])

  async function joinWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const response = await api.post<{ message: string }>('/waitlist', { email })
      setMessage(response.message)
      setEmail('')
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Could not save your email. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-[#fbf9f7] px-6 text-[#291a36]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_50%_30%,#f3e9ee_0%,transparent_100%)]" aria-hidden="true" />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center py-16 text-center">
        <LogoLockup className="mb-12 h-14 sm:h-16" />
        <span className="mb-7 rounded-full border border-[#e9d6d3] bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#914a4b]">
          Launching soon
        </span>
        <h1 className="max-w-2xl text-5xl font-semibold leading-[1.08] tracking-tight sm:text-7xl">
          A safer way to find <span className="text-[#e76c54]">help at home.</span>
        </h1>
        <p className="mt-7 max-w-lg text-base leading-7 text-[#675c6c] sm:text-lg sm:leading-8">
          Hire Safe is getting ready to connect households with domestic helpers through clear profiles, verified work history, and fair reviews.
        </p>

        <div className="mt-11 w-full max-w-md">
          <p className="mb-3 text-sm font-medium">Be the first to know when we launch.</p>
          <form onSubmit={joinWaitlist} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              required
              maxLength={255}
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Your email address"
              aria-label="Email address"
              className="h-12 border-[#ded4dc] bg-white px-4 shadow-sm"
            />
            <Button type="submit" disabled={submitting} className="h-12 shrink-0 px-6">
              {submitting ? 'Saving…' : 'Notify me'}
            </Button>
          </form>
          <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-[#675c6c]">{message}</p>
        </div>
      </div>

      <footer className="mx-auto w-full max-w-6xl border-t border-[#e9e1e5] py-6 text-center text-xs text-[#827782] sm:text-left">
        © {new Date().getFullYear()} Hire Safe
      </footer>
    </main>
  )
}
