import { FeatureLink as Link } from '@/components/feature-link'

function InfoPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <article className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
    <p className="text-sm font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
    <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
    <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_a]:text-primary [&_a]:underline">{children}</div>
  </article>
}

export function HowItWorksPage() {
 return <InfoPage eyebrow="Getting started" title="How Hire Safe works">
 <h2>1. Create and confirm your account</h2><p>Choose your account type and sign up. Confirm your email with a code, or use an eligible Google account with a verified email.</p>
 <h2>2. Complete your details</h2><p>Add your personal details, NIN, residential address, supporting document and two guarantors with separate contact numbers.</p>
 <h2>3. Submit for admin review</h2><p>Check the summary and send your onboarding for review. Your dashboard stays closed until your account is approved. If changes are requested, update your details and resubmit.</p>
 <h2>4. Follow your verification</h2><p>Account approval and individual verification checks have separate statuses. Open your dashboard after approval to follow your checks and manage your account.</p>
 <p><Link to="/register">Create your account</Link> or <Link to="/contact">ask a question</Link>.</p>
 </InfoPage>
}
export function SafetyPage() {
 return <InfoPage eyebrow="Trust and safety" title="Use Hire Safe with care">
 <h2>Protect your account and documents</h2><p>Keep passwords and verification codes private. Submit identity and address documents through the intended verification flow. Do not put sensitive details in public text or contact messages.</p>
 <h2>Understand verification statuses</h2><p>Account approval and individual verification checks are different steps. Verification supports your judgement and does not guarantee safety, suitability or future conduct.</p>
 <h2>Provide accurate information</h2><p>Check your details before submitting. Tell both guarantors that you are listing them and provide contacts who can speak about you accurately.</p>
 <h2>Raise a concern</h2><p>If you notice an account, privacy or safety issue, <Link to="/contact">contact the team</Link> with relevant details. Do not share passwords or identity numbers in your message.</p>
 </InfoPage>
}
export function FaqPage() {
 return <InfoPage eyebrow="Help centre" title="Frequently asked questions">
 <h2>Who can register?</h2><p>Employers and domestic helpers in Nigeria can create an account and complete verification onboarding.</p>
 <h2>Why do I need two guarantors?</h2><p>Provide two people who know you, with each person's name, separate phone number and relationship to you. Let both people know you are listing them. Their details stay private.</p>
 <h2>When can I access the dashboard?</h2><p>After confirming your email, completing onboarding and receiving admin approval. Individual identity checks have separate verification statuses.</p>
 <h2>What if changes are requested?</h2><p>Read the admin feedback, update your details and resubmit your onboarding.</p>
 <h2>Does verification guarantee safety?</h2><p>No. Verification reflects specific information reviewed at a point in time. You should still use your judgement and make independent checks.</p>
 <h2>How can I get help?</h2><p>Use <Link to="/forgot-password">password reset</Link> for a forgotten password, or <Link to="/contact">contact the team</Link> about your account, verification or data.</p>
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
