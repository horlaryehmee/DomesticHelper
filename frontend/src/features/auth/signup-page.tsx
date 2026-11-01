import { GoogleSignInButton } from './google-sign-in'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AuthSectionOne from '@/components/ui/auth-section-1'
import type { InputHTMLAttributes } from 'react'
import { Label } from '@/components/ui/label'
import { api, ApiError, setToken } from '@/lib/api'
import { useAuth, accountPath, type AuthUser } from '@/lib/auth'

export function RegisterPage() {
 const { user, setUser } = useAuth()
 const navigate = useNavigate()
 const [userType, setUserType] = useState<'employer' | 'helper'>('employer')
 const [termsAccepted, setTermsAccepted] = useState(false)
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 if (user) return <Navigate to={accountPath(user)} replace />
 async function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); setBusy(true); setError('')
  try {
   const data = Object.fromEntries(new FormData(event.currentTarget))
   if (data.password !== data.password_confirmation) { setError('Passwords do not match.'); return }
   const result = await api.post<{token:string;user:AuthUser;verification_email_sent:boolean}>('/auth/signup', data)
   setToken(result.token); setUser(result.user); navigate('/verify-email', { state: { emailSent: result.verification_email_sent } })
  } catch(e) { setError(e instanceof ApiError ? e.message : 'Could not create account. Try again.') }
  finally { setBusy(false) }
 }
 return (
  <AuthSectionOne>
   <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
    <div className="space-y-2">
     <Label htmlFor="user_type" className="text-black/70 dark:text-white/70">I am joining as</Label>
     <select id="user_type" name="user_type" value={userType} onChange={e => setUserType(e.target.value as 'employer' | 'helper')} className="h-12 w-full rounded-[10px] border border-black/25 bg-white px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/20 dark:bg-[#0a0a0a]" required>
      <option value="employer">An employer looking to hire</option>
      <option value="helper">A domestic helper looking for work</option>
     </select>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
     <SignupField label="First name" name="first_name" autoComplete="given-name" maxLength={60} />
     <SignupField label="Last name" name="last_name" autoComplete="family-name" maxLength={60} />
    </div>
    <SignupField label="Email address" name="email" type="email" autoComplete="email" maxLength={120} />
    <SignupField label="Phone number" name="phone" type="tel" autoComplete="tel" pattern="[+]?[0-9]{10,15}" title="Enter 10 to 15 digits, with an optional leading +" />
    <SignupField label="Password" name="password" type="password" autoComplete="new-password" minLength={8} />
    <SignupField label="Confirm password" name="password_confirmation" type="password" autoComplete="new-password" minLength={8} />
    <p className="text-xs text-black/55 dark:text-white/55">Use at least 8 characters for your password.</p>
    <label className="flex items-start gap-3 pt-2 text-sm leading-5 text-black/60 dark:text-white/60">
     <input type="checkbox" required name="accept_terms" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="mt-1 size-4 shrink-0 accent-black dark:accent-white" />
     <span>I agree to the <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">Terms of Service</Link> and <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">Privacy Policy</Link>.</span>
    </label>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</p>}
    <button type="submit" disabled={busy} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-[10px] border border-black/40 bg-black px-4 text-lg font-medium text-white transition-colors hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60 dark:border-white/40 dark:bg-white dark:text-black dark:hover:bg-white/85">{busy ? 'Creating account...' : 'Create account'}</button>
    <GoogleSignInButton intent="register" userType={userType} termsAccepted={termsAccepted} />
    <p className="text-center text-xs leading-5 text-black/50 dark:text-white/50">Next: verify your email and complete onboarding.<br />Your dashboard opens after admin approval.</p>
   </form>
  </AuthSectionOne>
 )
}

