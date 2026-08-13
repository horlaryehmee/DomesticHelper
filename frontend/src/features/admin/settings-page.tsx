import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Settings as SettingsIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'

interface Setting {
  id: number
  key: string
  value: string | null
  group: string
  label: string | null
}

export function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<{ data: Setting[] }>('/admin/settings'),
  })

  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: () =>
      api.put('/admin/settings', {
        settings: (data?.data ?? []).map((s) => ({ key: s.key, value: drafts[s.key] ?? s.value ?? '' })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Settings saved')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Failed to save'),
  })

  if (isLoading) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>

  const groups = (data?.data ?? []).reduce<Record<string, Setting[]>>((acc, s) => {
    ;(acc[s.group] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform configuration: fees, trust score base, security options.</p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <SettingsIcon /> Save all settings
        </Button>
      </div>

      {Object.entries(groups).map(([group, settings]) => (
        <Card key={group} className="gap-4">
          <CardHeader>
            <CardTitle className="text-base capitalize">{group}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {settings?.map((s) => (
              <div key={s.id} className="space-y-1.5">
                <Label>{s.label ?? s.key}</Label>
                <Input
                  defaultValue={s.value ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">{s.key}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
