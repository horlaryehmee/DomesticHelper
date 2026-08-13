import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { api, ApiError } from '@/lib/api'

const requestSchema = z.object({ recipient: z.string().min(3, 'Enter your email or phone') })

const resetSchema = z
  .object({
    recipient: z.string().min(3),
    code: z.string().regex(/^\d{6}$/, '6-digit code'),
    password: z.string().min(8, 'At least 8 characters'),
    password_confirmation: z.string(),
  })
  .refine((d) => d.password === d.password_confirmation, { message: 'Passwords do not match', path: ['password_confirmation'] })

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [submitting, setSubmitting] = useState(false)
  const [recipient, setRecipient] = useState('')

  const requestForm = useForm({ resolver: zodResolver(requestSchema) })
  const resetForm = useForm({ resolver: zodResolver(resetSchema) })

  const requestCode = async (data: { recipient: string }) => {
    setSubmitting(true)
    try {
      await api.post('/auth/password/forgot', { recipient: data.recipient })
      setRecipient(data.recipient)
      setStep('reset')
      toast.success('If an account exists with this contact, a reset code has been sent.')
    } catch {
      toast.error('Could not send reset code.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetPassword = async (data: z.infer<typeof resetSchema>) => {
    setSubmitting(true)
    try {
      await api.post('/auth/password/reset', data)
      toast.success('Password updated. You can now log in.')
      navigate('/login')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Reset failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md gap-5">
        <CardHeader className="items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </span>
          <CardTitle className="text-2xl">{step === 'request' ? 'Reset your password' : 'Enter the code'}</CardTitle>
          <CardDescription>
            {step === 'request' ? 'We will send a verification code to your email or phone.' : 'Enter the 6-digit code and choose a new password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'request' ? (
            <form onSubmit={requestForm.handleSubmit(requestCode)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email or phone number</Label>
                <Input {...requestForm.register('recipient')} />
                {requestForm.formState.errors.recipient && (
                  <p className="text-xs text-destructive">{String(requestForm.formState.errors.recipient.message)}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Spinner /> : 'Send code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={resetForm.handleSubmit(resetPassword)} className="space-y-4">
              <input type="hidden" value={recipient} {...resetForm.register('recipient')} />
              <div className="space-y-1.5">
                <Label>Verification code</Label>
                <Input inputMode="numeric" maxLength={6} placeholder="123456" {...resetForm.register('code')} />
                {resetForm.formState.errors.code && (
                  <p className="text-xs text-destructive">{String(resetForm.formState.errors.code.message)}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>New password</Label>
                <Input type="password" {...resetForm.register('password')} />
                {resetForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{String(resetForm.formState.errors.password.message)}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Confirm new password</Label>
                <Input type="password" {...resetForm.register('password_confirmation')} />
                {resetForm.formState.errors.password_confirmation && (
                  <p className="text-xs text-destructive">{String(resetForm.formState.errors.password_confirmation.message)}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Spinner /> : 'Reset password'}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Remembered it?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
