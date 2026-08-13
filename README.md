# Domestic Helper

**A verified trust network for domestic staff hiring in Nigeria.**

Domestic Helper connects employers (households and agencies) with domestic helpers
(housekeepers, nannies, cooks, drivers, caregivers and more) through a controlled
verification and reputation system. It helps families hire safer, helps good helpers
build verified reputations, and gives both sides fair, audited protection.

> **Design principle:** the platform is built around one integrity chain —
> **Identity → Verification → Employment → Reviews → Reports → Disputes → Trust Score.**
> No single user's accusation can ever damage another user's public reputation.
> Only verified, admin-approved information becomes public.

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Seed data & demo accounts](#seed-data--demo-accounts)
- [Testing](#testing)
- [API overview](#api-overview)
- [Privacy architecture](#privacy-architecture)
- [Business rules (enforced server-side)](#business-rules-enforced-server-side)
- [Deployment to cPanel / shared hosting](#deployment-to-cpanel--shared-hosting)
- [Roadmap](#roadmap)

---

## Features

### For employers
- Natural-language helper search ("nanny in Lekki", "driver with 2+ years experience")
  with filters for location, skills, experience, trust score, verification, availability,
  salary and gender; sort by relevance, trust, experience, rating or recent activity
- Public helper profiles with verification badges, trust score, moderated reviews and
  verified employment history
- Save helpers and organise them into lists (shortlists, interview candidates…)
- Purchase verification reports (paid, provider-agnostic payment layer)
- Post jobs, review applications, shortlist, invite to interview, hire
- Track employment from hire to completion and leave moderated reviews
- Submit reports with evidence; in-platform messaging and notifications

### For helpers
- Build a verified public profile: photo, skills, experience, availability, salary
- Identity verification: phone OTP, email, photo, NIN (encrypted at rest, never public),
  address
- Employment history that previous employers verify through a secure response flow
- Trust score (0–100) computed only from audited, verified events
- Reply to, report, and dispute reviews; dispute reports and trust score events
  with evidence — upheld disputes reverse score impact
- Browse and apply to jobs, track applications, interviews and employment
- Messaging, notifications, and a dashboard with profile views and stats

### For admins
- Dashboard with sign-up and revenue charts (Recharts)
- Queues for identity verifications, reference checks, reports, reviews, disputes, jobs
- User management with roles, suspension and role assignment
- Payment transactions, refunds, revenue tracking
- Trust score rule configuration, event ledger, manual adjustments (always audited)
  and full-score recalculation
- Settings for platform fees, base scores and more; complete audit log

---

## Architecture

```
┌──────────────────────────┐        ┌──────────────────────────────────────┐
│  React 19 SPA (Vite 7)   │  HTTP  │  Laravel 13 REST API (PHP 8.3)      │
│  TanStack Query · RHF ·  │ ─────► │  Sanctum auth · Policies · Queues   │
│  Zod · Tailwind 4 ·      │  JSON  │  Notifications · Scheduler          │
│  shadcn-style UI         │        │                                      │
└──────────────────────────┘        │  MySQL 8 (Laragon locally)           │
                                    │                                      │
                                    │  Services (thin controllers):        │
                                    │  TrustScore · Reports · Reviews ·    │
                                    │  Disputes · Employment · Payments ·  │
                                    │  Verification · Search (engine       │
                                    │  interface, MySQL impl; Meilisearch/ │
                                    │  Elasticsearch swappable later)      │
                                    └──────────────────────────────────────┘
```

- **Backend:** `backend/` — Laravel API. Complex business logic lives in service
  classes; controllers stay thin. Authorization is enforced with Policies/Gates on
  every sensitive route (never frontend-only).
- **Frontend:** `frontend/` — React SPA. Feature-first folder layout
  (`src/features/<domain>`), reusable UI primitives in `src/components/ui`, shared
  server-state via TanStack Query.
- **API resources are the privacy boundary:** separate public vs private resource
  classes mean private fields (NIN, exact address, phone, evidence, internal notes)
  can never leak into a public payload by accident.
- **Trust score engine:** `trust_score_rules` (configurable from the admin panel)
  + `trust_score_events` (immutable, audited). Score = 50 base + Σ active rule
  points, clamped 0–100. Rule changes re-score existing events on recalculate.
- **Payments:** `PaymentGatewayInterface` with `PaystackGateway`,
  `FlutterwaveGateway` and a `SandboxGateway` for development. Success is only ever
  confirmed server-side (webhooks / API verification), never from the frontend.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Laravel 13, PHP 8.3+ |
| API auth | Laravel Sanctum (SPA sessions) |
| Database | MySQL 8 |
| Background work | Laravel queues (`database` driver, table `queue_jobs`) + scheduler |
| Notifications | Laravel Notifications (in-app + email; SMS/WhatsApp hooks ready) |
| Frontend | React 19, TypeScript, Vite 7 |
| Server state / forms | TanStack Query, React Hook Form, Zod |
| UI | Tailwind CSS 4, shadcn-style components, Lucide icons, Recharts, Sonner |
| Payments | Paystack + Flutterwave behind a gateway abstraction (+ sandbox) |
| Tests | PHPUnit — 36 feature tests, 101 assertions |

## Local development

Prerequisites: PHP 8.3+, Composer, Node 22+, MySQL 8 (Laragon works well).

```bash
# 1. Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate

# 2. Create the database and point .env at it (example for Laragon)
#    DB_DATABASE=domestichelper  DB_USERNAME=root  DB_PASSWORD=

php artisan migrate:fresh --seed
php artisan storage:link
php artisan serve --host=127.0.0.1 --port=8010

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev          # http://localhost:5174 (proxies /api → :8010)
```

> Port notes: this machine runs another project on 8000/5173, so this project uses
> **8010** (API) and **5174** (Vite). The Vite proxy is configured in
> `frontend/vite.config.ts`.

Production build of the SPA:

```bash
cd frontend
npm run build        # outputs frontend/dist — this IS committed to git
```

## Environment variables

Key variables in `backend/.env`:

| Variable | Purpose |
|---|---|
| `APP_URL` | Base URL of the deployed site (e.g. `https://domestichelper.example.com`) |
| `FRONTEND_URL` | SPA origin (same as `APP_URL` in production) |
| `SANCTUM_STATEFUL_DOMAINS` | Comma-separated domain(s) allowed for SPA cookie auth |
| `SESSION_DOMAIN` | `null` locally; your domain in production |
| `DB_*` | MySQL connection |
| `DB_QUEUE_TABLE` | `queue_jobs` (kept — the domain `jobs` table uses the plain name) |
| `MAIL_*` | Mail provider (queued verification/report emails) |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` | Paystack integration |
| `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_PUBLIC_KEY` | Flutterwave integration |
| `PAYMENT_PROVIDER` | `paystack`, `flutterwave`, or `sandbox` (default for dev) |
| `PLATFORM_REPORT_PRICE` | Verification report price (kobo; also in admin settings) |

## Seed data & demo accounts

`php artisan migrate:fresh --seed` builds a full demo dataset: roles & permissions,
skills, locations, trust score rules, settings, **10 employers**, **30 helpers**
(15 identity-verified) **+ 4 low-trust-score demo helpers**, employment histories,
reviews, jobs, applications, interviews, reports, disputes and profile views.

All passwords are `password`:

| Account | Purpose |
|---|---|
| `admin@domestichelper.test` | Super admin (full panel) |
| `verifier@domestichelper.test` | Verification officer |
| `moderator@domestichelper.test` | Moderator |
| `employer1@…` – `employer10@domestichelper.test` | Employers |
| `helper1@…` – `helper34@domestichelper.test` | Helpers (mixed trust scores) |

**Low-trust-score demo helpers** (great for demos of the search trust filter and the
"Needs Review" category): Daniel Obi (15, flagged), Hannah Igwe (30), Amina Yusuf (35,
identity-verified), Musa Abubakar (40, flagged), Blessing Eze (45, under review with a
pending report). Every one of their scores is derived from real audited events —
verified employment, moderated reviews and admin-verified reports — exactly as in
production.

## Testing

```bash
cd backend
php artisan test          # 36 tests, 101 assertions
```

Coverage includes: registration (employer + helper), NIN encryption at rest and
duplicate-NIN rejection, login (email + phone), suspended-user lockout, public-only
search, natural-language search, search privacy (no private fields leak), public
profile whitelisting, verified-only employment history, review moderation (pending →
approved → trust event), review relationship enforcement, duplicate-review blocking,
review responses, report workflow (no automatic score impact, helper right of reply,
admin-only decisions, verified outcomes create events), dispute reversal, trust score
base/clamping/auditing/rule-change recalculation/idempotency, payment purchase flow,
sandbox completion, webhook signature rejection, and verification report access
control.

Tests run against a real MySQL database (`domestichelper_test`) — see `phpunit.xml`.

## API overview

All routes live under `/api`. Highlights:

```
# Public
GET  /api/helpers                      # search (q, state, skills[], trust_min, sort…)
GET  /api/helpers/{uuid}               # public profile (approved info only)
GET  /api/helpers/{uuid}/reviews       # approved reviews only
GET  /api/helpers/{uuid}/employment    # verified employment history only
GET  /api/jobs
GET  /api/meta                         # skills, states, enum labels for filters

# Auth
POST /api/auth/register/employer
POST /api/auth/register/helper
POST /api/auth/login  ·  /logout  ·  /auth/me
POST /api/auth/otp/send  ·  /auth/otp/verify
POST /api/auth/password/forgot  ·  /reset  ·  /change

# Employer
POST /api/employers/saved-helpers/{uuid}        # save helper
GET  /api/employers/saved-helpers
POST /api/verification-reports                   # purchase report
POST /api/payments/{uuid}/verify                # sandbox completion
POST /api/jobs  ·  PUT /api/jobs/{uuid}
POST /api/jobs/{uuid}/applications/{uuid}/shortlist | /reject
POST /api/employments/{uuid}/start  ·  /complete

# Helper
GET  /api/helpers/me  ·  PUT /api/helpers/me
POST /api/helpers/me/verifications               # request identity verification
POST /api/jobs/{uuid}/apply  ·  DELETE …/apply   # withdraw
POST /api/disputes                                # dispute reviews/reports/events

# Both roles
GET/POST /api/conversations  ·  /messages
POST /api/reviews  ·  POST /api/reports  ·  responses on each
GET  /api/notifications  ·  /interviews  ·  /employments

# Admin (permission-gated)
GET  /api/admin/users  ·  /admin/verifications  ·  /admin/reference-checks
GET  /api/admin/reports  ·  /admin/reviews  ·  /admin/disputes  ·  /admin/jobs
POST /api/admin/reports/{uuid}/decide            # outcome → possible trust event
POST /api/admin/disputes/{uuid}/decide           # uphold → event reversed
POST /api/admin/reviews/{uuid}/moderate
POST /api/admin/verifications/{uuid}/decide
GET/PUT /api/admin/trust-score/rules  ·  /events
POST /api/admin/trust-score/recalculate
GET  /api/admin/payments  ·  POST /admin/payments/{uuid}/refund
GET  /api/admin/audit-logs  ·  GET/PUT /admin/settings
```

Public resources are addressed by **UUID** — sequential IDs are never exposed in
public URLs.

## Privacy architecture

**Public data** (what anyone can see): display name, photo, skills, general location
(city/state), experience, verified employment history, approved reviews, trust score,
verification badges.

**Private data** (never leaves authorized contexts): NIN (encrypted at rest +
hashed for duplicate checks, only `nin_last4` shown to staff), exact address, private
phone, identity documents and evidence files (private storage disk,
access-controlled downloads), internal complaints, reference-check notes, admin
notes, internal trust calculations.

## Business rules (enforced server-side)

1. A user can only review a helper with a verified employment relationship on the platform.
2. Submitting a report never changes a trust score by itself.
3. Only an admin decision can create a score event (verified outcomes only).
4. Unverified accusations stay internal and never appear publicly.
5. Helpers are notified of reports and always get the right to respond.
6. Helpers can dispute reviews, reports, trust score events and verification results;
   upheld disputes reverse the score impact.
7. Every admin decision, score change and sensitive action writes an audit log entry.
8. NIN, exact addresses and evidence are never public.
9. Trust scores come exclusively from auditable events; employers can never touch them.
10. Reviews are moderated before appearing publicly.
11. Payment success is confirmed server-side only.
12. Public profiles only expose approved information — neutral language
    ("Flagged Concern", "Needs Review") is used everywhere; no defamatory labels.

## Deployment to cPanel / shared hosting

The repo is structured so it deploys with **git alone** (the production SPA build in
`frontend/dist` is committed), and ships `scripts/cpanel-deploy.sh` to finish the
job on the server.

### 1. One-time server setup (SSH into your cPanel account)

```bash
# Create the project directory next to your other apps (adjust paths to your cPanel)
cd ~
git clone https://github.com/horlaryehmee/DomesticHelper.git domestichelper.yourdomain.com
cd domestichelper.yourdomain.com
php ~/composer.phar install --no-dev --optimize-autoloader --no-interaction
cp backend/.env.example backend/.env
nano backend/.env     # set DB creds, APP_URL, SESSION_DOMAIN, PAYMENT keys
php backend/artisan key:generate
php backend/artisan migrate --seed --force
php backend/artisan storage:link
bash scripts/cpanel-deploy.sh
```

### 2. Point the subdomain at the app

In cPanel → **Domains** → create `domestichelper.yourdomain.com` (or use an existing
addon domain) and set its **document root** to:

```
/home/<account>/domestichelper.yourdomain.com/backend/public
```

> `backend/public` is the only web-exposed directory. Everything else (app code,
> `.env`, private storage) lives above the document root. The Laravel web routes
> serve the SPA (`public/index.html`) with a catch-all so React Router deep links
> work, while `/api/*` and `/storage/*` are handled by Laravel and Apache
> respectively.

### 3. Ensure the scheduler runs (trust-score jobs, notifications, cleanup)

Add a cron job in cPanel (every minute):

```
* * * * * php /home/<account>/domestichelper.yourdomain.com/backend/artisan schedule:run >> /dev/null 2>&1
```

(Queue workers also use the `database` driver; the scheduler processes queued jobs via
`php artisan queue:work --once` on the default schedule.)

### 4. Deploying updates

Either **manually** over SSH:

```bash
cd ~/domestichelper.yourdomain.com
git pull origin main
php ~/composer.phar install --no-dev --optimize-autoloader --no-interaction
php backend/artisan migrate --force
bash scripts/cpanel-deploy.sh
```

Or via **cPanel Git Version Control** (Git Version Control → create repository,
select branch `main`, set the same document root as above) — `.cpanel.yml` at the
repo root runs the same commands automatically after every push.

`scripts/cpanel-deploy.sh` (re)installs the committed SPA build into
`backend/public/`, clears caches, and warms the app — safe to run after every pull.

## Roadmap

- Meilisearch/Elasticsearch engine behind the existing `HelperSearchEngine` interface
- PDF export for verification reports
- SMS/WhatsApp notifications (Termii/Twilio) for OTPs and alerts
- Agency dashboards (multi-employer management)
- End-to-end browser test suite (Playwright)
