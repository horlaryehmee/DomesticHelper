import { Link } from 'react-router-dom'

function InfoPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <article className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
    <p className="text-sm font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
    <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
    <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_a]:text-primary [&_a]:underline">{children}</div>
  </article>
}

export function AboutPage() {
  return <InfoPage eyebrow="About us" title="A safer way to find and offer domestic work">
    <p>Hire Safe connects households and employers with domestic workers in Nigeria. Helpers can present their experience and apply for jobs; employers can discover profiles and manage hiring conversations in one place.</p>
    <h2>Our approach</h2><p>Profiles, employment history, reviews and verification information can help people make more informed decisions. A badge or score reflects the information available at the time; it is not a guarantee of someone’s identity, conduct, suitability or future performance.</p>
    <h2>For employers</h2><p>Search helper profiles, post jobs, review applications and arrange interviews. Always conduct your own interviews, reference checks and due diligence before hiring.</p>
    <h2>For helpers</h2><p>Create a profile, describe your skills and experience, and explore opportunities. You remain in control of the information you provide through your account.</p>
    <p>Have a question? <Link to="/contact">Contact the Hire Safe team</Link>.</p>
  </InfoPage>
}

export function HowItWorksPage() {
  return <InfoPage eyebrow="Getting started" title="How Hire Safe works">
    <h2>1. Create a profile</h2><p>Choose whether you are hiring or looking for work. Complete the guided registration and add the details relevant to your role.</p>
    <h2>2. Explore and connect</h2><p>Employers can search helpers and post jobs. Helpers can browse jobs and apply. Use the platform’s messaging and interview tools to discuss the role.</p>
    <h2>3. Review information carefully</h2><p>Look at experience, references, reviews and any available verification information. Verification features assist your decision; you should still ask questions and check details yourself.</p>
    <h2>4. Agree on the work</h2><p>Discuss duties, hours, pay, location and expectations clearly before work begins. Keep records of important agreements.</p>
    <p>Ready to begin? <Link to="/register">Create your profile</Link> or <Link to="/contact">ask a question</Link>.</p>
  </InfoPage>
}

export function SafetyPage() {
  return <InfoPage eyebrow="Trust and safety" title="Use Hire Safe with care">
    <h2>Check before you commit</h2><p>Speak with the other person, confirm the role and location, and check references independently where appropriate. Do not treat a profile, review or verification status as a guarantee.</p>
    <h2>Protect your information</h2><p>Keep passwords and verification codes private. Share identity documents only through the platform’s intended verification flow. Avoid posting sensitive details in public profiles or messages.</p>
    <h2>Payments and suspicious requests</h2><p>Be cautious if anyone asks you to pay an unexpected fee, move a conversation to an unfamiliar channel, or send money to secure a job. Confirm any platform charge through your account before paying.</p>
    <h2>Report a concern</h2><p>Use the report or dispute tools in your account when available, or <Link to="/contact">contact us</Link> and select “Safety concern or dispute.” For an immediate threat, contact the relevant local emergency service.</p>
  </InfoPage>
}

export function FaqPage() {
  return <InfoPage eyebrow="Help centre" title="Frequently asked questions">
    <h2>Do I need an account to browse?</h2><p>You can browse public helper profiles and jobs without signing in. Applying, posting jobs and account features require registration.</p>
    <h2>Does verification guarantee safety?</h2><p>No. Verification reflects specific checks completed at a point in time. Make your own assessment before hiring or accepting work.</p>
    <h2>How do I reset my password?</h2><p>Use the <Link to="/forgot-password">password reset page</Link>. If you cannot access your email, <Link to="/contact">contact us</Link> and choose “Account or login.”</p>
    <h2>How can I raise a complaint?</h2><p>Use the report or dispute feature in your account, or send a message through the <Link to="/contact">Contact page</Link>.</p>
    <h2>How do I request access to or correction of my data?</h2><p>Use your account settings where available, or select “Privacy or my personal data” on the <Link to="/contact">Contact page</Link>.</p>
  </InfoPage>
}

