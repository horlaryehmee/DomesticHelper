import { useFeatures } from '@/lib/features'
import { GoogleSignInButton } from './google-sign-in'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FeatureLink as Link } from '@/components/feature-link'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AuthSectionOne from '@/components/ui/auth-section-1'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useAuth, dashboardPath, accountPath } from '@/lib/auth'
import { api, ApiError } from '@/lib/api'

const schema = z.object({
  login: z.string().min(3, 'Enter your email or phone number'),
  password: z.string().min(1, 'Enter your password'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { user, login } = useAuth()
  const { enabled } = useFeatures()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const { data: demoData } = useQuery({
    queryKey: ['demo-login-accounts'],
    queryFn: () => api.get<{ data: { email: string; label: string; type: string; password: string }[] }>('/demo/accounts'),
    enabled: enabled.demo_data,
  })
  const demoAccounts = enabled.demo_data ? demoData?.data ?? [] : []

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const fillDemoCredentials = (email: string) => {
    const account = demoAccounts.find((item) => item.email === email)
    if (!account) return
    setValue('login', account.email, { shouldDirty: true, shouldValidate: true })
    setValue('password', account.password, { shouldDirty: true, shouldValidate: true })
    setServerError(null)
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    setServerError(null)
    try {
      const loggedInUser = await login(data)
      const from = (location.state as { from?: string })?.from
      // Redirect to the page the user came from, otherwise straight to
      // their role dashboard — never the public homepage.
      navigate(loggedInUser.approval_status !== 'approved' ? accountPath(loggedInUser) : from ?? dashboardPath(loggedInUser.user_type), { replace: true })
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Already logged in? Skip the form and go to the dashboard.
  if (user) {
    return <Navigate to={accountPath(user)} replace />
  }

  return (
    <AuthSectionOne mode="login">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" aria-busy={submitting}>
            {serverError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{serverError}</div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="login" className="text-black/70 dark:text-white/70">Email or phone number</Label>
              <Input className="h-14 rounded-[10px] border-black/25 bg-white px-4 text-base text-black placeholder:text-black/40 focus-visible:border-black focus-visible:ring-black/20 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40 dark:focus-visible:border-white dark:focus-visible:ring-white/20" required aria-invalid={!!errors.login} aria-describedby={errors.login ? "login-error" : undefined} id="login" autoComplete="username" placeholder="Email address or phone number" {...register('login')} />
              {errors.login && <p id="login-error" role="alert" className="text-xs text-destructive">{errors.login.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-black/70 dark:text-white/70">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-black/65 underline-offset-4 hover:underline dark:text-white/65">
                  Forgot password?
                </Link>
              </div>
              <Input className="h-14 rounded-[10px] border-black/25 bg-white px-4 text-base text-black placeholder:text-black/40 focus-visible:border-black focus-visible:ring-black/20 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40 dark:focus-visible:border-white dark:focus-visible:ring-white/20" required aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <p id="password-error" role="alert" className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="h-12 w-full rounded-[10px] border border-black/40 bg-black text-lg font-medium text-white hover:bg-black/85 dark:border-white/40 dark:bg-white dark:text-black dark:hover:bg-white/85" disabled={submitting}>
              {submitting ? <Spinner label="Logging in..." /> : 'Log in'}
            </Button>
          </form>
          <div className="mt-5"><GoogleSignInButton intent="login" /></div>
          {demoAccounts.length > 0 && <div className="mt-6 border-t pt-5">
            <div className="mb-3 text-center">
              <p className="text-sm font-semibold">Demo login</p>
              <p className="mt-1 text-xs text-muted-foreground">Select a sample employer or helper to fill in its login details.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select aria-label="Demo account" className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm" id="demo-account">
                {demoAccounts.map((account) => <option key={account.email} value={account.email}>{account.label} ({account.type})</option>)}
              </select>
              <Button type="button" variant="outline" onClick={() => {
                const select = document.getElementById('demo-account') as HTMLSelectElement | null
                if (select) fillDemoCredentials(select.value)
              }}>Use demo account</Button>
            </div>
          </div>}
    </AuthSectionOne>
  )
}
