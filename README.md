# Systema

A working travel-agency booking and financial-monitoring website based on *Systema Manuscript.pdf*, especially the objectives, scope, system models, and prototypes on PDF pages 11–18 and 59–80.

## Run locally

Requires Node.js 24 or later. From this directory run:

```powershell
npm install
npm run build
npm start
```

Open http://localhost:4173. The first screen is a login form containing only Email and Password. On a fresh installation, the first successful sign-in creates the sole administrator (minimum password length: 10 characters). No default administrator credentials are shipped. Later sign-ins authenticate existing accounts. The administrator creates client accounts in **Accounts**, linking each account to a customer record. Sample fixtures are used only by isolated tests; client-facing login has no sample-data or registration options.

Data persists in `data/systema.sqlite`. Stop the server before copying the `data` directory for a complete local backup. The database and session credentials are excluded from Git and hosted build archives. Local and hosted databases are separate.

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

The site starts private. Hosted setup requires the signed-in Site owner. Staff access on the hosted site also requires access under the platform's sharing policy; application accounts do not override that outer access policy.

## Account migration

Migration 0002 retains the earliest existing administrator, converts all other account roles to Client, and links legacy clients to a matching customer email when available. It preserves customers, bookings, payments, and expenses. Existing sessions are invalidated once so users sign in under the new access rules. Legacy clients without a matching customer must be linked by the administrator. A unique partial index prevents a second administrator, and a unique customer link prevents multiple accounts for the same customer. The sole administrator cannot be disabled or demoted through the API.