export function PrivacyPage() {
  return <InfoPage eyebrow="Legal" title="Privacy Policy">
    <p>Last updated: 19 October 2026. This notice describes how Hire Safe handles personal data when you use this website and its services. For a privacy request, use our <Link to="/contact">Contact page</Link> and select “Privacy or my personal data,” or email <a href="mailto:info@hiresafe.ng">info@hiresafe.ng</a>.</p>
    <h2>Information we collect</h2><p>We collect account and contact details; profile information such as work experience, location, skills, photo and introductory video if you provide them; job posts and applications; messages, reviews, reports and disputes; payment and transaction records; and verification information that you submit. Technical records may include device, browser and security logs.</p>
    <h2>Why we use it</h2><p>We use this information to create and operate accounts, display the information you choose to make public, connect employers and helpers, process requests and payments, carry out verification, respond to support and safety issues, protect the service, and meet applicable legal obligations. The applicable legal basis depends on the activity and may include providing the service you request, consent, legitimate interests, or legal obligations.</p>
    <h2>Who can see it</h2><p>Public profile details and job posts can be seen by visitors. Other account users may see information you share through applications, messages or reviews. Authorised staff and service providers may access information needed to operate the platform, process payments, host data, deliver email, or handle safety and verification matters. We may disclose information when required by law or to address a serious safety or security issue.</p>
    <h2>Identity and sensitive details</h2><p>Verification documents and identity numbers are used for relevant checks and are not intended for public display. Please do not put sensitive personal information in public profile text, job posts or contact messages.</p>
    <h2>Storage and retention</h2><p>We use access controls and technical safeguards to protect data. We retain information while needed to provide the service, resolve disputes, meet legal or accounting obligations, and protect users. Retention can vary by record type. Deleting an account may not immediately remove records we must keep for these purposes.</p>
    <h2>Your choices and rights</h2><p>You can update many profile details in your account. You may ask about access, correction, deletion, restriction, objection or portability where applicable. We may need to verify your identity before acting on a request. You may also raise a concern with Nigeria’s <a href="https://ndpc.gov.ng/" target="_blank" rel="noreferrer">Data Protection Commission</a>.</p>
    <h2>Cookies and local storage</h2><p>The site uses essential browser storage for login and basic operation. Browser and hosting systems may also set necessary cookies. See our <Link to="/cookies">Cookie Notice</Link> for details.</p>
    <h2>Changes</h2><p>We may update this notice as the service changes. The date at the top shows the current version. Material changes will be communicated through the site or another appropriate channel.</p>
  </InfoPage>
}

export function TermsPage() {
  return <InfoPage eyebrow="Legal" title="Terms and Conditions">
    <p>Last updated: 19 October 2026. These terms apply to your use of Hire Safe. By creating an account or using the service, you agree to follow them. If you have a question, <Link to="/contact">contact us</Link>.</p>
    <h2>Using the service</h2><p>You must provide accurate information, keep your login details secure, and use the service lawfully. You are responsible for activity under your account. Do not impersonate others, submit false verification material, harass users, or misuse their personal information.</p>
    <h2>Employers and helpers</h2><p>Employers are responsible for checking candidates, setting lawful and clear work terms, and meeting any employment obligations. Helpers are responsible for the accuracy of their profiles and applications. Any employment arrangement is made between the relevant people or organisations; Hire Safe is a platform that helps them connect.</p>
    <h2>Verification, reviews and scores</h2><p>Verification, reviews and trust information reflect records available to the platform and may be incomplete or change. They do not guarantee identity, character, skills, safety, employment outcomes or future conduct. Make your own checks before entering an arrangement.</p>
    <h2>Content and conduct</h2><p>You retain responsibility for content you submit. You give Hire Safe permission to store, display and use that content as needed to operate the service, subject to your privacy choices. We may review, restrict or remove content or accounts that breach these terms or create safety or legal risks.</p>
    <h2>Payments</h2><p>If a paid feature is offered, the price and any applicable conditions will be shown before you pay. Contact us about a payment concern and include the transaction reference. Payment processing may involve an external provider.</p>
    <h2>Availability and responsibility</h2><p>We work to keep the service available and information accurate, but interruptions and errors may occur. Nothing on the site replaces independent checks or professional advice. These terms do not exclude rights or remedies that cannot lawfully be excluded.</p>
    <h2>Changes and contact</h2><p>We may change these terms as the platform develops. The updated date will change when we do. Continued use after a change is published indicates acceptance where permitted by law. Contact <a href="mailto:info@hiresafe.ng">info@hiresafe.ng</a> for questions.</p>
  </InfoPage>
}

export function CookiesPage() {
  return <InfoPage eyebrow="Legal" title="Cookie Notice">
    <p>Last updated: 19 October 2026. Hire Safe uses browser storage needed to keep you signed in and run account features. The application stores an access token in your browser’s local storage. Your browser may also receive cookies used by hosting or security services.</p>
    <h2>Your choices</h2><p>You can sign out to remove the stored access token, or clear site data in your browser. Blocking essential storage may prevent login and account features from working. We do not currently offer a separate advertising cookie preference panel.</p>
    <p>Questions about browser storage or privacy? <Link to="/contact">Contact us</Link> or read our <Link to="/privacy">Privacy Policy</Link>.</p>
  </InfoPage>
}
