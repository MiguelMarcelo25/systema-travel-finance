import pg from 'pg';
import { readFileSync } from 'node:fs';

const tables = new Set(['users', 'sessions', 'customers', 'packages', 'bookings', 'payments', 'expenses', 'audit', 'settings', 'auth_attempts', 'booking_requests']);
const safeNumber = value => {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('Database amount exceeds safe integer precision.');
  return number;
};
pg.types.setTypeParser(20, safeNumber); // BIGINT amounts and timestamps
pg.types.setTypeParser(1700, safeNumber); // SUM(BIGINT) returns NUMERIC

// Keep the existing parameterized API queries usable with SQLite and Postgres.
// Quoted strings are never rewritten; parameters always remain bound values.
export function postgresQuery(sql, args = [], previousChanges = 0, schema = 'systema') {
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Invalid database schema.');
  let index = 0;
  const values = [];
  const text = sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|changes\(\)|[a-zA-Z_][a-zA-Z0-9_]*|\?/g, token => {
    if (token === '?' || token === 'changes()') {
      values.push(token === '?' ? args[index++] : previousChanges);
      return '$' + values.length;
    }
    if (token === 'rowid') return 'record_order';
    if (tables.has(token)) return '"' + schema + '".' + token;
    return token;
  });
  if (index !== args.length) throw new Error('Query parameter count mismatch.');
  return { text, values };
}

export function postgresDatabase(pool, { schema = 'systema' } = {}) {
  const wrap = (sql, args = []) => ({
    sql, args,
    bind(...values) { return wrap(sql, values); },
    async first() { return (await pool.query(postgresQuery(sql, args, 0, schema))).rows[0] ?? null; },
    async all() { return { results: (await pool.query(postgresQuery(sql, args, 0, schema))).rows }; },
    async run() { return { meta: { changes: (await pool.query(postgresQuery(sql, args, 0, schema))).rowCount } }; }
  });
  return {
    prepare: wrap,
    async batch(statements) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Serialize short financial writes across every serverless instance.
        // This preserves balance/approval guards under concurrent requests.
        await client.query('SELECT pg_advisory_xact_lock(1937339233)');
        const results = [];
        let changes = 0;
        for (const statement of statements) {
          const result = await client.query(postgresQuery(statement.sql, statement.args, changes, schema));
          changes = result.rowCount;
          results.push({ meta: { changes } });
        }
        await client.query('COMMIT');
        return results;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
    close() { return pool.end(); }
  };
}

export function openPostgres(connectionString, { ca, schema = 'systema' } = {}) {
  if (!connectionString) throw new Error('DATABASE_URL is required.');
  const url = new URL(connectionString);
  // SSL options in a connection URL override pg's explicit certificate settings.
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) url.searchParams.delete(key);
  const pool = new pg.Pool({
    connectionString: url.toString(), max: 1,
    connectionTimeoutMillis: 10000, idleTimeoutMillis: 20000,
    ssl: { rejectUnauthorized: true, ca: ca || readFileSync(new URL('../supabase/certs/prod-ca-2021.crt', import.meta.url), 'utf8') }
  });
  pool.on('error', error => console.error('Systema database connection:', error.code || error.name));
  return postgresDatabase(pool, { schema });
}
