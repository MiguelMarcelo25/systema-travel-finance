import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from './verified-fixture.mjs';
import { openDatabase } from '../src/database.mjs';

const payload = { name: 'New traveler', email: 'new@example.com', phone: '09170000000', password: 'Registration-test-1234', confirm_password: 'Registration-test-1234' };
function caller(DB) {
  return async (path, data, cookie = '', extraHeaders = {}) => {
    const response = await handleApi(new Request('http://localhost/api/' + path, {
      method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', cookie, ...extraHeaders },
      body: data ? JSON.stringify(data) : undefined
    }), { DB, LOCAL: true, CLIENT_IP: 'registration-test' });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
}

test('public registration creates a private Client account and never claims existing customers or administrator rights', async t => {
  const DB = openDatabase(':memory:'); t.after(() => DB.close()); const call = caller(DB);
  assert.equal((await call('register', payload)).status, 503);
  assert.equal((await DB.prepare('SELECT COUNT(*) count FROM users').first()).count, 0);
  const admin = await call('login', { email: 'admin@example.com', password: 'Administrator-test-1234' });
  const existing = await call('customers', { name: 'Existing traveler', email: 'existing@example.com', phone: 'old-phone' }, admin.cookie);
  assert.equal(existing.status, 200);
  assert.equal((await call('register', { ...payload, email: 'existing@example.com' })).status, 409);
  assert.equal((await call('register', { ...payload, email: 'admin@example.com' })).status, 409);
  assert.equal((await call('register', { ...payload, confirm_password: 'mismatch' })).status, 400);
  assert.equal((await call('register', { ...payload, password: 'short', confirm_password: 'short' })).status, 400);
  assert.equal((await call('register', payload, '', { origin: 'https://untrusted.example' })).status, 403);
  const registered = await call('register', { ...payload, role: 'Administrator', customer_id: existing.data.id, active: false });
  assert.equal(registered.status, 200);
  const own = (await call('data', null, registered.cookie)).data;
  assert.equal(own.user.role, 'Client'); assert.notEqual(own.user.customer_id, existing.data.id);
  assert.equal(own.customers.length, 1); assert.equal(own.customers[0].email, payload.email);
  assert.equal(own.bookings.length, 0); assert.equal(own.users.length, 0); assert.equal(own.expenses.length, 0);
  assert.equal((await call('users', {}, registered.cookie)).status, 403);
  assert.equal((await call('forecast', null, registered.cookie)).status, 403);
  assert.equal((await call('register', { ...payload, email: 'another@example.com' }, registered.cookie)).status, 409);
  assert.equal((await call('register', { ...payload, email: 'NEW@example.com' })).status, 409);
  assert.equal((await DB.prepare('SELECT COUNT(*) count FROM customers').first()).count, 2);
  assert.equal((await DB.prepare("SELECT COUNT(*) count FROM users WHERE role='Administrator'").first()).count, 1);
  assert.equal((await DB.prepare('SELECT name,phone FROM customers WHERE id=?').bind(existing.data.id).first()).name, 'Existing traveler');
  await call('logout', {}, registered.cookie);
  assert.equal((await call('login', { email: payload.email, password: payload.password })).status, 200);
});

test('registration attempts have a persistent per-client limit', async t => {
  const DB = openDatabase(':memory:'); t.after(() => DB.close()); const call = caller(DB);
  await call('login', { email: 'admin@example.com', password: 'Administrator-test-1234' });
  for (let index = 0; index < 10; index++) assert.equal((await call('register', { ...payload, password: 'short', confirm_password: 'short' })).status, 400);
  assert.equal((await call('register', payload)).status, 429);
  assert.equal((await DB.prepare('SELECT COUNT(*) count FROM customers').first()).count, 0);
  assert.equal((await DB.prepare('SELECT COUNT(*) count FROM users').first()).count, 1);
});
