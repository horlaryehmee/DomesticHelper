import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface Meta { states: string[] }

export function EmployerProfilePage() {
  const { user, setUser } = useAuth()
  const queryClient = useQueryClient()
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api.get<Meta>('/meta') })

  const { register, handleSubmit, watch, setValue, formState: { isDirty } } = useForm({
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      phone: user?.phone ?? '',
      profile_type: user?.employer_profile?.profile_type ?? 'individual',
      agency_name: user?.employer_profile?.agency_name ?? '',
      city: user?.employer_profile?.city ?? '',
      state: user?.employer_profile?.state ?? '',
      bio: user?.employer_profile?.bio ?? '',
    },
  })

  const profileType = watch('profile_type')

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put<{ data: typeof user }>('/employers/profile', data),
    onSuccess: (res) => {
      setUser(res.data as never)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Profile updated')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not update profile'),
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employer profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">This information helps helpers know who they are working with.</p>
      </div>

      <Card className="gap-5">
        <CardHeader>
          <CardTitle>Basic details</CardTitle>
          <CardDescription>Household or agency information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => save.mutate({ ...d, agency_name: d.profile_type === 'agency' ? d.agency_name : null }))} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>First name</Label>
                <Input {...register('first_name')} />
              </div>
              <div className="space-y-1.5">
                <Label>Last name</Label>
                <Input {...register('last_name')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...register('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>Profile type</Label>
                <div className="flex gap-2">
                  {(['individual', 'agency'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setValue('profile_type', t, { shouldDirty: true })}
                      className={cn(
                        'flex-1 cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                        profileType === t ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
                      )}
                    >
                      {t === 'individual' ? 'Individual' : 'Agency'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {profileType === 'agency' && (
              <div className="space-y-1.5">
                <Label>Agency name</Label>
                <Input {...register('agency_name')} />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select value={watch('state') ?? ''} onValueChange={(v: string) => setValue('state', v as never, { shouldDirty: true })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {meta?.states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>City / Area</Label>
                <Input {...register('city')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>About your household / agency</Label>
              <Textarea rows={3} {...register('bio')} />
            </div>
            <Button type="submit" disabled={!isDirty || save.isPending}>
              {save.isPending ? <Spinner label="Saving…" /> : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
