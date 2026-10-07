// One-time owner provisioning. Run after `supabase db push`; never during builds.
import { randomBytes, randomUUID, pbkdf2Sync } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const project = process.argv[2], adminEmail = process.argv[3];
if (!/^[a-z]{20}$/.test(project || '') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail || '')) {
  throw new Error('Usage: node scripts/provision.mjs PROJECT_REF ADMIN_EMAIL');
}
const existing = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
if (existing.includes('DATABASE_URL=')) throw new Error('Already provisioned locally. Do not overwrite existing credentials.');
const pooler = new URL(readFileSync('supabase/.temp/pooler-url', 'utf8').trim());
if (pooler.username !== 'postgres.' + project) throw new Error('Linked Supabase project does not match.');
const appPassword = randomBytes(32).toString('hex');
const adminPassword = randomBytes(18).toString('base64url') + '!9';
const salt = randomUUID(), hash = salt + ':' + pbkdf2Sync(adminPassword, salt, 100000, 32, 'sha256').toString('hex');
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const sql = `BEGIN;
ALTER ROLE systema_app LOGIN PASSWORD ${quote(appPassword)};
INSERT INTO systema.users(id,name,email,role,password,created)
  SELECT ${quote('USR-' + randomUUID().slice(0, 8).toUpperCase())},'Administrator',${quote(adminEmail.toLowerCase())},'Administrator',${quote(hash)},${quote(new Date().toISOString())}
  WHERE NOT EXISTS (SELECT 1 FROM systema.users);
INSERT INTO systema.settings(key,value) VALUES('agency','Systema Travel'),('demo','false') ON CONFLICT(key) DO NOTHING;
COMMIT;`;
mkdirSync('.sites-runtime', { recursive: true });
const sqlFile = '.sites-runtime/provision.sql';
writeFileSync(sqlFile, sql, { mode: 0o600 });
const cli = process.env.SUPABASE_CLI || (process.platform === 'win32' ? join(process.env.LOCALAPPDATA, 'Systema', 'tools', 'supabase-2.120.0', 'supabase.exe') : 'supabase');
const result = spawnSync(cli, ['db', 'query', '--linked', '--project-ref', project, '--file', sqlFile, '--output', 'json'], { encoding: 'utf8', windowsHide: true });
if (result.status !== 0) throw new Error('Provisioning failed. Check the Supabase CLI connection.');
// Remove password-bearing SQL after it has been applied.
writeFileSync(sqlFile, '-- Provisioning completed.\n');
pooler.username = 'systema_app.' + project;
pooler.password = appPassword;
pooler.port = '6543';
writeFileSync('.env.local', existing + `\nDATABASE_URL=${pooler}\nSYSTEMA_ADMIN_EMAIL=${adminEmail.toLowerCase()}\n`, { mode: 0o600 });
writeFileSync('.sites-runtime/administrator-credentials.txt', `Systema administrator\nEmail: ${adminEmail.toLowerCase()}\nTemporary password: ${adminPassword}\n\nAfter signing in, change this password using Accounts > Edit administrator.\n`, { mode: 0o600 });
console.log('Database login and sole administrator provisioned. Credentials saved locally in ignored files.');
