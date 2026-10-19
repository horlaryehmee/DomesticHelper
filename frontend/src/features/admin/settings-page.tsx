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
import { useAuth } from '@/lib/auth'

interface Setting {
  id: number
  key: string
  value: string | null
  group: string
  label: string | null
}

interface SmtpSettings {
  enabled: boolean
  host: string
  port: number
  scheme: 'smtp' | 'smtps'
  username: string
  password_set: boolean
  from_address: string
  from_name: string
}

export function AdminSettingsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.roles?.includes('super-admin') ?? false
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<{ data: Setting[] }>('/admin/settings'),
  })

  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [smtpDraft, setSmtpDraft] = useState<SmtpSettings | null>(null)
  const [smtpPassword, setSmtpPassword] = useState('')
  const [testRecipient, setTestRecipient] = useState('')
  const { data: smtpData } = useQuery({
    queryKey: ['smtp-settings'],
    queryFn: () => api.get<{ data: SmtpSettings }>('/admin/settings/smtp'),
    enabled: isSuperAdmin,
  })
  const smtp = smtpDraft ?? smtpData?.data

  const saveSmtp = useMutation({
    mutationFn: () => api.put<{ data: SmtpSettings }>('/admin/settings/smtp', { ...smtp, password: smtpPassword || undefined }),
    onSuccess: (result) => {
      setSmtpDraft(result.data)
      setSmtpPassword('')
      toast.success('SMTP settings saved')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save SMTP settings'),
  })
  const testSmtp = useMutation({
    mutationFn: () => api.post('/admin/settings/smtp/test', { recipient: testRecipient || user?.email }),
    onSuccess: () => toast.success('Test email sent'),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not send test email'),
  })

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

      {isSuperAdmin && smtp && <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-base">SMTP email</CardTitle>
          <p className="text-sm text-muted-foreground">Configure outgoing email for notifications and password resets. Only the master admin can change these settings.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={smtp.enabled} onChange={(event) => setSmtpDraft({ ...smtp, enabled: event.target.checked })} /> Enable SMTP
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="smtp-host">SMTP host</Label><Input id="smtp-host" value={smtp.host} onChange={(event) => setSmtpDraft({ ...smtp, host: event.target.value })} placeholder="mail.example.com" /></div>
            <div className="space-y-1.5"><Label htmlFor="smtp-port">Port</Label><Input id="smtp-port" type="number" min={1} max={65535} value={smtp.port} onChange={(event) => setSmtpDraft({ ...smtp, port: Number(event.target.value) })} /></div>
            <div className="space-y-1.5"><Label htmlFor="smtp-scheme">Connection</Label><select id="smtp-scheme" className="flex h-9 w-full rounded-md border bg-background px-3 text-sm" value={smtp.scheme} onChange={(event) => setSmtpDraft({ ...smtp, scheme: event.target.value as SmtpSettings['scheme'] })}><option value="smtp">SMTP / STARTTLS</option><option value="smtps">SMTPS / SSL</option></select></div>
            <div className="space-y-1.5"><Label htmlFor="smtp-user">Username</Label><Input id="smtp-user" value={smtp.username} onChange={(event) => setSmtpDraft({ ...smtp, username: event.target.value })} autoComplete="off" /></div>
            <div className="space-y-1.5"><Label htmlFor="smtp-password">Password</Label><Input id="smtp-password" type="password" value={smtpPassword} onChange={(event) => setSmtpPassword(event.target.value)} placeholder={smtp.password_set ? 'Saved; leave blank to keep it' : 'Enter SMTP password'} autoComplete="new-password" /></div>
            <div className="space-y-1.5"><Label htmlFor="smtp-from-email">From email</Label><Input id="smtp-from-email" type="email" value={smtp.from_address} onChange={(event) => setSmtpDraft({ ...smtp, from_address: event.target.value })} placeholder="info@hiresafe.ng" /></div>
            <div className="space-y-1.5"><Label htmlFor="smtp-from-name">From name</Label><Input id="smtp-from-name" value={smtp.from_name} onChange={(event) => setSmtpDraft({ ...smtp, from_name: event.target.value })} /></div>
          </div>
          <Button onClick={() => saveSmtp.mutate()} disabled={saveSmtp.isPending}>Save SMTP settings</Button>
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
            <Input type="email" aria-label="Test email recipient" placeholder={user?.email ?? 'Test recipient email'} value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} />
            <Button variant="outline" onClick={() => testSmtp.mutate()} disabled={!smtp.enabled || testSmtp.isPending}>Send test email</Button>
          </div>
        </CardContent>
      </Card>}
    </div>
  )
}
