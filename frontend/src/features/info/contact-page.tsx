import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const audiences = [
  { value: 'employer', title: 'I need to hire', detail: 'Finding helpers, posting jobs, or managing an employer account' },
  { value: 'helper', title: 'I am looking for work', detail: 'Profiles, job applications, or verification' },
  { value: 'visitor', title: 'I have a general question', detail: 'Using the platform, privacy, or safety' },
  { value: 'business', title: 'I represent an organisation', detail: 'Partnerships and business enquiries' },
] as const

const topics = [
  { value: 'hiring', label: 'Finding or hiring a helper' },
  { value: 'jobs', label: 'Jobs and applications' },
  { value: 'account', label: 'Account or login' },
  { value: 'verification', label: 'Identity or employment verification' },
  { value: 'payment', label: 'Payments or reports' },
  { value: 'safety', label: 'Safety concern or dispute' },
  { value: 'privacy', label: 'Privacy or my personal data' },
  { value: 'partnership', label: 'Partnership or media' },
  { value: 'other', label: 'Something else' },
] as const

type Audience = typeof audiences[number]['value']
type Topic = typeof topics[number]['value']

export function ContactPage() {
  const [step, setStep] = useState(1)
  const [audience, setAudience] = useState<Audience | ''>('')
  const [topic, setTopic] = useState<Topic | ''>('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '', website: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!audience || !topic) return
    setSending(true)
    setError('')
    try {
      const result = await api.post<{ reference: string }>('/contact', { ...form, audience, topic })
      setReference(result.reference)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'We could not send your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return <div className="mx-auto max-w-4xl px-4 py-12 sm:py-20">
    <div className="mb-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Contact Hire Safe</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">How can we help?</h1>
      <p className="mt-3 text-muted-foreground">Tell us what you need, then send the right details to our team.</p>
    </div>

    {reference ? <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      <CheckCircle2 className="mx-auto size-12 text-primary" />
      <h2 className="mt-4 text-2xl font-semibold">Message received</h2>
      <p className="mt-2 text-muted-foreground">Your reference is <strong>{reference}</strong>. Keep it if you need to follow up.</p>
      <Button asChild className="mt-6"><Link to="/">Back to home</Link></Button>
    </div> : <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
      <div className="mb-8 flex items-center gap-2 text-xs font-medium sm:text-sm">
        {['Who are you?', 'What do you need?', 'Your message'].map((label, index) => <div key={label} className={`flex-1 rounded-full px-2 py-2 text-center ${step === index + 1 ? 'bg-primary text-primary-foreground' : step > index + 1 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{index + 1}. {label}</div>)}
      </div>

      {step === 1 && <section>
        <h2 className="text-xl font-semibold">Which describes you?</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{audiences.map((item) => <button key={item.value} type="button" onClick={() => { setAudience(item.value); setStep(2) }} className="rounded-xl border p-5 text-left transition hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">
          <strong className="block text-base">{item.title}</strong><span className="mt-1 block text-sm text-muted-foreground">{item.detail}</span>
        </button>)}</div>
      </section>}

      {step === 2 && <section>
        <h2 className="text-xl font-semibold">What is your question about?</h2>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">{topics.map((item) => <button key={item.value} type="button" onClick={() => { setTopic(item.value); setStep(3) }} className="flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">{item.label}<ArrowRight className="size-4 shrink-0 text-primary" /></button>)}</div>
        <Button className="mt-6" variant="ghost" onClick={() => setStep(1)}><ArrowLeft /> Back</Button>
      </section>}

      {step === 3 && <form onSubmit={submit} className="space-y-5">
        <div><h2 className="text-xl font-semibold">Tell us a little more</h2><p className="mt-1 text-sm text-muted-foreground">We will use these details to reply to your enquiry.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="contact-name">Name</Label><Input id="contact-name" required minLength={2} maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="contact-email">Email</Label><Input id="contact-email" type="email" required maxLength={255} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="contact-phone">Phone (optional)</Label><Input id="contact-phone" type="tel" maxLength={30} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="contact-subject">Subject</Label><Input id="contact-subject" required minLength={3} maxLength={160} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="contact-message">Message</Label><Textarea id="contact-message" required minLength={15} maxLength={5000} rows={6} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Describe what happened or what you would like to know." /></div>
        <div className="hidden" aria-hidden="true"><Label htmlFor="contact-website">Website</Label><Input id="contact-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
        <p className="text-xs text-muted-foreground">By sending this form, you agree that we can use your details to respond. See our <Link className="text-primary underline" to="/privacy">Privacy Policy</Link>.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-between"><Button type="button" variant="ghost" onClick={() => setStep(2)}><ArrowLeft /> Back</Button><Button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send message'} <Mail /></Button></div>
      </form>}
    </div>}
    <p className="mt-6 text-center text-sm text-muted-foreground">For an immediate safety concern, contact the relevant local emergency service first.</p>
  </div>
}
