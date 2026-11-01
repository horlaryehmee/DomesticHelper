import { useFeatures } from '@/lib/features'
﻿import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CheckCircle2, MapPin, Search, ShieldCheck, Star } from 'lucide-react'
import './hero-animation.css'

const DURATION = 6200

export function HeroAnimation() {
  const { enabled } = useFeatures()
  const verificationOnly = !enabled.helper_directory
  const root = useRef<HTMLDivElement>(null)
  const [elapsed, setElapsed] = useState(0)
  const [visible, setVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(media.matches)
    updateMotion()
    media.addEventListener('change', updateMotion)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 })
    if (root.current) observer.observe(root.current)
    return () => { media.removeEventListener('change', updateMotion); observer.disconnect() }
  }, [])

  useEffect(() => {
    if (reducedMotion || !visible || elapsed >= DURATION) return
    const started = performance.now() - elapsed
    const timer = window.setInterval(() => {
      const next = Math.min(DURATION, performance.now() - started)
      setElapsed(next)
      if (next >= DURATION) window.clearInterval(timer)
    }, 50)
    return () => window.clearInterval(timer)
    // Preserve progress while this illustration is outside the viewport.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reducedMotion])

  const time = reducedMotion ? DURATION : elapsed
  const show = (start: number, duration = 350) => Math.max(0, Math.min(1, (time - start) / duration))
  const reveal = (start: number) => ({ opacity: show(start), transform: `translateY(${8 * (1 - show(start))}px)` })
  const cardProgress = show(100, 600)

  return (
    <div ref={root} className="hero-preview" style={{ opacity: cardProgress, transform: `translateY(${20 * (1 - cardProgress)}px) scale(${0.96 + 0.04 * cardProgress})` }} aria-label={verificationOnly ? "Illustrative account verification preview" : "Preview of verified domestic helper search results"}>
      <div className="hero-preview-body">
        <div className="hero-preview-intro" style={reveal(550)}><strong>{verificationOnly ? "A clearer verification record." : "Find someone you can trust."}</strong><span>{verificationOnly ? "Your account details, in one review process." : "Explore verified domestic helpers near you."}</span></div>
        <div className="hero-preview-search" style={reveal(1250)}><Search size={17} /><span>{verificationOnly ? "Identity and address verification" : "Nanny in Lagos"}</span><span className="hero-preview-search-button"><ArrowRight size={16} /></span></div>
        <div className="hero-preview-result-label" style={reveal(1850)}><span>{verificationOnly ? "Verification overview" : "Suggested match"}</span><span><CheckCircle2 size={13} /> {verificationOnly ? "Illustrative record" : "Verified profile"}</span></div>
        <div className="hero-preview-result" style={reveal(2200)}>
          <div className="hero-preview-person">
            <div className="hero-preview-avatar" aria-hidden="true">{verificationOnly ? "ID" : "AO"}</div>
            <div className="hero-preview-person-copy"><strong>{verificationOnly ? "Your verification details" : "Amara O."}</strong><span><MapPin size={13} /> {verificationOnly ? "Private account information" : "Lekki, Lagos"}</span></div>
            <div className="hero-preview-score"><strong>{enabled.trust_scores ? "85" : "2"}</strong><small>{enabled.trust_scores ? "Trust score" : "Guarantors"}</small></div>
          </div>
          <div className="hero-preview-details"><span><BriefcaseBusiness size={14} /> {verificationOnly ? "Account onboarding" : "Nanny"}</span><span>{verificationOnly ? "Two guarantor contacts" : "6 years experience"}</span></div>
          <div className="hero-preview-divider" />
          <div className="hero-preview-checks">
            {(verificationOnly ? ['Identity details', 'Email confirmation', 'Address document', 'Two guarantor contacts'] : ['Identity verified', 'Phone verified', ...(enabled.employment ? ['Employment confirmed'] : ['Address details']), ...(enabled.reference_checks ? ['References checked'] : ['Two guarantors'])]).map((label, i) => (
              <span key={label} style={reveal(2900 + i * 310)}><BadgeCheck size={15} />{label}</span>
            ))}
          </div>
          <div className="hero-preview-footer" style={reveal(4400)}><span><Star size={15} fill="currentColor" /> {enabled.reviews ? <><strong>4.8</strong> from verified employers</> : "Reviewed with care"}</span><span>{verificationOnly ? "Account review" : "View profile"} <ArrowRight size={14} /></span></div>
        </div>
        <div className="hero-preview-note" style={reveal(5300)}><ShieldCheck size={18} /><span><strong>{verificationOnly ? "Private details. Clear next steps." : "Verified before you connect"}</strong><small>{verificationOnly ? "Complete onboarding and follow your account review." : enabled.employment ? "Review real credentials and employment history." : "Review the available verification information."}</small></span></div>
      </div>
    </div>
  )
}
