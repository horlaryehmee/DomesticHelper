import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Briefcase, UserRound, ArrowLeft, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { api, ApiError, setToken } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface Meta {
  skills: { id: number; name: string }[]
  states: string[]
  availability: { value: string; label: string }[]
  employment_types: { value: string; label: string }[]
}

const employerSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number'),
  password: z.string().min(8, 'At least 8 characters'),
  password_confirmation: z.string(),
  profile_type: z.enum(['individual', 'agency']),
  agency_name: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
}).refine((d) => d.password === d.password_confirmation, { message: 'Passwords do not match', path: ['password_confirmation'] })

const helperSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number'),
  password: z.string().min(8, 'At least 8 characters'),
  password_confirmation: z.string(),
  date_of_birth: z.string().min(1, 'Required'),
  gender: z.enum(['male', 'female', 'other']),
  state: z.string().min(1, 'Required'),
  city: z.string().min(1, 'Required'),
  nin: z.string().regex(/^\d{11}$/, 'NIN must be 11 digits'),
  skills: z.array(z.number()).min(1, 'Select at least one skill'),
  years_experience: z.coerce.number().min(0).max(60),
  availability: z.string().min(1, 'Required'),
  employment_type: z.string().optional(),
  expected_salary_min: z.coerce.number().min(0, 'Enter a salary'),
  bio: z.string().optional(),
}).refine((d) => d.password === d.password_confirmation, { message: 'Passwords do not match', path: ['password_confirmation'] })

export function RegisterPage() {
  const [role, setRole] = useState<'employer' | 'helper' | null>(null)
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.get<Meta>('/meta'),
  })

  if (!role) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-2 text-muted-foreground">What best describes you? You can change this later.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {[
            { key: 'employer' as const, icon: Briefcase, title: 'I want to hire', text: 'Find and hire verified domestic staff: housekeepers, nannies, drivers and more.' },
            { key: 'helper' as const, icon: UserRound, title: 'I am a domestic helper', text: 'Build your verified reputation and get hired by families who value good work.' },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setRole(c.key)}
              className="group cursor-pointer rounded-xl border bg-card p-8 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20">
                <c.icon className="size-6 text-primary" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{c.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
            </button>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <button onClick={() => setRole(null)} className="mb-6 inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Choose a different account type
      </button>
      {role === 'employer' ? (
        <EmployerForm meta={meta} onDone={(user) => { setUser(user); navigate('/employer') }} />
      ) : (
        <HelperForm meta={meta} onDone={(user) => { setUser(user); navigate('/helper') }} />
      )}
    </div>
  )
}

function EmployerForm({ meta, onDone }: { meta?: Meta; onDone: (u: never) => void }) {
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(employerSchema),
    defaultValues: { profile_type: 'individual', state: '' },
  })
  const profileType = watch('profile_type')

  const onSubmit = async (data: z.infer<typeof employerSchema>) => {
    setSubmitting(true)
    try {
      const res = await api.post<{ token: string; user: never }>('/auth/register/employer', {
        ...data,
        agency_name: data.profile_type === 'agency' ? data.agency_name : undefined,
      })
      setToken(res.token)
      toast.success('Account created!')
      onDone(res.user)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle className="text-2xl">Employer registration</CardTitle>
        <CardDescription>Household or agency. Verify your phone and start hiring safely.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={errors.first_name?.message}>
              <Input {...register('first_name')} />
            </Field>
            <Field label="Last name" error={errors.last_name?.message}>
              <Input {...register('last_name')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register('email')} />
            </Field>
            <Field label="Phone (for OTP)" error={errors.phone?.message}>
              <Input placeholder="0803 000 0000" {...register('phone')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" error={errors.password?.message}>
              <Input type="password" {...register('password')} />
            </Field>
            <Field label="Confirm password" error={errors.password_confirmation?.message}>
              <Input type="password" {...register('password_confirmation')} />
            </Field>
          </div>
          <Field label="Profile type">
            <div className="flex gap-2">
              {(['individual', 'agency'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue('profile_type', t)}
                  className={cn(
                    'flex-1 cursor-pointer rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                    profileType === t ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
                  )}
                >
                  {t === 'individual' ? 'Individual' : 'Agency'}
                </button>
              ))}
            </div>
          </Field>
          {profileType === 'agency' && (
            <Field label="Agency name" error={errors.agency_name?.message}>
              <Input {...register('agency_name')} />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State" error={errors.state?.message}>
              <Select onValueChange={(v) => setValue('state', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {meta?.states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="City" error={errors.city?.message}>
              <Input {...register('city')} />
            </Field>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Spinner label="Creating account…" /> : 'Create account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function HelperForm({ meta, onDone }: { meta?: Meta; onDone: (u: never) => void }) {
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(helperSchema),
    defaultValues: { skills: [], gender: 'female', employment_type: 'any' },
  })
  const selectedSkills = watch('skills') as number[]

  const toggleSkill = (id: number) => {
    setValue('skills', selectedSkills.includes(id) ? selectedSkills.filter((s) => s !== id) : [...selectedSkills, id])
  }

  const onSubmit = async (data: z.infer<typeof helperSchema>) => {
    setSubmitting(true)
    try {
      const res = await api.post<{ token: string; user: never }>('/auth/register/helper', data)
      setToken(res.token)
      toast.success('Account created! Welcome to the network.')
      onDone(res.user)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle className="text-2xl">Helper registration</CardTitle>
        <CardDescription>Your NIN is encrypted and never shown publicly. Only verification badges appear on your profile.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={errors.first_name?.message}>
              <Input {...register('first_name')} />
            </Field>
            <Field label="Last name" error={errors.last_name?.message}>
              <Input {...register('last_name')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register('email')} />
            </Field>
            <Field label="Phone (for OTP)" error={errors.phone?.message}>
              <Input placeholder="0812 000 0000" {...register('phone')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" error={errors.password?.message}>
              <Input type="password" {...register('password')} />
            </Field>
            <Field label="Confirm password" error={errors.password_confirmation?.message}>
              <Input type="password" {...register('password_confirmation')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date of birth" error={errors.date_of_birth?.message}>
              <Input type="date" {...register('date_of_birth')} />
            </Field>
            <Field label="Gender" error={errors.gender?.message}>
              <Select onValueChange={(v) => setValue('gender', v as never)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Years of experience" error={errors.years_experience?.message}>
              <Input type="number" min={0} {...register('years_experience')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="NIN (11 digits, private)" error={errors.nin?.message}>
              <Input inputMode="numeric" maxLength={11} {...register('nin')} />
            </Field>
            <Field label="Expected salary (₦/month, min)" error={errors.expected_salary_min?.message}>
              <Input type="number" min={0} {...register('expected_salary_min')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State" error={errors.state?.message}>
              <Select onValueChange={(v) => setValue('state', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {meta?.states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="City / Area" error={errors.city?.message}>
              <Input {...register('city')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Availability" error={errors.availability?.message}>
              <Select onValueChange={(v) => setValue('availability', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {meta?.availability.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Employment type">
              <Select onValueChange={(v) => setValue('employment_type', v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  {meta?.employment_types.filter((e) => e.value !== 'other').map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Skills" error={errors.skills?.message as string | undefined}>
            <div className="flex flex-wrap gap-2">
              {meta?.skills.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSkill(s.id)}
                  className={cn(
                    'cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                    selectedSkills.includes(s.id) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </Field>
          <Field label="About you (optional)">
            <Textarea rows={3} placeholder="Tell families about your experience…" {...register('bio')} />
          </Field>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Spinner label="Creating account…" /> : 'Create my profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
