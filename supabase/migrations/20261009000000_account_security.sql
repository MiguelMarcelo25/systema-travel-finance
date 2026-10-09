ALTER TABLE systema.users ADD COLUMN email_verified_at text;
CREATE TABLE systema.account_tokens (
 token_hash text PRIMARY KEY,
 user_id text NOT NULL REFERENCES systema.users(id),
 purpose text NOT NULL CHECK (purpose IN ('verify','reset')),
 email text NOT NULL,
 expires bigint NOT NULL
);
CREATE INDEX account_tokens_user_idx ON systema.account_tokens(user_id);
ALTER TABLE systema.account_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON systema.account_tokens FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON systema.account_tokens TO systema_app;
CREATE POLICY server_access ON systema.account_tokens TO systema_app USING (true) WITH CHECK (true);
