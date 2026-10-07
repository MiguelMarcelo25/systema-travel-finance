-- Private document metadata. Document bytes live in a private Storage bucket.
CREATE TABLE systema.client_documents (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES systema.customers(id),
  requirement_id text NOT NULL CHECK (requirement_id IN ('visa-form','passport-photos','passport-bio','signed-passport','employment','bank','itr','guarantee','itr-explanation','prc','ibp','bdo')),
  file_name text NOT NULL, mime text NOT NULL CHECK (mime IN ('application/pdf','image/jpeg','image/png')),
  size integer NOT NULL CHECK (size BETWEEN 1 AND 4194304), storage_path text NOT NULL UNIQUE, request_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'Pending review' CHECK (status IN ('Pending review','Reviewed','Needs changes')),
  notes text NOT NULL DEFAULT '', created text NOT NULL,
  uploaded_by text NOT NULL REFERENCES systema.users(id),
  reviewed_by text REFERENCES systema.users(id), reviewed_at text
);
CREATE INDEX documents_customer_requirement_idx ON systema.client_documents(customer_id,requirement_id);
CREATE INDEX documents_uploader_idx ON systema.client_documents(uploaded_by);
CREATE INDEX documents_reviewer_idx ON systema.client_documents(reviewed_by);
ALTER TABLE systema.client_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON systema.client_documents FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON systema.client_documents TO systema_app;
CREATE POLICY server_access ON systema.client_documents TO systema_app USING (true) WITH CHECK (true);
