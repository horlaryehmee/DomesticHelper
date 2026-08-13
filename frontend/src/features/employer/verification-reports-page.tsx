import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileCheck2, ExternalLink, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatDate, formatNaira } from '@/lib/format'
import { useQuery as useMeta } from '@tanstack/react-query'

interface Report {
  uuid: string
  status: string
  helper: { uuid: string; name: string }
  snapshot: {
    helper?: { name: string; city?: string; state?: string }
    trust_score?: { score: number; category: string }
    employment_history?: { job_role: string; start_date: string; end_date: string; location: string | null }[]
    reviews?: { rating: number; feedback: string; work_type: string | null }[]
    average_rating?: number
    verified_jobs_count?: number
    disclaimer?: string
  } | null
  generated_at: string | null
  created_at: string
}

interface Meta { verification_report_price: number; payment_provider: string }

export function VerificationReportsPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const helperUuid = params.get('helper')

  const { data, isLoading } = useQuery({
    queryKey: ['verification-reports'],
    queryFn: () => api.get<{ data: Report[] }>('/verification-reports'),
  })

  const { data: meta } = useMeta({ queryKey: ['meta'], queryFn: () => api.get<Meta>('/meta') })

  const purchase = useMutation({
    mutationFn: (uuid: string) => api.post<{ data: { authorization_url: string } }>('/verification-reports', { helper_uuid: uuid }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['verification-reports'] })
      window.location.href = res.data.authorization_url
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not start purchase'),
  })

  const price = meta?.verification_report_price ?? 5000

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Verification reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Deep-dive reports on shortlisted helpers — {formatNaira(price)} each, generated after verified payment.
          </p>
        </div>
        {helperUuid && (
          <Button onClick={() => purchase.mutate(helperUuid)} disabled={purchase.isPending}>
            <FileCheck2 /> Purchase report ({formatNaira(price)})
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (data?.data.length ?? 0) === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="No verification reports yet"
          description="Open a helper profile and choose “Request Verification Report” to purchase one."
          action={helperUuid ? undefined : <Button onClick={() => navigate('/search')}>Find helpers</Button>}
        />
      ) : (
        <div className="space-y-4">
          {data?.data.map((r) => (
            <Card key={r.uuid} className="gap-3 py-5">
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.helper.name}</span>
                      <Badge variant={r.status === 'generated' ? 'success' : r.status === 'paid' ? 'secondary' : 'warning'}>
                        {r.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Requested {formatDate(r.created_at)}
                      {r.generated_at && ` · Generated ${formatDate(r.generated_at)}`}
                    </div>
                    {r.snapshot && (
                      <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                        <span>Trust score: <strong>{r.snapshot.trust_score?.score}</strong> ({r.snapshot.trust_score?.category})</span>
                        <span>Average rating: <strong>{r.snapshot.average_rating ?? 0}</strong> · {r.snapshot.verified_jobs_count ?? 0} verified jobs</span>
                      </div>
                    )}
                  </div>
                  {r.status === 'generated' ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/verification-reports/${r.uuid}`} target="_blank" rel="noreferrer">
                        <ExternalLink /> Open report
                      </a>
                    </Button>
                  ) : r.status === 'pending_payment' ? (
                    <Button size="sm" variant="outline" onClick={() => purchase.mutate(r.helper.uuid)}>
                      Complete payment
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      <Download /> Generating…
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
