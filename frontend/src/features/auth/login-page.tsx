import { useState } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useAuth, dashboardPath } from '@/lib/auth'
import { ApiError } from '@/lib/api'

const staffDemoAccounts = [
  { email: 'admin@domestichelper.test', label: 'Super admin' },
  { email: 'verifier@domestichelper.test', label: 'Verification officer' },
  { email: 'moderator@domestichelper.test', label: 'Moderator' },
]

const employerDemoAccounts = Array.from({ length: 10 }, (_, index) => ({
  email: `employer${index + 1}@domestichelper.test`,
  label: `Employer ${index + 1}`,
}))

const featuredHelperNames: Record<number, string> = {
  19: 'Hannah Igwe · trust score 30',
  31: 'Amina Yusuf · trust score 35',
  32: 'Daniel Obi · trust score 15',
  33: 'Blessing Eze · trust score 45',
  34: 'Musa Abubakar · trust score 40',
}

const helperDemoAccounts = Array.from({ length: 34 }, (_, index) => {
  const number = index + 1

  return {
    email: `helper${number}@domestichelper.test`,
    label: featuredHelperNames[number] ?? `Helper ${number}`,
  }
})

const schema = z.object({
  login: z.string().min(3, 'Enter your email or phone number'),
  password: z.string().min(1, 'Enter your password'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const fillDemoCredentials = (email: string) => {
    setValue('login', email, { shouldDirty: true, shouldValidate: true })
    setValue('password', 'password', { shouldDirty: true, shouldValidate: true })
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
      navigate(from ?? dashboardPath(loggedInUser.user_type), { replace: true })
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Already logged in? Skip the form and go to the dashboard.
  if (user) {
    return <Navigate to={dashboardPath(user.user_type)} replace />
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-xl gap-5">
        <CardHeader className="items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </span>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Log in to your Domestic Helper account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{serverError}</div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="login">Email or phone number</Label>
              <Input id="login" autoComplete="username" placeholder="you@example.com or 0803…" {...register('login')} />
              {errors.login && <p className="text-xs text-destructive">{errors.login.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Spinner label="Logging in…" /> : 'Log in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>

          <div className="mt-6 border-t pt-5">
            <div className="mb-3 text-center">
              <p className="text-sm font-semibold">Demo login details</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose any seeded account. The password for every demo account is{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">password</code>.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                aria-label="Demo account"
                className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue="admin@domestichelper.test"
                id="demo-account"
              >
                <optgroup label="Administration">
                  {staffDemoAccounts.map((account) => (
                    <option key={account.email} value={account.email}>{account.label} — {account.email}</option>
                  ))}
                </optgroup>
                <optgroup label="Employers">
                  {employerDemoAccounts.map((account) => (
                    <option key={account.email} value={account.email}>{account.label} — {account.email}</option>
                  ))}
                </optgroup>
                <optgroup label="Helpers">
                  {helperDemoAccounts.map((account) => (
                    <option key={account.email} value={account.email}>{account.label} — {account.email}</option>
                  ))}
                </optgroup>
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const select = document.getElementById('demo-account') as HTMLSelectElement | null
                  if (select) fillDemoCredentials(select.value)
                }}
              >
                Use demo account
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Includes 3 staff accounts, 10 employers, and 34 helpers. Helpers 19 and 31–34 demonstrate low trust scores.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
