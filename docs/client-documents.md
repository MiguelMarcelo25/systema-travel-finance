# Client visa requirements

The client portal reproduces the twelve requirements in the user-supplied agency checklist, including originals, conditional documents, the BDO alternative, the processing note, and passport release note. These are agency-provided instructions rather than independently verified embassy rules.

Clients use **My documents** to upload a PDF, JPG, or PNG against each requirement. The administrator uses **Client documents** to select a customer and review individual files. A correction outcome requires a message. Review of a copy remains separate from physical document delivery and visa approval.

Document bytes are stored in the private `systema-client-documents` Supabase bucket. A server-only service key accesses Storage; metadata uses the restricted PostgreSQL application role in the private `systema` schema. Clients cannot list another customer's submissions or download their files. Downloads remain authenticated server responses without public object URLs. Filenames never become object paths. MIME signatures, extensions, size limits, same-origin writes, and per-requirement counts are checked on the server. Unique request identifiers prevent duplicate retries; failed metadata writes attempt cleanup.

Verification completed:

- 28 automated checks passed; one existing opt-in remote financial-concurrency check skipped. Document tests cover anonymous access, client ownership, administrator permissions, file type/size validation, retry deduplication, correction messages, downloads, the ten-file limit, and storage cleanup on a failed database write.
- PostgreSQL integration checks exercise document upload/list/review/download and private schema grants; SQLite uses the same API.
- Both frontend/Vercel and embedded Worker builds passed. The active upload deployment is Vercel with Supabase Storage; the original Worker requires a Storage adapter before it can enable uploads.
- An isolated SQLite preview with fictional accounts exercised the real private Supabase bucket through the browser. Upload succeeded; downloaded bytes matched the fixture's SHA-256; public object access failed; administrator corrections appeared after the client signed in again. No production customer or submission records were created for these checks.
- At a 390px viewport, the checklist uses one column and the upload dialog fits without horizontal overflow. Desktop uses two checklist columns. Keyboard dialog and custom dropdown behavior use the existing shared components.
- The Supabase migration enables RLS and denies `anon` and `authenticated` table access. The database advisors reported no issues after migration.

The isolated test object's exact path is recorded in ignored `.sites-runtime/document-test-objects.json` for cleanup. Upload and setup credentials remain ignored, server-side configuration.
