import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, ExternalLink, RotateCw, Settings as SettingsIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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

interface DemoStatus { users: number; helpers: number; employers: number; jobs: number }
interface ComingSoonSettings { enabled: boolean; preview_token: string }

export function AdminSettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<{ data: Setting[] }>('/admin/settings'),
  })
  const { data: comingSoonData, isLoading: comingSoonLoading, isError: comingSoonError } = useQuery({
    queryKey: ['coming-soon-settings'],
    queryFn: () => api.get<{ data: ComingSoonSettings }>('/admin/coming-soon'),
  })
  const updateComingSoon = useMutation({
    mutationFn: (enabled: boolean) => api.put<{ data: ComingSoonSettings }>('/admin/coming-soon', { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coming-soon-settings'] })
      queryClient.invalidateQueries({ queryKey: ['site-status'] })
      toast.success('Coming soon setting saved')
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not update coming soon'),
  })
  const rotatePreviewLink = useMutation({
    mutationFn: () => api.post('/admin/coming-soon/rotate-preview-link'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coming-soon-settings'] })
      toast.success('Preview link regenerated')
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not regenerate preview link'),
  })

  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [smtpDraft, setSmtpDraft] = useState<SmtpSettings | null>(null)
  const [smtpPassword, setSmtpPassword] = useState('')
  const [testRecipient, setTestRecipient] = useState('')
  const [clearConfirmation, setClearConfirmation] = useState('')
  const { data: smtpData, isLoading: smtpLoading, isError: smtpError } = useQuery({
    queryKey: ['smtp-settings'],
    queryFn: () => api.get<{ data: SmtpSettings }>('/admin/settings/smtp'),
    enabled: user?.user_type === 'admin',
  })
  const smtp = smtpDraft ?? smtpData?.data
  const { data: demoData, isError: demoError } = useQuery({
    queryKey: ['demo-status'],
    queryFn: () => api.get<{ data: DemoStatus }>('/admin/demo'),
    enabled: user?.user_type === 'admin',
  })
  const fillDemo = useMutation({
    mutationFn: () => api.post('/admin/demo/fill'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['demo-status'] }); toast.success('Demo data added') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not add demo data'),
  })
  const clearDemo = useMutation({
    mutationFn: () => api.post('/admin/demo/clear', { confirmation: clearConfirmation }),
    onSuccess: () => { setClearConfirmation(''); queryClient.invalidateQueries({ queryKey: ['demo-status'] }); toast.success('Demo data removed') },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not clear demo data'),
  })

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
  const previewUrl = comingSoonData?.data.preview_token
    ? `${window.location.origin}/#preview=${comingSoonData.data.preview_token}`
    : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Site visibility, platform settings, SMTP email and demo data.</p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <SettingsIcon /> Save all settings
        </Button>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-base">Coming soon page</CardTitle>
          <p className="text-sm text-muted-foreground">Show visitors a launch page while you prepare the site. Admin accounts and anyone with the preview link can still view the full site.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {comingSoonLoading && <Skeleton className="h-12 w-full" />}
          {comingSoonError && <p className="text-sm text-destructive">Could not load the coming soon setting.</p>}
          {comingSoonData && <>
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4">
              <div><Label htmlFor="coming-soon-toggle" className="text-sm font-semibold">Enable coming soon page</Label><p className="mt-1 text-xs text-muted-foreground">{comingSoonData.data.enabled ? 'Visitors currently see the coming soon page.' : 'Visitors currently see the full site.'}</p></div>
              <Switch id="coming-soon-toggle" checked={comingSoonData.data.enabled} disabled={updateComingSoon.isPending} onCheckedChange={(enabled) => updateComingSoon.mutate(enabled)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coming-soon-preview-link">Full-site preview link</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="coming-soon-preview-link" value={previewUrl} readOnly onFocus={(event) => event.currentTarget.select()} className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(previewUrl); toast.success('Preview link copied') } catch { toast.error('Copy failed; select the link in the field') } }}><Copy /> Copy link</Button>
                <Button type="button" variant="outline" asChild><a href={previewUrl} target="_blank" rel="noopener noreferrer"><ExternalLink /> Open</a></Button>
              </div>
              <p className="text-xs text-muted-foreground">Share this link only with people you want to preview the site. Regenerating it disables the old link.</p>
            </div>
            <Button type="button" variant="outline" disabled={rotatePreviewLink.isPending} onClick={() => rotatePreviewLink.mutate()}><RotateCw /> Regenerate preview link</Button>
          </>}
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-base">SMTP email</CardTitle>
          <p className="text-sm text-muted-foreground">Configure outgoing email for notifications and password resets. Only the master admin can change these settings.</p>
        </CardHeader>
        {smtpLoading && <CardContent><p className="text-sm text-muted-foreground">Loading SMTP settings…</p></CardContent>}
        {smtpError && <CardContent><p className="text-sm text-destructive">SMTP settings are available only to an account with the super-admin role. Log out and back in if your access was just updated.</p></CardContent>}
        {smtp && <CardContent className="space-y-4">
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
        </CardContent>}
      </Card>

      {!demoError && demoData && <Card className="gap-4">
        <CardHeader>
          <CardTitle className="text-base">Demo data</CardTitle>
          <p className="text-sm text-muted-foreground">Add sample helpers, an employer and a job to preview the site. Clear demo removes tagged samples and the older seeded demo accounts. Real users and platform settings stay in place.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">Current demo data: {demoData.data.users} users, {demoData.data.helpers} helpers, {demoData.data.employers} employers, {demoData.data.jobs} jobs.</p>
          <Button variant="outline" onClick={() => fillDemo.mutate()} disabled={fillDemo.isPending || demoData.data.users > 0}>Fill demo</Button>
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="clear-demo">Type CLEAR DEMO to remove demo accounts and their content</Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input id="clear-demo" value={clearConfirmation} onChange={(event) => setClearConfirmation(event.target.value)} placeholder="CLEAR DEMO" />
              <Button variant="destructive" onClick={() => clearDemo.mutate()} disabled={clearDemo.isPending || clearConfirmation !== 'CLEAR DEMO' || demoData.data.users === 0}>Clear all demo</Button>
            </div>
          </div>
        </CardContent>
      </Card>}

      {Object.entries(groups).map(([group, settings]) => (
        <Card key={group} className="gap-4">
          <CardHeader><CardTitle className="text-base capitalize">{group}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {settings?.map((s) => (
              <div key={s.id} className="space-y-1.5">
                <Label>{s.label ?? s.key}</Label>
                <Input defaultValue={s.value ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))} />
                <p className="text-xs text-muted-foreground">{s.key}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
