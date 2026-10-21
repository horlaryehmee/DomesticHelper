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

# Set MASTER_ADMIN_PASSWORD in backend/.env to a unique password of at least 16 characters.

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

### Coming soon mode

In **Admin → Settings**, enable **Coming soon page** to show the launch screen to visitors. The same card provides a full-site preview link that can be copied and shared. The link grants access to the site in that browser tab, including public content APIs. Regenerating it invalidates previous preview links. Admins can still sign in at `/login` and manage the setting while the page is enabled.

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
Confirm the account's PHP extensions satisfy `composer check-platform-reqs`.

### Document root options

Laravel wants the document root at `<checkout>/backend/public`. cPanel lets you set a
custom document root for **addon domains and subdomains**, but NOT for the **main
domain**, whose document root is permanently pinned to `public_html`. Both cases are
supported:

| Case | Document root | Setup |
|---|---|---|
| Addon domain / subdomain | `<checkout>/backend/public` | Just point cPanel Domains at it. Nothing else needed. |
| **Main domain** | `public_html` (not changeable) | Use the `public_html` front-controller router (below). |

### Main domain: the `public_html` front-controller router

Because the main domain's document root cannot be moved, `public_html` becomes a router
that forwards every request into `<checkout>/backend/public`:

```
public_html/.htaccess        routes everything into public/index.php, serves
                             /assets, /storage and /community-media directly,
                             and 403s the checkout directories
public_html/index.php        shim that boots backend/public/index.php
public_html/backend/         the checkout (Laravel + the committed SPA build)
public_html/frontend/dist/   the committed SPA source build
```

Laravel then generates clean URLs with **no `/public` segment** — proof that the
document root is effectively obeyed:

```
SCRIPT_NAME  = /backend/public/index.php
REQUEST_URI  = /backend/public/index.php/api/meta
  => Laravel base path "/backend/public", path "/api/meta"
  => route('...'), asset('storage/x.jpg'), url() all emit clean /storage/... URLs
```

The `.htaccess` files are versioned in `cpanel/` (dotfiles cannot be committed under
their real names) and installed by `scripts/install-public-html.sh`, which
`scripts/cpanel-deploy.sh` also calls on every deploy.

### Serving model

1. Apache serves `/assets/*`, `/favicon*.png`, `/apple-touch-icon.png`,
   `/robots.txt` and `/storage/*` straight from `backend/public/`, so the SPA gets
   correct MIME types.
2. `/api/*` reaches Laravel normally.
3. Everything else is matched by the catch-all web route in `routes/web.php`, which
   returns the SPA shell, so React Router deep links work.

> If the SPA assets were ever served as `text/html`, browsers would refuse to execute
> them and the page would be blank with no console error. Verify with:
> `curl -sI https://yourdomain/assets/<bundle>.js | grep -i content-type`
> — it must say `application/javascript` or `text/javascript`, never `text/html`.
> The same check applies to `/storage/...` profile photos: `200`, not `404`.

### First deployment

1. In cPanel **MultiPHP Manager**, select PHP 8.3 or newer for the domain. In
   **Database Wizard**, create a database and user, grant that user access, and note
   their full cPanel-prefixed names.
2. Still in **MultiPHP INI Editor** (optional but recommended), set
   `memory_limit` to at least 256M for a Composer install to succeed.
3. Create the checkout **empty** so that cloning does not conflict with cPanel's
   generated files. In cPanel **Terminal**:

   ```bash
   cd ~
   rm -f public_html/index.php public_html/.htaccess public_html/default.php
   rmdir public_html 2>/dev/null || rm -rf public_html
   git clone https://github.com/horlaryehmee/DomesticHelper.git public_html
   ```

   > `git clone` refuses to write into a non-empty directory, and cPanel puts its own
   > placeholder `index.php` there, which is why the directory must be emptied first.
   > Deleting `public_html` is safe on a brand-new main domain; do NOT do it if the
   > domain already serves content.

   Cloning straight into `public_html` is what makes the main-domain layout work
   without ever asking the host to move a document root.

