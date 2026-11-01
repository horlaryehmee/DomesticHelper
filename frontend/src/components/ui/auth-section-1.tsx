import { GrainGradient } from '@paper-design/shaders-react'
import { Component, useEffect, useState, type ReactNode } from 'react'
import { FeatureLink as Link } from '@/components/feature-link'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { LogoMark } from '@/components/logo'

/** Split-screen authentication surface adapted from the supplied AuthSectionOne. */
export default function AuthSectionOne({ children, mode = 'register' }: { children: ReactNode; mode?: 'register' | 'login' | 'verify' }) {
  return (
    <main className="min-h-screen bg-white p-3 text-black antialiased dark:bg-[#050505] dark:text-white">
      <div className="grid min-h-[calc(100svh-1.5rem)] gap-3 lg:grid-cols-[0.94fr_1.06fr] lg:gap-6">
        <section className="flex items-start rounded-md border border-black/20 bg-white px-6 py-8 sm:px-10 dark:border-white/10 dark:bg-[#0a0a0a] lg:px-12 lg:py-12 xl:px-20">
          <div className="mx-auto w-full max-w-[590px]">
            <Link to="/" aria-label="Hire Safe home" className="mb-10 inline-flex rounded focus-visible:outline-2 focus-visible:outline-offset-4"><LogoMark className="h-9" /></Link>
            <h1 className="text-3xl font-medium tracking-[-0.04em] sm:text-4xl xl:text-[50px] xl:leading-[1.05]">{mode === 'verify' ? 'Verify your email' : mode === 'login' ? 'Welcome back' : 'Create an account'}</h1>
            <p className="mt-3 text-lg leading-snug text-black/60 dark:text-white/55 sm:text-xl">{mode === 'verify' ? 'One more step before onboarding.' : mode === 'login' ? 'Sign in to your Hire Safe account.' : 'Your next chapter starts with trust.'}</p>
            <div className="mt-8">{children}</div>
            <p className="mt-7 text-sm text-black/60 dark:text-white/55">{mode === 'login' ? 'New to Hire Safe?' : 'Already have an account?'} <Link to={mode === 'login' ? '/register' : '/login'} className="font-semibold text-black underline underline-offset-4 dark:text-white">{mode === 'login' ? 'Create an account' : 'Sign in'}</Link></p>
          </div>
        </section>
        <aside className="relative flex min-h-[360px] overflow-hidden rounded-md bg-black p-8 text-white sm:min-h-[440px] sm:p-12 lg:min-h-0">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,#fc7819_0%,#8c3210_35%,#000_75%)]">
            <GradientBoundary><AnimatedGrain /></GradientBoundary>
          </div>
          <div className="relative z-10 flex w-full flex-col justify-between gap-20">
            <div><p className="mb-8 flex items-center gap-2 text-sm font-medium text-white/80"><ShieldCheck className="size-5" /> A network built on trust</p><h2 className="max-w-[620px] text-5xl font-medium tracking-[-0.05em] sm:text-6xl lg:pt-10 lg:text-[64px] lg:leading-[0.98] xl:text-[76px]">Hire safely.<br />Work confidently.</h2><p className="mt-6 max-w-sm text-base leading-relaxed text-white/75">Connect with families and domestic helpers through verified identities and a trusted hiring community.</p></div>
            <div><Link to="/how-it-works" className="inline-flex min-h-12 items-center gap-3 rounded-[10px] border border-white/30 px-5 py-3 font-medium text-white/90 backdrop-blur-sm transition-colors hover:border-white/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4">See how Hire Safe works <ArrowUpRight className="size-5" /></Link><p className="mt-6 text-sm text-white/65">Sign up. Get verified. Join with confidence.</p></div>
          </div>
        </aside>
      </div>
    </main>
  )
}

function AnimatedGrain() {
  const [canAnimate, setCanAnimate] = useState(false)
  useEffect(() => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2')
    if (!context) return
    context.getExtension('WEBGL_lose_context')?.loseContext()
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setCanAnimate(!preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  if (!canAnimate) return null
  return <GrainGradient speed={1} scale={1} rotation={0} offsetX={0} offsetY={0} softness={0.5} intensity={0.5} noise={0.25} shape="corners" frame={2854.5} colors={['#FFFFFF', '#FC7819', '#FC7819', '#FFFFFF']} colorBack="#00000000" className="absolute inset-0 h-full w-full bg-black" />
}

class GradientBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}
