import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Eye, EyeOff, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface Meta { skills: { id: number; name: string }[]; states: string[]; availability: { value: string; label: string }[] }

export function HelperProfileEditPage() {
  const { user, setUser } = useAuth()
  const queryClient = useQueryClient()
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: () => api.get<Meta>('/meta') })

  const hp = user?.helper_profile

  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      phone: user?.phone ?? '',
      date_of_birth: '',
      gender: 'female',
      state: hp?.state ?? '',
      city: hp?.city ?? '',
      years_experience: 0,
      expected_salary_min: 0,
      bio: '',
    },
  })

  const [skills, setSkills] = useState<number[]>([])
  const [isPublic, setIsPublic] = useState(hp?.is_public ?? true)

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put<{ data: typeof user }>('/helpers/me', data),
    onSuccess: (res) => {
      setUser(res.data as never)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Profile updated')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not update profile'),
  })

  const togglePublic = useMutation<{ data: { is_public: boolean } }, Error, void>({
    mutationFn: () => api.post<{ data: { is_public: boolean } }>('/helpers/me/publish'),
    onSuccess: (res: { data: { is_public: boolean } }) => {
      setIsPublic(res.data.is_public)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(res.data.is_public ? 'Profile is now public' : 'Profile hidden from search')
    },
  })

  const toggleSkill = (id: number) => setSkills((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Keep it accurate. Only verified information appears publicly.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
          {isPublic ? <Eye className="size-4 text-success" /> : <EyeOff className="size-4 text-muted-foreground" />}
          <div className="text-sm">
            <div className="font-medium">{isPublic ? 'Visible in search' : 'Hidden from search'}</div>
          </div>
          <Switch checked={isPublic} onCheckedChange={() => togglePublic.mutate()} />
        </div>
      </div>

      <Card className="gap-5">
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
          <CardDescription>Your NIN and exact address are private, never shown publicly.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((d) =>
              save.mutate({ ...d, skills: skills.length ? skills : undefined }),
            )}
            className="space-y-4"
          >
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
                <Label>Date of birth</Label>
                <Input type="date" {...register('date_of_birth')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select onValueChange={(v) => setValue('gender', v as never)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Years of experience</Label>
                <Input type="number" min={0} {...register('years_experience')} />
              </div>
              <div className="space-y-1.5">
                <Label>Expected salary (₦/mo)</Label>
                <Input type="number" min={0} {...register('expected_salary_min')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select onValueChange={(v) => setValue('state', v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {meta?.states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>City / Area (public)</Label>
                <Input {...register('city')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Skills</Label>
              <div className="flex flex-wrap gap-2">
                {meta?.skills.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSkill(s.id)}
                    className={cn(
                      'cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      skills.includes(s.id) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>About you</Label>
              <Textarea rows={4} {...register('bio')} />
            </div>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Spinner label="Saving…" /> : <><Save /> Save changes</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