4. Prepare `backend/.env`:

   ```bash
   cd ~/public_html
   cp backend/.env.example backend/.env
   nano backend/.env
   ```

   Set at least these values (replace the examples):

   ```dotenv
   APP_NAME="Hire Safe"
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   SESSION_DRIVER=database
   SESSION_DOMAIN=.yourdomain.com
   SESSION_SECURE_COOKIE=true
   QUEUE_CONNECTION=database
   DB_QUEUE_TABLE=queue_jobs
   CACHE_STORE=database
   SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com
   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=<full_cpanel_database_name>
   DB_USERNAME=<full_cpanel_database_user>
   DB_PASSWORD=<database_password>
   MAIL_MAILER=log
   ```

   `APP_URL` must be the exact public origin over HTTPS. It drives
   `config('filesystems.disks.public.url')` (via `APP_URL.'/storage'`) and the
   `SESSION_DOMAIN` cookie, so a wrong value breaks images and login at once.
   Session, cache and queue all use the **database** driver, so the `sessions`,
   `cache` and `queue_jobs` tables must exist before anyone can log in — step 5
   runs the migrations that create them. Configure real SMTP and payment keys
   before going live; with neither payment key set, the app selects its sandbox
   provider.

5. Install dependencies, create a **new** app key, and deploy the committed frontend:

   ```bash
   cd ~/public_html
   composer --working-dir=backend install --no-dev --prefer-dist --optimize-autoloader --no-interaction
   php backend/artisan key:generate
   bash scripts/install-public-html.sh
   bash scripts/cpanel-deploy.sh
   ```

   `install-public-html.sh` writes the router into `public_html/.htaccess` and
   `public_html/index.php`, then installs `backend/public/.htaccess`.
   `cpanel-deploy.sh` copies `frontend/dist` into `backend/public` (never touching
   `index.php` or `robots.txt`), creates the storage link, runs migrations, seeds the
   Community Stories sources, and warms the production caches.

6. Seed only the reference data for a real launch. Do **not** run
   `db:seed` or `migrate:fresh --seed` in production: the default seeder
   creates fictional users and reviews, and would replace production data.

   ```bash
   php backend/artisan db:seed --class=RoleAndPermissionSeeder --force
   php backend/artisan db:seed --class=SkillAndLocationSeeder --force
   php backend/artisan db:seed --class=TrustScoreRuleSeeder --force
   php backend/artisan db:seed --class=SettingSeeder --force
   ```

   Create a real super-admin account with a unique password through
   `php backend/artisan tinker` after the role seeder finishes:

   ```php
   $admin = App\Models\User::create(['first_name' => 'Your', 'last_name' => 'Name', 'email' => 'you@yourdomain.com', 'password' => 'REPLACE_WITH_A_LONG_UNIQUE_PASSWORD', 'user_type' => 'admin', 'email_verified_at' => now()]);
   $admin->roles()->attach(App\Models\Role::where('slug', 'super-admin')->firstOrFail());
   ```

7. Lock down permissions and confirm the deploy:

   ```bash
   cd ~/public_html
   chmod 600 backend/.env
   chmod -R 755 backend/storage backend/bootstrap/cache
   php backend/artisan tinker --execute="echo config('app.url');"
   ```

8. In **SSL/TLS Status**, confirm the domain has a valid certificate (run
   AutoSSL if needed), then verify over HTTPS:

   - `https://yourdomain.com/` returns the React app
   - `https://yourdomain.com/search` returns the app (deep link works)
   - `https://yourdomain.com/api/meta` returns JSON
   - a profile photo URL returns `200` with an image content type
   - `https://yourdomain.com/backend/.env` returns **403** (never the file)

9. Add two cPanel **Cron Jobs** (replace `<account>` with the actual username and use
   the correct PHP CLI path if `php` is not PHP 8.3+):

   ```cron
   * * * * * cd /home/<account>/public_html && php backend/artisan schedule:run >> /dev/null 2>&1
   * * * * * cd /home/<account>/public_html && php backend/artisan queue:work --stop-when-empty --max-time=50 >> /dev/null 2>&1
   ```

