import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError, setToken, getPreviewToken } from '@/lib/api'
import { useAuth, accountPath, type AuthUser } from '@/lib/auth'
import AuthSectionOne from '@/components/ui/auth-section-1'

export function GoogleSignInButton({ intent, userType, termsAccepted = false }: { intent: 'login' | 'register'; userType?: 'employer' | 'helper'; termsAccepted?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { data } = useQuery({ queryKey: ['google-auth-status'], queryFn: () => api.get<{ enabled: boolean }>('/auth/google/status') })
  if (!data?.enabled) return null
  async function start() {
    setError('')
    if (intent === 'register' && !termsAccepted) { setError('Please agree to the Terms of Service and Privacy Policy above to continue with Google.'); return }
    setBusy(true)
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(32))
      const verifier = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
      const challenge = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')
      sessionStorage.setItem('hiresafe_google_verifier', verifier)
      const params = new URLSearchParams({ intent, challenge })
      if (intent === 'register') { params.set('user_type', userType ?? 'employer'); params.set('terms', '1'); const preview = getPreviewToken(); if (preview) params.set('preview', preview) }
      window.location.assign(`/api/auth/google/redirect?${params}`)
    } catch { setError('Could not start Google sign-in. Please try again.'); setBusy(false) }
  }
  return <div className="space-y-3"><div className="flex items-center gap-4 py-2 text-xs text-black/45 dark:text-white/45"><span className="h-px flex-1 bg-black/15 dark:bg-white/15" />or<span className="h-px flex-1 bg-black/15 dark:bg-white/15" /></div><button type="button" disabled={busy} onClick={start} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-black/25 bg-white px-4 font-medium text-black transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50 dark:border-white/25 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"><GoogleIcon />{busy ? 'Connecting to Google...' : 'Continue with Google'}</button>{error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}</div>
}

export function GoogleCallbackPage() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [flow] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    return { code: params.get('code'), error: params.get('error'), verifier: sessionStorage.getItem('hiresafe_google_verifier') }
  })
  useEffect(() => { window.history.replaceState(window.history.state, '', window.location.pathname) }, [])
  const { data, error, isPending } = useQuery({
    queryKey: ['google-auth-exchange', flow.code],
    queryFn: () => api.post<{ token: string; user: AuthUser }>('/auth/google/exchange', { code: flow.code, verifier: flow.verifier }),
    enabled: !!flow.code && !!flow.verifier && !flow.error,
    retry: false, staleTime: Infinity, refetchOnWindowFocus: false, refetchOnMount: false,
  })
  useEffect(() => {
    if (!data) return
    setToken(data.token); setUser(data.user); sessionStorage.removeItem('hiresafe_google_verifier')
    navigate(accountPath(data.user), { replace: true })
  }, [data, setUser, navigate])
  const message = flow.error || (!flow.code || !flow.verifier ? 'This sign-in session is missing or expired. Please start again.' : error instanceof ApiError ? error.message : error ? 'Google sign-in could not be completed. Please try again.' : '')
  return <AuthSectionOne mode="login"><div className="space-y-5">{message ? <><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{message}</p><div className="flex flex-wrap gap-4"><Link to="/login" className="font-semibold underline">Return to sign in</Link><Link to="/register" className="font-semibold underline">Create an account</Link></div></> : <p role="status" className="py-8 text-black/60 dark:text-white/60">{isPending ? 'Completing Google sign-in...' : 'Opening your account...'}</p>}</div></AuthSectionOne>
}

function GoogleIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z"/><path fill="#EB4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>
}
