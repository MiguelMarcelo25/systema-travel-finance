# Client account deletion

The administrator can delete active or inactive client accounts from **Accounts**. The confirmation names the client and email, starts keyboard focus on Cancel, and locks dismissal and repeated submissions while saving. The administrator account has no Delete action and is protected by the server and database.

`POST /api/users/delete` requires an authenticated, verified administrator and `{id, confirm_email}`. A changed email, missing account, deleted account, or administrator target cannot be deleted. In one transaction, the client is marked deleted and inactive, its password is discarded, its login email becomes a unique internal placeholder, its customer link is released, all sessions and account tokens are removed, and the administrator's deletion action is audited. Deleted identities are omitted from Accounts and cannot be reactivated using Edit access.

This is permanent account removal within the application, using a retained historical user row rather than cascading SQL deletion. Customer records, booking requests, bookings, payments, expenses, document files and uploader attribution, and existing audit entries remain intact. Public registration cannot claim an existing customer email or its history; an administrator may explicitly create a replacement account linked to the retained customer.

SQLite and Supabase migrations add `deleted_at` and prevent deleted accounts from becoming active or representing an administrator. PostgreSQL still requires live clients to have a linked customer. Apply the additive Supabase migration before releasing the API. Existing accounts and history are unchanged by the migration.

Tests cover administrator/client/anonymous authorization, confirmation mismatch, administrator protection, repeated deletion, stale edits, session and token revocation, credential erasure, database constraints, retained records and documents, and transaction rollback, including PostgreSQL execution.