function SignupField({ label, name, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
 return <div className="relative">
  <input {...props} id={name} name={name} placeholder=" " required className="peer h-14 w-full rounded-[10px] border border-black/25 bg-white px-4 pt-5 pb-1 text-base text-black outline-none transition-colors focus:border-black focus:ring-1 focus:ring-black dark:border-white/20 dark:bg-white/5 dark:text-white dark:focus:border-white dark:focus:ring-white" />
  <label htmlFor={name} className="pointer-events-none absolute top-1 left-4 text-[11px] text-black/55 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-[11px] dark:text-white/55">{label}</label>
 </div>
}

export function ConfirmDetailsPage() {
 const { user, setUser } = useAuth(); const [error,setError]=useState(''); const [busy,setBusy]=useState(false)
 if (!user) return <Navigate to="/register" replace/>
 if (!user.email_verified) return <Navigate to="/verify-email" replace/>
 if (user.details_confirmed || user.approval_status === 'approved') return <Navigate to={accountPath(user)} replace/>
 async function confirm() { setBusy(true); try { const res=await api.post<{user:AuthUser}>('/onboarding/confirm',{confirmed:true}); setUser(res.user) } catch(e) {setError(e instanceof ApiError ? e.message : 'Could not confirm details.')} finally {setBusy(false)} }
 return <div className="mx-auto my-16 max-w-lg space-y-6 rounded-xl border bg-card p-8"><ShieldCheck className="size-10 text-primary"/><h1 className="text-2xl font-bold">Confirm your details</h1><p>Check your account details before continuing to onboarding.</p><dl className="space-y-2"><dt className="text-muted-foreground">Full name</dt><dd>{user.name}</dd><dt className="text-muted-foreground">Email</dt><dd>{user.email}</dd><dt className="text-muted-foreground">Phone</dt><dd>{user.phone}</dd><dt className="text-muted-foreground">Account type</dt><dd>{user.user_type}</dd></dl><p className="text-sm text-muted-foreground">Confirming these details does not verify your identity. Your onboarding documents will be reviewed by an administrator.</p>{error && <p role="alert">{error}</p>}<Button onClick={confirm} disabled={busy}>Confirm and continue</Button></div>
}
export function ApprovalPendingPage() {
 const {user,setUser,logout}=useAuth()
 const {isFetching,refetch,error}=useQuery({queryKey:['approval-status'],queryFn:async()=>{const res=await api.get<{user:AuthUser}>('/auth/me');setUser(res.user);return res.user},enabled:!!user,refetchInterval:15000})
 if (!user) return <Navigate to="/login" replace/>
 if (user.approval_status !== 'pending') return <Navigate to={accountPath(user)} replace/>
 return <div className="mx-auto my-20 max-w-lg space-y-5 rounded-xl border p-8 text-center"><ShieldCheck className="mx-auto size-12 text-primary"/><h1 className="text-2xl font-bold">Your account is under review</h1><p className="text-muted-foreground">Your onboarding and verification details have been sent to the admin. Your dashboard will become available once your account is approved.</p>{error && <p role="alert">Could not check your approval status. Please try again.</p>}<Button disabled={isFetching} onClick={()=>refetch()}>Check approval status</Button><Button variant="ghost" onClick={()=>logout()}>Sign out</Button></div>
}

export function VerifyEmailPage() {
 const {user,setUser,logout}=useAuth()
 const location=useLocation()
 const [code,setCode]=useState('')
 const [busy,setBusy]=useState(false)
 const [sending,setSending]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState((location.state as {emailSent?:boolean}|null)?.emailSent === false ? 'Your account was created, but the email could not be sent. Please request a code below.' : 'Use the 6-digit code sent to your email. Codes expire after 10 minutes.')
 if (!user) return <Navigate to="/login" replace />
 if (user.email_verified) return <Navigate to={accountPath(user)} replace />
 async function verify(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();setBusy(true);setError('')
  try { const result=await api.post<{user:AuthUser}>('/auth/email/verify',{code});setUser(result.user) }
  catch(e){setError(e instanceof ApiError?e.message:'Could not verify your email. Please try again.')}
  finally{setBusy(false)}
 }
 async function resend(){setSending(true);setError('');setMessage('');try {await api.post('/auth/email/send');setMessage('A new code has been sent. Check your inbox and spam folder. Only the latest code will work.')}catch(e){setError(e instanceof ApiError?e.message:'Could not send the code. Please try again.')}finally{setSending(false)}}
 return <AuthSectionOne mode="verify"><div className="space-y-6"><p className="leading-relaxed text-black/65 dark:text-white/65">Confirm that you can access <strong className="break-all text-black dark:text-white">{user.email}</strong> before continuing to onboarding.</p>{message && <p role="status" className="rounded-lg border p-4 text-sm leading-6">{message}</p>}<form onSubmit={verify} className="space-y-5"><div className="space-y-2"><Label htmlFor="email-code">Email verification code</Label><input id="email-code" name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} minLength={6} required value={code} onChange={event=>setCode(event.target.value.replace(/[^0-9]/g,''))} className="h-14 w-full rounded-[10px] border border-black/25 bg-transparent px-4 text-center text-2xl tracking-[0.4em] outline-none focus:ring-2 dark:border-white/25"/></div>{error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}<button type="submit" disabled={busy || sending} className="h-12 w-full rounded-[10px] bg-black px-4 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black">{busy?'Verifying...':'Verify email and continue'}</button></form><div className="flex flex-wrap items-center justify-between gap-4 text-sm"><button type="button" disabled={sending||busy} onClick={resend} className="font-medium underline underline-offset-4 disabled:opacity-50">{sending?'Sending...':'Resend verification code'}</button><button type="button" onClick={()=>logout()} className="text-black/60 underline dark:text-white/60">Sign out</button></div><p className="text-xs leading-5 text-black/50 dark:text-white/50">Check your spam folder if the email is missing. For help with an incorrect email address, <Link to="/contact" className="underline">contact us</Link>.</p></div></AuthSectionOne>
}
