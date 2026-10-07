# Client visa requirements

The client portal reproduces the twelve requirements in the user-supplied agency checklist, including originals, conditional documents, the BDO alternative, the processing note, and passport release note. These are agency-provided instructions rather than independently verified embassy rules.

Clients use **My documents** to follow a thirteen-step wizard: twelve individual requirements and a final summary. Each requirement supports PDF, JPG, or PNG uploads, Back/Next navigation, and a custom jump dropdown. Conditional items can be skipped for now; skipped navigation does not declare a document inapplicable or approved. Files save immediately. On return, clients start at the first requirement without a file or with a correction request, or the summary if all twelve items have files. Every requirement remains accessible from the dropdown and summary.

The administrator uses **Client documents** to select a customer and review one requirement at a time using the same wizard. Changing customers resets the wizard to the first requirement. A correction outcome requires a message. Review of a copy remains separate from physical document delivery and visa approval. Agency notes remain available in an expandable section.

Document bytes are stored in the private `systema-client-documents` Supabase bucket. A server-only service key accesses Storage; metadata uses the restricted PostgreSQL application role in the private `systema` schema. Clients cannot list another customer's submissions or download their files. Downloads remain authenticated server responses without public object URLs. Filenames never become object paths. MIME signatures, extensions, size limits, same-origin writes, and per-requirement counts are checked on the server. Unique request identifiers prevent duplicate retries; failed metadata writes attempt cleanup.

Verification completed:

- 28 automated checks passed; one existing opt-in remote financial-concurrency check skipped. Document tests cover anonymous access, client ownership, administrator permissions, file type/size validation, retry deduplication, correction messages, downloads, the ten-file limit, and storage cleanup on a failed database write.
- PostgreSQL integration checks exercise document upload/list/review/download and private schema grants; SQLite uses the same API.
- Both frontend/Vercel and embedded Worker builds passed. The active upload deployment is Vercel with Supabase Storage; the original Worker requires a Storage adapter before it can enable uploads.
- An isolated SQLite preview with fictional accounts exercised the real private Supabase bucket through the browser. Upload succeeded; downloaded bytes matched the fixture's SHA-256; public object access failed; administrator corrections appeared after the client signed in again. No production customer or submission records were created for these checks.
- The wizard presents one requirement per step; desktop has a guidance panel, and smaller screens stack the guidance below the step. The upload dialog and dropdown use the existing custom accessible components. The progress indicator describes navigation position, while the summary separately counts uploaded files and corrections.
- The Supabase migration enables RLS and denies `anon` and `authenticated` table access. The database advisors reported no issues after migration.
- Wizard browser checks used fictional local accounts: Back/Next, keyboard jump-to-summary, conditional skipping, summary-to-requirement navigation, saved uploads after refresh, administrator review, and resetting to step one when selecting another customer. The 390px requirement and summary views had no horizontal overflow, and step navigation focused the new heading.

The isolated test object's exact path is recorded in ignored `.sites-runtime/document-test-objects.json` for cleanup. Upload and setup credentials remain ignored, server-side configuration.
