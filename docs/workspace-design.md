# Light workspace redesign

Systema's administrator and client workspaces use white surfaces, a cool neutral canvas, clear typography, and blue actions. `src/workspace.css` owns the product palette and layout. The body theme is attached by `WorkspaceHeader` while a workspace is mounted, including portaled calendars, dropdowns, and the account menu. Login and registration retain their independent coastal design.

The shared header provides agency/page context and the account menu. Navigation groups administration pages into workspace, operations, finance, insights, and administration. Hover and keyboard expansion, the logo-adjacent pin toggle, synchronized content movement, the mobile drawer, and invisible scrollbars remain available.

The overview uses recorded totals, pending request counts, upcoming journeys, recent bookings, and sales history. Empty agencies get a three-step guide that opens the existing customer, service, and booking forms. Zero activity is explained rather than drawing repeated zero labels. Charts adapt their SVG width and label density to their container using a cleaned-up ResizeObserver. Recorded and projected values retain distinct solid/dashed lines and an accessible data table.

Booking requests have status filters with actual counts. Clients can submit requests and follow administrator responses; administrator acceptance still creates a confirmed booking using the existing API. Forms, receipts, exports, permissions, and database calculations use the existing workflows.

## Verification

- Production frontend build completed and existing automated tests passed (27 passed; the opt-in remote database concurrency test remained skipped).
- An isolated in-memory preview with fictional fixtures exercised all administrative pages, search/status filters, custom calendars, forecast metric/horizon changes, booking dialogs, and mobile navigation at 390×844.
- A client submitted a request through the custom form; the administrator accepted it, and the request list showed the response and generated booking identifier.
- Sign-out Cancel retained the session; confirmation returned to login. Desktop sidebar expansion aligned the content edge with the sidebar edge. Mobile tables scrolled inside their containers without widening the page.
- No preview accounts or fictional transactions were added to production.
