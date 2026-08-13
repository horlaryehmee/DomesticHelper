import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Fingerprint, Camera, MapPin, Phone, Mail, BadgeCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

interface Verification {
  uuid: string
  type: string
  status: string
  verified_at: string | null
}

const STEPS = [
  { type: 'phone', label: 'Phone verification', icon: Phone, desc: 'Verify your phone number with an OTP.' },
  { type: 'email', label: 'Email verification', icon: Mail, desc: 'Confirm your email address.' },
  { type: 'photo', label: 'Photo verification', icon: Camera, desc: 'A verification officer confirms your photo matches your identity.' },
  { type: 'nin', label: 'NIN verification', icon: Fingerprint, desc: 'Your National ID is checked and stored encrypted.' },
  { type: 'address', label: 'Address verification', icon: MapPin, desc: 'Confirms your general location (never shown publicly).' },
]

export function HelperVerificationPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['my-verifications'],
    queryFn: () => api.get<{ data: Verification[] }>('/helpers/me/verifications'),
  })

  const request = useMutation({
    mutationFn: (type: string) => api.post(`/helpers/me/verifications/${type}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-verifications'] })
      toast.success('Verification request submitted. Our team will review it.')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not submit request'),
  })

  const verifications = data?.data ?? []
  const byType = Object.fromEntries(verifications.map((v) => [v.type, v]))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each badge on your public profile reflects a verification that actually happened.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="space-y-4">
          {STEPS.map((step) => {
            const v = byType[step.type]
            const isPhoneOrEmail = step.type === 'phone' || step.type === 'email'
            const isVerified = step.type === 'phone' ? user?.phone_verified : step.type === 'email' ? user?.email_verified : v?.status === 'approved'
            const isPending = v?.status === 'pending' || v?.status === 'rejected'
            return (
              <Card key={step.type} className="gap-4 py-5">
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className={`flex size-11 items-center justify-center rounded-lg ${isVerified ? 'bg-success/10' : 'bg-primary/10'}`}>
                      <step.icon className={`size-5 ${isVerified ? 'text-success' : 'text-primary'}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{step.label}</span>
                        {isVerified ? (
                          <Badge variant="success"><BadgeCheck className="size-3" /> Verified</Badge>
                        ) : v?.status === 'pending' ? (
                          <Badge variant="warning">Under review</Badge>
                        ) : v?.status === 'rejected' ? (
                          <Badge variant="destructive">Rejected. Request again</Badge>
                        ) : (
                          <Badge variant="outline">Not verified</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                    {!isVerified && !isPhoneOrEmail && (
                      <Button
                        size="sm"
                        variant={isPending ? 'outline' : 'default'}
                        onClick={() => request.mutate(step.type)}
                        disabled={request.isPending || v?.status === 'pending'}
                      >
                        {v?.status === 'pending' ? 'Awaiting review' : v?.status === 'rejected' ? 'Request again' : 'Request verification'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
