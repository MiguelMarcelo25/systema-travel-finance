# Systema

A working travel-agency booking and financial-monitoring website based on *Systema Manuscript.pdf*, especially the objectives, scope, system models, and prototypes on PDF pages 11–18 and 59–80.

## Run locally

Requires Node.js 24. From this directory run:

```powershell
npm install
npm run build
npm start
```

Open http://localhost:4173. The first screen is a login form containing Email and Password, with a **Create an account** link after initialization. On a fresh local installation, the first successful sign-in creates the sole administrator (minimum password length: 10 characters). No default administrator credentials are shipped. Later sign-ins authenticate existing accounts. Clients can register at `/register` with their name, email, phone and password confirmation. Registration creates a new Client account and its own customer record, then signs the client in. Existing customer emails cannot be claimed through public registration; those clients should contact the administrator. The administrator can also create linked Client accounts in **Accounts**. Sample fixtures are used only by isolated tests.

Data persists in `data/systema.sqlite`. Stop the server before copying the `data` directory for a complete local backup. The database and session credentials are excluded from Git and hosted build archives. Local and hosted databases are separate.

## Account verification and password recovery

Accounts must verify their email before entering the workspace, except the dedicated `admin@systema.com` account when its stored role is `Administrator`. That account still requires its password and an active session; it is exempt from verification, not marked as having verified its email. Clients using that address and administrators using any other address still require verification. Existing accounts are marked unverified when migration 0004 is applied; their records are preserved. First-time registration sends a verification link when email delivery is configured. The verification screen also supports sending another link and checking verification status. Accounts created by an administrator verify after their first sign-in. Changing an account email clears its verification and invalidates its sessions and outstanding links.

**Forgot password?** is available on the shared sign-in screen. Reset links expire after 30 minutes; verification links expire after 24 hours. Both are single-use, stored only as hashes, and sent to the account email. Password resets sign out all existing sessions. The API restricts requests by IP and account email and returns the same recovery response for known and unknown accounts.

For local SQLite development, emails are saved as private `.txt` previews under `.sites-runtime/mail/`. Open the newest file and use its link; these files are never served by the website or committed. Delete expired preview files when no longer needed. This is a development mailbox, not delivery to a real inbox.

