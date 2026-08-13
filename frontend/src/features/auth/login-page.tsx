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
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

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
      <Card className="w-full max-w-md gap-5">
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
        </CardContent>
      </Card>
    </div>
  )
}
