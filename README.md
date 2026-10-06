# Systema

A working travel-agency booking and financial-monitoring website based on *Systema Manuscript.pdf*, especially the objectives, scope, system models, and prototypes on PDF pages 11–18 and 59–80.

## Run locally

Requires Node.js 24 or later. From this directory run:

```powershell
npm install
npm start
```

Open http://localhost:4173. Create your administrator account on first launch. Sample records are optional and clearly identified as illustrative. No administrator credentials are shipped. Create additional staff in **Team & access**.

Data persists in `data/systema.sqlite`. Stop the server before copying the `data` directory for a complete local backup. The database and session credentials are excluded from Git and hosted build archives. Local and hosted databases are separate.

## Included workflows

- Customer records and booking history; travel-service catalog with active/inactive services.
- Create and update bookings; fare components, destination, travel date, passenger count, supplier estimates, and status.
- Partial and full payment recording; outstanding balance, printable booking invoices and payment acknowledgments.
- Paid supplier and operating expenses.
- Dashboard, historical trends, service and destination analytics, and per-booking estimated margin.
- Cash income statement, sales report, expense report, and dated receivables report, with CSV exports and print-to-PDF.
- Administrator, Booking staff, Accounting staff, and Finance manager roles, enforced at the API.
- Hashed passwords, expiring server sessions, login attempt limits, same-origin write checks, and an audit trail.

## Financial rules

Amounts are stored as integer centavos. Total booking value is base fare plus taxes/charges minus discounts. The base fare covers all passengers and is never multiplied a second time. Gross sales exclude cancelled bookings. Collections use payment dates, expenses use expense dates, and sales use booking dates.

**Net cash result** is actual received payments less recorded paid expenses. **Estimated gross margin** is booked sales less estimated supplier costs. Estimates do not also count as paid expenses. Receivables use payments up to the report's end date.

Posted payments and expenses remain in history. Duplicate payment/expense retries use request identifiers and do not create an additional financial record. Payments cannot exceed the balance. A paid booking cannot be cancelled or have its customer/service/fare changed; refund and reversal workflows are not implemented in this version.

This first version covers the manuscript's central booking, payment, expense, and analytics workflows. Full accrual accounting, manual journal entries, supplier invoices/payables, and a complete balance sheet remain future work. Payment acknowledgments are internal transaction documents, not a substitute for registered tax invoices. The manuscript contradicts itself about a Supplier API; this version follows its explicit scope exclusion of third-party integrations. No gateways, AI forecasts, or external accounting integrations are included.

## Build and verify

```powershell
npm test
npm run build
```

The build emits `dist/server/index.js`, an ESM Cloudflare Worker with the website's assets embedded. `.openai/hosting.json` declares the D1 `DB` binding. `db/schema.ts` defines the schema and the checked-in Drizzle migrations are applied before hosted deployment. Runtime requests do not create tables. `src/database.mjs` provides the matching local SQLite adapter.

Tests cover centavo precision, partial/full payments, overpayment rejection, paid booking protection, idempotent retries, required supplier linkage, role restrictions, same-origin checks, login limits, and sample data integrity. Test-only passwords in tests are used exclusively for isolated temporary databases.

The site starts private. Hosted setup requires the signed-in Site owner. Staff access on the hosted site also requires access under the platform's sharing policy; application accounts do not override that outer access policy.
