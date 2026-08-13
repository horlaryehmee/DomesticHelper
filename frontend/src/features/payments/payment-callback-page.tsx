import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle2, XCircle, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { api, ApiError } from '@/lib/api'
import { formatNaira } from '@/lib/format'
import { useAuth } from '@/lib/auth'

/**
 * Post-checkout page. The real confirmation happens server-side via the
 * provider API — the UI only displays the verified result.
 */
export function PaymentCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const paymentUuid = params.get('payment')
  const reference = params.get('reference') ?? params.get('trxref')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<null | { status: string; amount: number }>(null)

  const { data: payment } = useQuery({
    queryKey: ['payment', paymentUuid],
    queryFn: () => api.get<{ data: { uuid: string; status: string; amount: number } }>(`/payments/${paymentUuid}`),
    enabled: !!paymentUuid,
  })

  const verifyMutation = useMutation<{ data: { status: string; amount: number } }, Error, void>({
    mutationFn: () => api.post<{ data: { status: string; amount: number } }>(`/payments/${paymentUuid}/verify`),
    onSuccess: (res: { data: { status: string; amount: number } }) => setResult(res.data),
    onError: (e) => {
      setResult(null)
      console.error(e instanceof ApiError ? e.message : 'verification failed')
    },
  })

  useEffect(() => {
    if (!paymentUuid) return
    setVerifying(true)
    verifyMutation.mutate(undefined, { onSettled: () => setVerifying(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentUuid, reference])

  const status = result?.status ?? payment?.data.status
  const success = status === 'successful' || status === 'generated'

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md gap-5">
        <CardHeader className="items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted">
            {verifying ? <Spinner className="size-6" /> : success ? <CheckCircle2 className="size-8 text-success" /> : <XCircle className="size-8 text-destructive" />}
          </span>
          <CardTitle className="text-xl">
            {verifying ? 'Verifying your payment…' : success ? 'Payment successful' : 'Payment not confirmed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="size-4" />
              {result || payment?.data ? `Amount: ${formatNaira((result?.amount ?? payment?.data.amount) as number)}` : 'Checking transaction with the provider…'}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {success
              ? 'Your verification report is now available in your dashboard.'
              : 'If you completed the payment, give it a moment. Confirmation comes from the payment provider, never from this page.'}
          </p>
          <div className="flex gap-2">
            {success && user?.user_type === 'employer' && (
              <Button className="flex-1" onClick={() => navigate('/employer/verification-reports')}>View my reports</Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>Back to home</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
