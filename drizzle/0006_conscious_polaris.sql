-- Add the deletion marker without rebuilding users or its referenced history.
ALTER TABLE users ADD COLUMN deleted_at text
  CONSTRAINT users_deleted_client_inactive
  CHECK (deleted_at IS NULL OR (role = 'Client' AND active = 0));
