import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowRight, ShieldCheck, Fingerprint, BriefcaseBusiness, HeartHandshake, LockKeyhole, Scale, Check, UserRoundCheck, MessageCircle, FileCheck2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const principles = [
  { icon: Fingerprint, title: 'Trust should have a foundation.', text: 'Identity details, employment records and reviewed information give people something concrete to consider before they make a decision.' },
  { icon: Scale, title: 'Reputation deserves a fair process.', text: 'Reviews and reports go through moderation. Helpers can respond to feedback and dispute claims, so one accusation does not become a public verdict.' },
  { icon: LockKeyhole, title: 'Private details should stay private.', text: 'NIN, guarantor details and address documents belong in the verification process. They are kept out of public helper profiles.' },
]
const steps = [
  { title: 'Start with your details', text: 'Choose an employer or helper account, sign up, and verify your email with a confirmation code.' },
  { title: 'Complete your onboarding', text: 'Tell us about yourself or your hiring needs. Submit the identity, guarantor and address details needed for review.' },
  { title: 'Wait for admin review', text: 'Your dashboard stays closed while your submission is reviewed. If changes are needed, you can update and resubmit.' },
  { title: 'Connect with confidence', text: 'After approval, use your account to find opportunities, discuss expectations and build a clearer record of the working relationship.' },
]
const questions = [
  { question: 'Who is Hire Safe for?', answer: 'Households and agencies hiring domestic staff in Nigeria, and helpers looking for work as housekeepers, nannies, cooks, drivers, caregivers and other domestic roles.' },
  { question: 'Does an approved account mean every check is complete?', answer: 'Account approval gives a user access to the dashboard after onboarding review. Individual identity checks, employment records and verification badges have their own statuses. Look at the specific information on a profile when making a decision.' },
  { question: 'What does a trust score tell me?', answer: 'It brings together verified and moderated activity recorded on the platform. It is one part of the picture, alongside skills, experience, references and your own conversations. It is not a prediction of future behaviour.' },
  { question: 'How do I raise a concern?', answer: 'Use the report or dispute tools in your account, or contact the team through the Contact page. Provide relevant details so the concern can be reviewed fairly.' },
]

