import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CheckCircle2, MapPin, Search, ShieldCheck, Star } from 'lucide-react'
import './hero-animation.css'

const DURATION = 6200

export function HeroAnimation() {
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
    <div ref={root} className="hero-preview" style={{ opacity: cardProgress, transform: `translateY(${20 * (1 - cardProgress)}px) scale(${0.96 + 0.04 * cardProgress})` }} aria-label="Preview of verified domestic helper search results">
      <div className="hero-preview-body">
        <div className="hero-preview-intro" style={reveal(550)}><strong>Find someone you can trust.</strong><span>Explore verified domestic helpers near you.</span></div>
        <div className="hero-preview-search" style={reveal(1250)}><Search size={17} /><span>Nanny in Lagos</span><span className="hero-preview-search-button"><ArrowRight size={16} /></span></div>
        <div className="hero-preview-result-label" style={reveal(1850)}><span>Suggested match</span><span><CheckCircle2 size={13} /> Verified profile</span></div>
        <div className="hero-preview-result" style={reveal(2200)}>
          <div className="hero-preview-person">
            <div className="hero-preview-avatar" aria-hidden="true">AO</div>
            <div className="hero-preview-person-copy"><strong>Amara O.</strong><span><MapPin size={13} /> Lekki, Lagos</span></div>
            <div className="hero-preview-score"><strong>85</strong><small>Trust score</small></div>
          </div>
          <div className="hero-preview-details"><span><BriefcaseBusiness size={14} /> Nanny</span><span>6 years experience</span></div>
          <div className="hero-preview-divider" />
          <div className="hero-preview-checks">
            {['Identity verified', 'Phone verified', 'Employment confirmed', 'References checked'].map((label, i) => (
              <span key={label} style={reveal(2900 + i * 310)}><BadgeCheck size={15} />{label}</span>
            ))}
          </div>
          <div className="hero-preview-footer" style={reveal(4400)}><span><Star size={15} fill="currentColor" /> <strong>4.8</strong> from verified employers</span><span>View profile <ArrowRight size={14} /></span></div>
        </div>
        <div className="hero-preview-note" style={reveal(5300)}><ShieldCheck size={18} /><span><strong>Verified before you connect</strong><small>Review real credentials and employment history.</small></span></div>
      </div>
    </div>
  )
}
