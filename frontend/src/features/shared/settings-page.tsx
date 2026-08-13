import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Enter your current password'),
  new_password: z.string().min(8, 'At least 8 characters'),
  new_password_confirmation: z.string(),
}).refine((d) => d.new_password === d.new_password_confirmation, { message: 'Passwords do not match', path: ['new_password_confirmation'] })

export function SettingsPage() {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(passwordSchema) })

  const changePassword = useMutation({
    mutationFn: (data: z.infer<typeof passwordSchema>) => api.post('/auth/password/change', data),
    onSuccess: () => {
      reset()
      toast.success('Password updated')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not update password'),
  })

  const sendOtp = useMutation({
    mutationFn: () => api.post('/auth/otp/send', { recipient: user?.phone, purpose: 'verify_phone' }),
    onSuccess: () => toast.success('Verification code sent to your phone'),
    onError: () => toast.error('Could not send code'),
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account security.</p>
      </div>

      <Card className="gap-5">
        <CardHeader>
          <CardTitle>Phone verification</CardTitle>
          <CardDescription>Your phone number: {user?.phone ?? 'not set'}</CardDescription>
        </CardHeader>
        <CardContent>
          {user?.phone_verified ? (
            <p className="text-sm text-success">✓ Your phone number is verified.</p>
          ) : (
            <Button variant="outline" onClick={() => sendOtp.mutate()} disabled={sendOtp.isPending}>
              Send verification code
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="gap-5">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Use a strong password you do not use elsewhere.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => { setSubmitting(true); changePassword.mutate(d, { onSettled: () => setSubmitting(false) }) })} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <Input type="password" {...register('current_password')} />
              {errors.current_password && <p className="text-xs text-destructive">{String(errors.current_password.message)}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input type="password" {...register('new_password')} />
              {errors.new_password && <p className="text-xs text-destructive">{String(errors.new_password.message)}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Confirm new password</Label>
              <Input type="password" {...register('new_password_confirmation')} />
              {errors.new_password_confirmation && <p className="text-xs text-destructive">{String(errors.new_password_confirmation.message)}</p>}
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner label="Updating…" /> : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="gap-5">
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Your NIN is encrypted and never displayed publicly.</p>
          <p>• Your exact address and phone number are never shown on public profiles.</p>
          <p>• Evidence you upload is stored on a private, access-controlled system.</p>
          <p>• Only verified and approved information appears on public profiles.</p>
        </CardContent>
      </Card>
    </div>
  )
}
