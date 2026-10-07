-- Application tables are private. Only the server's restricted login can use them.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'systema_app') THEN
    CREATE ROLE systema_app NOLOGIN NOINHERIT;
  END IF;
END $$;
CREATE SCHEMA systema;
REVOKE ALL ON SCHEMA systema FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA systema TO systema_app;

CREATE TABLE systema.customers (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  phone text NOT NULL, created text NOT NULL,
  record_order bigint GENERATED ALWAYS AS IDENTITY
);
CREATE TABLE systema.users (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('Administrator','Client')),
  password text NOT NULL, active integer NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created text NOT NULL, customer_id text UNIQUE REFERENCES systema.customers(id),
  record_order bigint GENERATED ALWAYS AS IDENTITY,
  CHECK ((role='Administrator' AND customer_id IS NULL) OR (role='Client' AND customer_id IS NOT NULL))
);
CREATE UNIQUE INDEX users_single_administrator ON systema.users(role) WHERE role='Administrator';
CREATE TABLE systema.sessions (
  token text PRIMARY KEY, user_id text NOT NULL REFERENCES systema.users(id), expires bigint NOT NULL
);
CREATE INDEX sessions_user_idx ON systema.sessions(user_id);
CREATE INDEX sessions_expires_idx ON systema.sessions(expires);
CREATE TABLE systema.packages (
  id text PRIMARY KEY, name text NOT NULL, destination text NOT NULL, category text NOT NULL,
  price bigint NOT NULL CHECK (price>=0), active integer NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  record_order bigint GENERATED ALWAYS AS IDENTITY
);
CREATE TABLE systema.bookings (
  id text PRIMARY KEY, customer_id text NOT NULL REFERENCES systema.customers(id),
  package_id text REFERENCES systema.packages(id), service text NOT NULL, destination text NOT NULL,
  category text NOT NULL, date text NOT NULL, travel_date text NOT NULL,
  passengers integer NOT NULL CHECK (passengers BETWEEN 1 AND 500),
  base bigint NOT NULL CHECK (base>=0), tax bigint NOT NULL CHECK (tax>=0),
  discount bigint NOT NULL CHECK (discount>=0), supplier_cost bigint NOT NULL CHECK (supplier_cost>=0),
  total bigint NOT NULL CHECK (total>0 AND total=base+tax-discount),
  status text NOT NULL CHECK (status IN ('Pending','Confirmed','Completed','Cancelled')),
  notes text NOT NULL DEFAULT '', created_by text NOT NULL REFERENCES systema.users(id),
  record_order bigint GENERATED ALWAYS AS IDENTITY
);
CREATE INDEX bookings_customer_idx ON systema.bookings(customer_id);
CREATE INDEX bookings_date_idx ON systema.bookings(date);
CREATE INDEX bookings_package_idx ON systema.bookings(package_id);
CREATE INDEX bookings_creator_idx ON systema.bookings(created_by);
CREATE TABLE systema.payments (
  id text PRIMARY KEY, booking_id text NOT NULL REFERENCES systema.bookings(id),
  amount bigint NOT NULL CHECK (amount>0), date text NOT NULL, method text NOT NULL,
  reference text NOT NULL, created_by text NOT NULL REFERENCES systema.users(id),
  request_id text NOT NULL UNIQUE, record_order bigint GENERATED ALWAYS AS IDENTITY
);
CREATE INDEX payments_booking_idx ON systema.payments(booking_id);
CREATE INDEX payments_date_idx ON systema.payments(date);
CREATE INDEX payments_creator_idx ON systema.payments(created_by);
CREATE TABLE systema.expenses (
  id text PRIMARY KEY, description text NOT NULL, category text NOT NULL,
  amount bigint NOT NULL CHECK (amount>0), date text NOT NULL, payee text NOT NULL,
  booking_id text REFERENCES systema.bookings(id), created_by text NOT NULL REFERENCES systema.users(id),
  request_id text NOT NULL UNIQUE, record_order bigint GENERATED ALWAYS AS IDENTITY
);
CREATE INDEX expenses_booking_idx ON systema.expenses(booking_id);
CREATE INDEX expenses_date_idx ON systema.expenses(date);
CREATE INDEX expenses_creator_idx ON systema.expenses(created_by);
CREATE TABLE systema.audit (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES systema.users(id), action text NOT NULL,
  entity_id text NOT NULL, created text NOT NULL, record_order bigint GENERATED ALWAYS AS IDENTITY
);
CREATE INDEX audit_user_idx ON systema.audit(user_id);
CREATE TABLE systema.settings (key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE systema.auth_attempts (key text PRIMARY KEY, attempts integer NOT NULL, started bigint NOT NULL);
CREATE TABLE systema.booking_requests (
  id text PRIMARY KEY, customer_id text NOT NULL REFERENCES systema.customers(id),
  package_id text NOT NULL REFERENCES systema.packages(id), travel_date text NOT NULL,
  passengers integer NOT NULL CHECK (passengers BETWEEN 1 AND 500), notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Accepted','Declined')),
  requested_at text NOT NULL, reviewed_by text REFERENCES systema.users(id), reviewed_at text,
  decision_notes text NOT NULL DEFAULT '', booking_id text REFERENCES systema.bookings(id),
  request_id text NOT NULL UNIQUE, record_order bigint GENERATED ALWAYS AS IDENTITY
);
CREATE INDEX requests_customer_idx ON systema.booking_requests(customer_id);
CREATE INDEX requests_status_idx ON systema.booking_requests(status);
CREATE INDEX requests_package_idx ON systema.booking_requests(package_id);
CREATE INDEX requests_reviewer_idx ON systema.booking_requests(reviewed_by);
CREATE INDEX requests_booking_idx ON systema.booking_requests(booking_id);

GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA systema TO systema_app;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA systema TO systema_app;
DO $$ DECLARE relation record; BEGIN
  FOR relation IN SELECT tablename FROM pg_tables WHERE schemaname='systema' LOOP
    EXECUTE format('ALTER TABLE systema.%I ENABLE ROW LEVEL SECURITY', relation.tablename);
    EXECUTE format('CREATE POLICY server_access ON systema.%I TO systema_app USING (true) WITH CHECK (true)', relation.tablename);
  END LOOP;
END $$;