For real email delivery on Node/Vercel, set server-only `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `APP_URL` (the canonical site URL, HTTPS in production). Enable Google 2-Step Verification, create a [Google App Password](https://support.google.com/accounts/answer/185833), and save it as a Production Secret in Vercel. Never use your normal Google password. Messages are sent from the authenticated Gmail address over TLS; Gmail's sending limits and account security checks still apply.

Alternatively, configure `RESEND_API_KEY` and `MAIL_FROM` using a verified Resend sending domain. Gmail takes precedence when both Gmail variables are present. Resend's default sender supports testing to the Resend account owner's email only, so it is unsuitable for client account verification. The Worker build supports Resend only.

To load an environment file locally, use `node --env-file=.env.local server.mjs` after building. Keep `DATABASE_URL` empty for SQLite. No real email provider credentials are included. Cloud runtimes require email configuration and the new Supabase migration before releasing these features; they never fall back to local preview files.

### Package catalog and predictions

Clients browse **Travel packages**, search by package/destination, filter by category, and start a request with the selected package. Both booking selectors show destinations and base prices; final fares remain subject to administrator approval. Administrators manage the same catalog in their own workspace and see account verification status in **Accounts**.

**Predictive analytics → Package best sellers** compares recorded package sales and booking counts with forecasts for the next 1–6 months, starting in the current month. Each active package is modeled independently using the existing historical-average/last-month/drift selection and rolling-origin validation. At least three completed months after that package’s first observed month are needed. Inactive and insufficient-history packages are explained separately; unlinked bookings do not enter package rankings. Cancelled and future-dated records are excluded. Ties share a rank. CSV export, monthly predictions, and indicative ranges are available. These are planning estimates without seasonal or campaign effects. The existing agency-level forecasts remain available in the **Agency forecast** tab.

## Supabase and Vercel deployment

The production deployment uses React and Tailwind assets built by Vite, a Node.js Vercel Function in `api/index.mjs`, and Supabase Postgres in Singapore. It preserves Systema's server-side password authentication and HttpOnly sessions. Supabase Auth is not used; application accounts are stored in the private `systema.users` table.

The private `systema` schema has RLS on every application table. Anonymous and Supabase authenticated roles have no schema access. The API uses a dedicated `systema_app` database login with access only to these tables. Client ownership and administrator permissions are enforced by the API. Supabase's transaction pooler is used with one connection per function instance, unnamed parameterized queries, certificate and hostname verification, and short transactions. An advisory transaction lock prevents concurrent payments or approvals from bypassing balance and status guards.

Production environment variables are `DATABASE_URL` and `SYSTEMA_ADMIN_EMAIL`. The database URL is a server secret and must never use a `VITE_` prefix. The public Supabase root certificate is checked in under `supabase/certs`; `DATABASE_CA` can override it when needed. Production credentials are not supplied to preview deployments.

The production administrator is provisioned before deployment. Public registration always creates Client accounts and never assigns administrator privileges or links to existing customer history. It is unavailable until initialization, and has a persistent limit of 10 attempts per client IP in 15 minutes. Vercel supplies the trusted forwarded IP; the local server uses the socket address. The administrator credentials are saved locally in the ignored `.sites-runtime/administrator-credentials.txt` file. All booking requests still require administrator acceptance or decline.

To use the same Supabase data on localhost, run:

```powershell
npm run build:vercel
npm run start:cloud
```

This loads the ignored `.env.local` configuration. `npm start` continues to use the separate local SQLite database. `npm run dev:cloud` provides hot reload with the cloud database.

For a fresh Supabase installation, install the official Supabase CLI, create and link the project, run `supabase db push`, then run `node scripts/provision.mjs PROJECT_REF ADMIN_EMAIL` once. On other machines set `SUPABASE_CLI` to your CLI executable. Configure the production secrets in Vercel, connect the GitHub repository, and deploy its `main` branch. Future schema changes must be created with `supabase migration new` and applied before a deployment that needs them. Database migrations never run inside HTTP requests or frontend builds.

## Included workflows

- Customer records and booking history; travel-service catalog with active/inactive services.
- Create and update bookings; fare components, destination, travel date, passenger count, supplier estimates, and status.
- Partial and full payment recording; outstanding balance, booking details and payment receipts.
- Paid supplier and operating expenses.
- Dashboard, historical trends, service and destination analytics, and per-booking estimated margin.
- Cash movement, booked sales, collections, expenses, and current receivables reports, with CSV exports and print-to-PDF.
- React JavaScript components, React Router, Tailwind CSS 4, Vite, and Lucide icons. Direct login, administrator workspace, client portal, labeled forms, keyboard dialogs, chart data tables, and responsive navigation.
- Predictive analytics for sales, collections, and booking counts over 1–6 months, with service filters, model comparison, visible assumptions, and CSV export.
- One Administrator account and Client accounts, enforced by the API and a database uniqueness constraint. Clients see only their linked customer records, bookings, balances, requests, and receipts. All financial reports and predictive analytics remain administrator-only.
- Clients submit booking requests. The administrator accepts or declines them, with a reason required for declining. Accepting atomically creates one confirmed, unpaid booking with the administrator-approved fare. Requests alone do not count as bookings or sales.
- Hashed passwords, expiring server sessions, login attempt limits, same-origin write checks, and an audit trail.
- Client visa requirements: the 12-item agency checklist, private PDF/JPG/PNG uploads, downloads, and administrator review with correction messages. Original and conditional requirements are identified separately.

## Client requirement uploads

Clients open **My documents** and follow a step-by-step wizard: twelve requirements and a final summary, with Back/Next navigation and a custom jump dropdown. Choose **Upload document** on an applicable step. Each upload accepts one PDF, JPG, or PNG up to 4 MiB; a requirement can hold up to 10 files. Files save immediately, and clients can return later. Conditional items can be skipped for now. The administrator opens **Client documents**, selects a customer, moves through the same wizard, downloads their files, and marks each copy **Reviewed** or **Needs changes** with feedback. Digital review does not represent receipt of physical originals or a visa decision.

For cloud storage, configure server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, apply the checked-in Supabase migration, then run `node --env-file=.env.local scripts/setup-document-storage.mjs`. This creates/verifies the private `systema-client-documents` bucket with the matching format and size limits. Configure the two server variables as production secrets in Vercel before deployment. Never prefix them with `VITE_` or commit their values. Custom server authentication checks file ownership on every listing/download; the browser never receives the service key or object paths. Document metadata remains in the private `systema` schema with RLS enabled.

Local SQLite installations store files in ignored `data/documents` (override with `SYSTEMA_DOCUMENTS_DIR`). Back up both the SQLite database and that directory. Cloud installations require the private Storage bucket instead of a temporary deployment filesystem. Failed metadata writes attempt to remove only the newly uploaded object; storage operators should reconcile unreferenced objects if cleanup fails.

## Financial rules

Amounts are stored as integer centavos. Total booking value is base fare plus taxes/charges minus discounts. The base fare covers all passengers and is never multiplied a second time. Gross sales exclude cancelled bookings. Collections use payment dates, expenses use expense dates, and sales use booking dates.

**Net cash movement** is actual received payments less recorded paid expenses. **Estimated booking margin** is booked sales less estimated supplier costs. Estimates do not also count as paid expenses. Current receivables filter bookings by the selected booking-date period and use all payments posted to date; the screen explicitly identifies this basis.

Posted payments and expenses remain in history. Duplicate payment/expense retries use request identifiers and do not create an additional financial record. Payments cannot exceed the balance. A paid booking cannot be cancelled or have its customer/service/fare changed; refund and reversal workflows are not implemented in this version.

This version covers the manuscript's central booking, payment, expense, and analytics workflows and the user's subsequent request for predictive analytics. Full accrual accounting, manual journal entries, supplier invoices/payables, and a complete balance sheet remain future work. Payment receipts are internal transaction documents, not registered tax invoices. No payment gateways or external accounting integrations are included.

## Predictive analytics

The API reads persisted records and excludes cancelled bookings, the first observed month (possibly incomplete), and the current partial month. Missing months inside the observed span count as zero. At least three remaining completed months are needed; with fewer than five, the historical average is used. With five or more, historical average, last-month, and drift benchmarks are compared by one-month rolling-origin RMSE using training windows of at least three months. Only earlier observations enter each backtest. The method with lowest RMSE generates the forecast; estimates and indicative ranges are nonnegative integers (centavos or booking counts).

Ranges use 1.96 × one-month RMSE × square root of the horizon, or historical variation without backtests. They are labeled **indicative ranges**, not calibrated confidence intervals. One-month validation does not establish longer-horizon accuracy. No seasonality, holidays, campaigns, or external predictors are modeled. Limited history and fictional sample data are identified in the UI. Predictions are planning aids and remain separate from recorded reports.

Method references: [benchmark forecasting methods](https://otexts.com/fpp3/simple-methods.html) and [rolling-origin validation](https://otexts.com/fpp3/tscv.html). Interface research: [Linear dashboards](https://linear.app/docs/dashboards), [React component design](https://react.dev/learn/thinking-in-react), and [Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite).

For frontend development, run `npm run dev` on the same port; Vite provides hot reload while the Node server handles APIs. Production builds emit React assets in `dist/client` and an embedded-asset Worker in `dist/server`.

## Build and verify

```powershell
npm test
npm run build
```

The build emits `dist/server/index.js`, an ESM Cloudflare Worker with the website's assets embedded. `.openai/hosting.json` declares the D1 `DB` binding. `db/schema.ts` defines the schema and the checked-in Drizzle migrations are applied before hosted deployment. Runtime requests do not create tables. `src/database.mjs` provides the matching local SQLite adapter.

Tests cover centavo precision, partial/full payments, overpayment rejection, paid booking protection, idempotent retries, required supplier linkage, client isolation, single-administrator constraints, request acceptance/decline, same-origin checks, login limits, and sample data integrity. Test-only passwords in tests are used exclusively for isolated temporary databases.

The original Sites deployment starts private and requires the signed-in Site owner for setup. The Vercel deployment uses the pre-provisioned administrator instead and opens directly to the login page.

## Account migration

Migration 0002 retains the earliest existing administrator, converts all other account roles to Client, and links legacy clients to a matching customer email when available. It preserves customers, bookings, payments, and expenses. Existing sessions are invalidated once so users sign in under the new access rules. Legacy clients without a matching customer must be linked by the administrator. A unique partial index prevents a second administrator, and a unique customer link prevents multiple accounts for the same customer. The sole administrator cannot be disabled or demoted through the API.

Custom form controls use shared tokens in `src/styles.css`: `--control-radius`, `--control-border`, `--control-surface`, and `--control-focus`. Dropdowns support keyboard selection and type-ahead; calendars support typed ISO dates and custom month/year selection. Both work inside record dialogs. The sidebar expands on hover or keyboard focus, can be pinned open, and becomes a button-operated drawer on mobile. Scrollbars are hidden while wheel, touch, and keyboard scrolling remain available.

Administrator and client accounts use the avatar menu at the top right. Sign out opens a confirmation dialog; Cancel, the close button, or Escape keeps the session active. Confirming ends the server session and returns to login.

Login and registration share a responsive coastal design with custom generated artwork, subtle entrance animations, and system light/dark and reduced-motion support. See [login design notes and image provenance](docs/login-design.md).

Administrator and client workspaces use a light blue design with grouped navigation, an actionable overview, consistent tables/forms, and responsive charts. See [workspace design and verification notes](docs/workspace-design.md).
