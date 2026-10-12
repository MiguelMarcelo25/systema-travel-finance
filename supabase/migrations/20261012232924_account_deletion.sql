ALTER TABLE systema.users ADD COLUMN deleted_at text;
ALTER TABLE systema.users DROP CONSTRAINT users_check;
ALTER TABLE systema.users ADD CONSTRAINT users_check
  CHECK ((role = 'Administrator' AND customer_id IS NULL)
    OR (role = 'Client' AND (customer_id IS NOT NULL OR deleted_at IS NOT NULL)));
ALTER TABLE systema.users ADD CONSTRAINT users_deleted_client_inactive
  CHECK (deleted_at IS NULL OR (role = 'Client' AND active = 0));
