# Hire Safe

**A verified trust network for domestic staff hiring in Nigeria.**

Hire Safe connects employers (households and agencies) with domestic helpers
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

The committed `frontend/dist` is the production React build. cPanel needs PHP 8.3+
for both the website and CLI, Composer, MySQL/MariaDB, Git, and Terminal/SSH access.
Keep the repository **outside** `public_html`; only `backend/public` should be web
accessible. Confirm the account's PHP extensions satisfy `composer check-platform-reqs`.

### First deployment

1. In cPanel **Domains**, add the Hire Safe domain or subdomain and point its
   document root to `hiresafe/backend/public` (relative to your cPanel home).
   cPanel does not let you change the primary domain's document root in the
   normal Domains interface. If Hire Safe is the primary domain, ask the host
   to point it at this path, or use an addon domain/subdomain that allows a
   custom document root.
2. In **MultiPHP Manager**, select PHP 8.3 or newer for the domain. In
   **Database Wizard**, create a database and user, grant that user access,
   and note their full cPanel-prefixed names.
3. In **Git Version Control**, clone
   `https://github.com/horlaryehmee/DomesticHelper.git` into
   `/home/<account>/hiresafe` (not `public_html`). For a private GitHub
   repository, first set up a read-only SSH deploy key and use the SSH clone
   URL.
4. Open cPanel **Terminal** and prepare the environment:

   ```bash
   cd ~/hiresafe
   cp backend/.env.example backend/.env
   nano backend/.env
   ```

   Set at least these values in `backend/.env` (replace the examples):

   ```dotenv
   APP_NAME="Hire Safe"
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://hiresafe.example.com
   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=<full_cpanel_database_name>
   DB_USERNAME=<full_cpanel_database_user>
   DB_PASSWORD=<database_password>
   QUEUE_CONNECTION=database
   DB_QUEUE_TABLE=queue_jobs
   MAIL_MAILER=log
   ```

   Configure real SMTP credentials before relying on verification/reset
   emails. Configure Paystack or Flutterwave keys before accepting live
   payments; with neither key, the app selects its sandbox payment provider.
   Keep `backend/.env` private and never commit it.

5. Still in Terminal, install the PHP dependencies, create a **new** app key,
   and deploy the committed frontend:

   ```bash
   cd ~/hiresafe
   composer --working-dir=backend install --no-dev --prefer-dist --optimize-autoloader --no-interaction
   php backend/artisan key:generate
   bash scripts/cpanel-deploy.sh
   ```

   The deploy script copies `frontend/dist` into `backend/public`, creates
   the storage link, migrates the database, and warms Laravel caches.

6. Seed only the reference data for a real launch. Do **not** run
   `db:seed` or `migrate:fresh --seed` in production: the default seeder
   creates fictional users, reviews, and an admin with a known password.

   ```bash
   php backend/artisan db:seed --class=RoleAndPermissionSeeder --force
   php backend/artisan db:seed --class=SkillAndLocationSeeder --force
   php backend/artisan db:seed --class=TrustScoreRuleSeeder --force
   php backend/artisan db:seed --class=SettingSeeder --force
   ```

   Create a real super-admin account with a unique password through
   `php backend/artisan tinker` after the role seeder finishes:

   ```php
   $admin = App\Models\User::create(['first_name' => 'Your', 'last_name' => 'Name', 'email' => 'you@hiresafe.example.com', 'password' => 'REPLACE_WITH_A_LONG_UNIQUE_PASSWORD', 'user_type' => 'admin', 'email_verified_at' => now()]);
   $admin->roles()->attach(App\Models\Role::where('slug', 'super-admin')->firstOrFail());
   ```

7. In **SSL/TLS Status**, confirm the domain has a valid certificate (run
   AutoSSL if needed). Open the HTTPS homepage, `/up`, and `/api/meta`.
   Test sign-in and a deep React route such as `/search`. Ensure
   `backend/storage` and `backend/bootstrap/cache` are writable by PHP.
8. Add two cPanel **Cron Jobs** (replace `<account>` with the actual
   username and use the correct PHP CLI path if `php` is not PHP 8.3+):

   ```cron
   * * * * * cd /home/<account>/hiresafe && php backend/artisan schedule:run >> /dev/null 2>&1
   * * * * * cd /home/<account>/hiresafe && php backend/artisan queue:work --stop-when-empty --max-time=50 >> /dev/null 2>&1
   ```

### Later updates

After pushing to GitHub, open **Git Version Control → Manage → Pull or Deploy**,
click **Update from Remote**, then **Deploy HEAD Commit**. The checked-in
`.cpanel.yml` runs Composer in `backend` and the deploy script. A GitHub
push alone does not trigger cPanel pull deployment. Alternatively, in Terminal:

```bash
cd ~/hiresafe
git pull --ff-only origin main
composer --working-dir=backend install --no-dev --prefer-dist --optimize-autoloader --no-interaction
bash scripts/cpanel-deploy.sh
```

Do not run the deploy script before `backend/.env` exists. The generated
`backend/public/assets` and `backend/public/index.html` are ignored by Git,
so deploying them does not dirty the cPanel-managed checkout.

## Roadmap

- Meilisearch/Elasticsearch engine behind the existing `HelperSearchEngine` interface
- PDF export for verification reports
- SMS/WhatsApp notifications (Termii/Twilio) for OTPs and alerts
- Agency dashboards (multi-employer management)
- End-to-end browser test suite (Playwright)
