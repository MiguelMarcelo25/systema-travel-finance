import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import pgTypes from 'pg';
import { postgresDatabase, postgresQuery } from '../src/postgres.mjs';
import { handleApi } from './verified-fixture.mjs';
import { handleApi as accountApi } from '../src/api.mjs';

test('Postgres SQL preserves literals and parameter order', () => {
  assert.deepEqual(postgresQuery("SELECT 'users ? changes()' FROM users WHERE email=? AND changes()>0", ['email'], 2), {
    text: "SELECT 'users ? changes()' FROM \"systema\".users WHERE email=$1 AND $2>0", values: ['email', 2]
  });
});

test('Postgres supports private clients, approvals, exact payments and transactional rollback', async t => {
  const pg = new PGlite();
  t.after(() => pg.close());
  await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await pg.exec(readFileSync('supabase/migrations/20261006235813_systema_postgres.sql', 'utf8'));
  await pg.exec(readFileSync('supabase/migrations/20261007050049_visa_documents.sql', 'utf8'));
  await pg.exec(readFileSync('supabase/migrations/20261009000000_account_security.sql', 'utf8'));
  await pg.exec(readFileSync('supabase/migrations/20261012120817_revenue_countries.sql', 'utf8'));
  const query = async (input, args) => {
    const result = await pg.query(typeof input === 'string' ? input : input.text, args || input.values);
    for (const row of result.rows) for (const field of result.fields) {
      if ([20, 1700].includes(field.dataTypeID) && row[field.name] !== null)
        row[field.name] = pgTypes.types.getTypeParser(field.dataTypeID)(String(row[field.name]));
    }
    return { ...result, rowCount: result.affectedRows || 0 };
  };
  const DB = postgresDatabase({ query, async connect() { return { query, release() {} }; }, end() {} });
  const call = async (path, data, cookie = '') => {
    const response = await handleApi(new Request('https://systema.example/api/' + path, {
      method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', cookie },
      body: data ? JSON.stringify(data) : undefined
    }), { DB, LOCAL: true });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const admin = await call('login', { email: 'admin@example.com', password: 'Postgres-test-1234' });
  assert.equal(admin.status, 200);
  const customer = await call('customers', { name: 'Traveler', email: 'client@example.com', phone: '09170000000' }, admin.cookie);
  assert.equal(customer.status, 200);
  const service = await call('packages', { name: 'Island escape', destination: 'Palawan', country: 'PH', category: 'Tour package', price: '1000.25' }, admin.cookie);
  assert.equal(service.status, 200);
  const account = await call('users', { name: 'Traveler', email: 'client@example.com', role: 'Client', customer_id: customer.data.id, password: 'Postgres-test-1234' }, admin.cookie);
  assert.equal(account.status, 200);
  const client = await call('login', { email: 'client@example.com', password: 'Postgres-test-1234' });
  assert.equal(client.status, 200);
  const objects = new Map();
  const STORAGE = { async upload(path, bytes) { objects.set(path, new Blob([bytes])); }, async download(path) { return objects.get(path); }, async remove(path) { objects.delete(path); } };
  const form = new FormData();
  form.set('file', new File(['%PDF-1.4 fictional database test'], 'test.pdf', { type: 'application/pdf' }));
  form.set('requirement_id', 'visa-form'); form.set('request_id', crypto.randomUUID());
  const uploaded = await handleApi(new Request('https://systema.example/api/documents/upload', { method: 'POST', headers: { cookie: client.cookie }, body: form }), { DB, STORAGE, LOCAL: true });
  assert.equal(uploaded.status, 200);
  const document = await uploaded.json();
  assert.equal((await call('documents', null, client.cookie)).data.documents[0].id, document.id);
  assert.equal((await call('documents/review', { id: document.id, status: 'Needs changes', notes: 'Please upload a clearer copy.' }, admin.cookie)).status, 200);
  assert.equal((await call('documents', null, client.cookie)).data.documents[0].notes, 'Please upload a clearer copy.');
  const download = await handleApi(new Request('https://systema.example/api/documents/file?id=' + document.id, { headers: { cookie: client.cookie } }), { DB, STORAGE, LOCAL: true });
  assert.equal(download.status, 200); assert.equal(await download.text(), '%PDF-1.4 fictional database test');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const request = await call('requests', { package_id: service.data.id, travel_date: today, passengers: 1, request_id: 'req-1' }, client.cookie);
  assert.equal(request.status, 200);
  const accepted = await call('requests/decision', { id: request.data.id, decision: 'Accepted', base: '1000.25', tax: '10.50', discount: '0.25', supplier_cost: '500' }, admin.cookie);
  assert.equal(accepted.status, 200);
  assert.equal((await call('requests/decision', { id: request.data.id, decision: 'Declined', decision_notes: 'duplicate' }, admin.cookie)).status, 409);
  const payment = { booking_id: accepted.data.booking_id, amount: '510.50', date: today, method: 'Cash', reference: '', request_id: 'pay-1' };
  assert.equal((await call('payments', payment, admin.cookie)).status, 200);
  assert.equal((await call('payments', payment, admin.cookie)).status, 200);
  assert.equal((await call('payments', { ...payment, amount: '500.01', request_id: 'over' }, admin.cookie)).status, 409);
  assert.equal((await call('payments', { ...payment, amount: '500', request_id: 'pay-2' }, admin.cookie)).status, 200);
  const state = (await call('data', null, client.cookie)).data;
  assert.equal(state.bookings[0].total, 101050);
  assert.equal(state.bookings[0].paid, 101050);
  const revenue = (await call('revenue-analytics?country=PH', null, admin.cookie)).data;
  assert.equal(revenue.total, 101050); assert.equal(revenue.bestCountries[0].name, 'Philippines');
  assert.equal(state.payments.length, 2);
  assert.equal(state.expenses.length, 0);
  assert.equal(state.users.length, 0);
  assert.equal((await call('forecast', null, client.cookie)).status, 403);
  assert.equal((await call('forecast', null, admin.cookie)).status, 200);
  const second = await call('requests', { package_id: service.data.id, travel_date: today, passengers: 1, request_id: 'req-2' }, client.cookie);
  assert.equal((await call('requests/decision', { id: second.data.id, decision: 'Declined', decision_notes: 'No availability' }, admin.cookie)).status, 200);
  await assert.rejects(DB.batch([
    DB.prepare("INSERT INTO settings(key,value) VALUES('rollback-test','value')"),
    DB.prepare("INSERT INTO settings(key,value) VALUES('agency','duplicate')")
  ]), error => error.code === '23505');
  assert.equal(await DB.prepare("SELECT * FROM settings WHERE key='rollback-test'").first(), null);
  const registration = { name: 'Registered traveler', email: 'registered@example.com', phone: '1', password: 'Registered-test-1234', confirm_password: 'Registered-test-1234', role: 'Administrator', customer_id: customer.data.id };
  const registered = await call('register', registration);
  assert.equal(registered.status, 200);
  const own = (await call('data', null, registered.cookie)).data;
  assert.equal(own.user.role, 'Client'); assert.notEqual(own.user.customer_id, customer.data.id);
  assert.equal(own.bookings.length, 0); assert.equal(own.payments.length, 0);
  assert.equal((await call('register', registration)).status, 409);
  assert.equal((await call('register', { ...registration, email: 'client@example.com' })).status, 409);
  // Exercise real token consumption on Postgres, without the preverified fixture.
  const messages=[];
  const securityCall=async(path,data)=>{
    const response=await accountApi(new Request('https://systema.example/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),{DB,LOCAL:true,APP_URL:'https://systema.example',MAIL:{async send(message){messages.push(message);}}});
    return {status:response.status,data:await response.json()};
  };
  await securityCall('forgot-password',{email:'admin@example.com'});
  const token=new URLSearchParams(new URL(messages.at(-1).text.match(/https:\/\/\S+/)[0]).hash.slice(1)).get('token');
  assert.equal((await securityCall('reset-password',{token,password:'New-postgres-test-1234',confirm_password:'New-postgres-test-1234'})).status,200);
  assert.equal((await securityCall('reset-password',{token,password:'New-postgres-test-1234',confirm_password:'New-postgres-test-1234'})).status,400);
  assert.equal((await call('data',null,admin.cookie)).status,401);
  await assert.rejects(DB.prepare("INSERT INTO users(id,name,email,role,password,created) VALUES('second','Second','second@example.com','Administrator','hash','now')").run(), error => error.code === '23505');
  await pg.exec('SET ROLE anon;');
  await assert.rejects(pg.query('SELECT * FROM systema.users'), error => error.code === '42501');
  await assert.rejects(pg.query('SELECT * FROM systema.client_documents'), error => error.code === '42501');
  await assert.rejects(pg.query('SELECT * FROM systema.account_tokens'), error => error.code === '42501');
  await pg.exec('RESET ROLE; SET ROLE systema_app;');
  assert.equal((await pg.query('SELECT COUNT(*)::int count FROM systema.users')).rows[0].count, 3);
  assert.equal((await pg.query('SELECT COUNT(*)::int count FROM systema.client_documents')).rows[0].count, 1);
  await pg.exec('RESET ROLE;');
});