### Later updates

After this version has been deployed once, a super-admin can use **Admin → Settings → Update site → Update from Git**. The button fetches `origin/main`, fast-forwards the checkout, installs PHP dependencies, refreshes the site router, runs pending migrations, publishes the committed `frontend/dist` build, and refreshes Laravel caches. Settings shows progress and the update log. The database queue cron job below must be running; the button does not build frontend assets on cPanel. Commit and push a fresh `frontend/dist` build with each frontend change. Updates stop if tracked files on the server were edited locally, so those changes cannot be overwritten silently.

Deploy this feature once using the manual steps below so its database table and button exist on the server. The web server user must be able to run `git`, `composer`, `bash`, and `php`, and write to the checkout and Laravel cache directories. The button is available only to the super-admin role.

After pushing to GitHub, open **Git Version Control → Manage → Pull or Deploy**,
click **Update from Remote**, then **Deploy HEAD Commit**. The checked-in
`.cpanel.yml` runs Composer in `backend` and the deploy script. A GitHub
push alone does not trigger cPanel pull deployment. Alternatively, in Terminal,
one line at a time:

```bash
cd ~/public_html
git pull --ff-only origin main
composer --working-dir=backend install --no-dev --prefer-dist --optimize-autoloader --no-interaction
bash scripts/install-public-html.sh
bash scripts/cpanel-deploy.sh
```

`bash scripts/install-public-html.sh` must be re-run after any change to the files in
`cpanel/`, because `public_html/.htaccess` and `public_html/index.php` are copies and
cPanel's Git checkout does not track dotfiles living outside the repository.

Do not run the deploy script before `backend/.env` exists. The generated
`backend/public/assets` and `backend/public/index.html` are ignored by Git,
so deploying them does not dirty the cPanel-managed checkout.

### Troubleshooting the main-domain layout

| Symptom | Cause | Fix |
|---|---|---|
| `ERR_TOO_MANY_REDIRECTS` on every page | Host terminates TLS at a proxy; Laravel thinks the request is insecure and `URL::forceScheme('https')` loops | The `X-Forwarded-Proto` → `HTTPS on` rule in `public_html/.htaccess` and `backend/public/.htaccess` prevents this. Confirm the host sets `X-Forwarded-Proto`; if it sets only `X-Forwarded-SSL`, that is handled too. |
| Blank white page, no console errors | SPA assets served as `text/html` (Laravel's 404 page) because `/assets/...` resolved against `public_html/` where no such directory exists | The `^assets` rewrite in `public_html/.htaccess` maps them to `backend/public/assets`. Re-run `install-public-html.sh` after changing `cpanel/`. |
| Profile photos 404 | `asset('storage/...')` built from a wrong base, or the storage symlink is missing | Confirm `APP_URL` is the exact HTTPS origin, then run `php backend/artisan storage:link`. |
| 500 with "Table 'x.sessions' doesn't exist" | Session/cache/queue all use the database driver but migrations never ran | `php backend/artisan migrate --force` |
| Request loops until `AH00124` | A rewrite rule is re-processing its own output | The front-controller rule is guarded with `REDIRECT_STATUS ^$`; do not remove it. |
| `/` redirects to `/backend/public/index.php` | Laravel's trailing-slash redirect firing on the rewritten internal path | Guarded with `REDIRECT_STATUS ^$` in `backend/public/.htaccess`; do not remove it. |

### macOS / Windows note

`composer install` on a workstation writes nothing absolute into
`backend/vendor/composer/*.php` — every path is `__DIR__`-relative — so a `vendor/`
directory created on another machine works after upload. Do not "repair" the
autoloader by deleting `autoload_static.php`: with `--optimize-autoloader`
`autoload_real.php` hard-requires that file and every request 500s until Composer
regenerates it.

## Roadmap

- Meilisearch/Elasticsearch engine behind the existing `HelperSearchEngine` interface
- PDF export for verification reports
- SMS/WhatsApp notifications (Termii/Twilio) for OTPs and alerts
- Agency dashboards (multi-employer management)
- End-to-end browser test suite (Playwright)