export function AboutPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'About Hire Safe | Trust for every working relationship'
    return () => { document.title = previous }
  }, [])
  return (
    <div className="bg-background">
      <section className="relative overflow-hidden border-b bg-[#f7f3ed] text-[#291d36]">
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-0 size-[540px] rounded-full bg-[#efb298]/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]"><span className="size-2 rounded-full bg-[#e78868]" /> About Hire Safe</p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.05em] sm:text-6xl lg:text-7xl">Good homes.<br />Good work.<br /><span className="text-[#936349]">A foundation of trust.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[#655b6c]">Inviting someone into your home is personal. So is choosing where to work. We help both sides take that step with more information, more clarity and more confidence.</p>
            <div className="mt-9 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/register">Join Hire Safe <ArrowUpRight /></Link></Button><Button asChild variant="outline" size="lg" className="border-[#291d36]/20 bg-transparent text-[#291d36] hover:bg-white/60"><a href="#our-purpose">Get to know us <ArrowRight /></a></Button></div>
            <p className="mt-8 text-xs font-medium uppercase tracking-[0.16em] text-[#796d7f]">Built for domestic work in Nigeria</p>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:py-8">
            <div aria-hidden="true" className="absolute -inset-4 rotate-3 rounded-[2rem] border border-[#291d36]/10 sm:-inset-6" />
            <div className="relative overflow-hidden rounded-3xl bg-[#2d2039] p-7 text-white shadow-xl sm:p-9">
              <div className="flex items-center justify-between border-b border-white/15 pb-6"><span className="text-sm font-medium text-white/70">The Hire Safe approach</span><ShieldCheck className="size-6 text-[#f1b49d]" /></div>
              <p className="mt-8 text-3xl font-medium leading-tight tracking-tight">Two sides.<br />One shared standard.</p>
              <div className="my-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div className="rounded-xl border border-white/15 bg-white/5 p-4 text-center"><BriefcaseBusiness className="mx-auto mb-3 size-7 text-[#f1b49d]" /><span className="text-sm">Employers</span></div><HeartHandshake className="size-6 text-[#f1b49d]" /><div className="rounded-xl border border-white/15 bg-white/5 p-4 text-center"><UserRoundCheck className="mx-auto mb-3 size-7 text-[#f1b49d]" /><span className="text-sm">Helpers</span></div></div>
              <ul className="space-y-4 text-sm text-white/80">{['Identity before introductions', 'Clarity before commitment', 'Fairness throughout the relationship'].map(item => <li key={item} className="flex items-center gap-3"><Check className="size-4 shrink-0 text-[#f1b49d]" />{item}</li>)}</ul>
              <p className="mt-8 border-t border-white/15 pt-5 text-xs leading-relaxed text-white/50">A shared commitment to respectful, informed hiring.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="our-purpose" className="mx-auto grid max-w-7xl scroll-mt-24 gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why we exist</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Trust is personal.<br />The process can be clearer.</h2></div>
        <div className="space-y-5 text-lg leading-relaxed text-muted-foreground"><p>A recommendation can open a door. It does not always tell the whole story. Families need to understand who they are hiring, and domestic workers need a fair way to show their experience and build a reputation.</p><p>Hire Safe brings profiles, verification information, work history and moderated feedback into one place. Our purpose is to make those conversations better informed, while treating the people on both sides with dignity.</p><p className="font-medium text-foreground">Because a good working relationship should begin with clear expectations and mutual respect.</p></div>
      </section>

      <section className="border-y bg-muted/25 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">For both sides of the door</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Safer hiring. Fairer opportunities.</h2></div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <AudienceCard icon={BriefcaseBusiness} eyebrow="For households & agencies" title="Find the person your home needs." text="Look beyond a name and a phone number. Compare relevant skills and experience, ask better questions, and keep your hiring process organised." items={['Search helper profiles and review available verification information', 'Post jobs, review applications and arrange interviews', 'Discuss duties, hours, pay and expectations before work begins']} to="/search" action="Explore helper profiles" />
            <AudienceCard icon={HeartHandshake} eyebrow="For domestic helpers" title="Let your experience speak for you." text="Build a profile that reflects your skills and the work you have done. Find opportunities while building a reputation you have a voice in." items={['Present your skills, experience and availability in one profile', 'Explore jobs and keep track of your applications', 'Respond to reviews and raise disputes through a fair process']} to="/jobs" action="Explore job opportunities" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Our principles</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">What trust looks like in practice.</h2></div><Link to="/safety" className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">Our safety approach <ArrowUpRight className="size-4" /></Link></div><div className="mt-12 grid gap-9 md:grid-cols-3">{principles.map(({icon:Icon,title,text},index)=><div key={title} className="border-t pt-7"><div className="mb-6 flex items-center justify-between"><Icon className="size-7 text-primary" /><span className="text-xs text-muted-foreground">0{index+1}</span></div><h3 className="text-xl font-semibold tracking-tight">{title}</h3><p className="mt-4 text-sm leading-7 text-muted-foreground">{text}</p></div>)}</div></section>

      <section className="bg-[#2d2039] px-5 py-20 text-white sm:px-8"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24"><div><FileCheck2 className="size-9 text-[#f1b49d]" /><p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-[#f1b49d]">A considered start</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">A little care at the start.<br />A stronger foundation ahead.</h2><p className="mt-5 max-w-md leading-relaxed text-white/65">Joining is a process, not just a form. New employer and helper accounts go through onboarding and admin review before dashboard access.</p></div><ol className="space-y-7">{steps.map((step,index)=><li key={step.title} className="flex gap-5"><span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/25 text-sm text-[#f1b49d]">{index+1}</span><div className="border-b border-white/15 pb-6"><h3 className="text-lg font-medium">{step.title}</h3><p className="mt-2 text-sm leading-6 text-white/65">{step.text}</p></div></li>)}</ol></div></section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">A few things to know</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Confidence starts<br />with understanding.</h2><p className="mt-5 leading-relaxed text-muted-foreground">Verification supports your judgement. It cannot guarantee safety, suitability or future performance. Interviews, reference conversations and clear agreements still matter.</p></div><div className="divide-y border-y">{questions.map(({question,answer})=><details key={question} className="group py-5"><summary className="cursor-pointer rounded py-1 pr-4 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-4">{question}</summary><p className="mt-4 pr-5 text-sm leading-7 text-muted-foreground">{answer}</p></details>)}<Link to="/faq" className="flex items-center gap-2 py-5 text-sm font-semibold text-primary">Visit the help centre <ArrowUpRight className="size-4" /></Link></div></section>

      <section className="px-5 pb-20 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-3xl bg-[#f2e7df] p-8 text-[#291d36] sm:p-12 lg:flex-row lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#936349]">Take the next step</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Better working relationships<br />start with a conversation.</h2><p className="mt-4 max-w-xl text-[#655b6c]">Ready to hire or looking for your next role? Start your profile. If you have questions, our team is a message away.</p></div><div className="flex shrink-0 flex-wrap gap-3"><Button asChild size="lg"><Link to="/register">Create your account <ArrowUpRight /></Link></Button><Button asChild size="lg" variant="outline" className="border-[#291d36]/20 bg-transparent text-[#291d36] hover:bg-white/60"><Link to="/contact"><MessageCircle /> Talk to us</Link></Button></div></div></section>
    </div>
  )
}

function AudienceCard({icon:Icon,eyebrow,title,text,items,to,action}:{icon:typeof BriefcaseBusiness;eyebrow:string;title:string;text:string;items:string[];to:string;action:string}) {
 return <div className="flex flex-col rounded-2xl border bg-card p-7 sm:p-9"><Icon className="mb-6 size-8 text-primary" /><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p><h3 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h3><p className="mt-4 text-sm leading-7 text-muted-foreground">{text}</p><ul className="my-7 space-y-4">{items.map(item=><li key={item} className="flex gap-3 text-sm leading-6"><Check className="mt-1 size-4 shrink-0 text-primary" />{item}</li>)}</ul><Link to={to} className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">{action} <ArrowUpRight className="size-4" /></Link></div>
}
