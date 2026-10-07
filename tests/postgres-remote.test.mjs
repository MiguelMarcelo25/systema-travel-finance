import test from 'node:test';
import assert from 'node:assert/strict';
import { openPostgres } from '../src/postgres.mjs';
import { handleApi } from '../src/api.mjs';

// Provision the isolated systema_verification schema before opting into this test.
test('Supabase prevents concurrent overpayments and duplicate approvals', { skip: !process.env.SYSTEMA_TEST_DATABASE_URL }, async t => {
  const DB = openPostgres(process.env.SYSTEMA_TEST_DATABASE_URL, { schema: 'systema_verification' });
  const parallelDB = openPostgres(process.env.SYSTEMA_TEST_DATABASE_URL, { schema: 'systema_verification' });
  t.after(async () => { await DB.close(); await parallelDB.close(); });
  const call = async (path, data, cookie = '', database = DB) => {
    const response = await handleApi(new Request('https://systema-test.example/api/' + path, {
      method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', cookie },
      body: data ? JSON.stringify(data) : undefined
    }), { DB: database, LOCAL: true });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const admin = await call('login', { email: 'isolated-admin@example.com', password: 'Remote-testing-1234' });
  assert.equal(admin.status, 200);
  const customer = await call('customers', { name: 'Isolated traveler', email: 'isolated-client@example.com', phone: '1' }, admin.cookie);
  const service = await call('packages', { name: 'Isolated service', destination: 'Test', category: 'Tour package', price: '1000' }, admin.cookie);
  assert.equal(customer.status, 200); assert.equal(service.status, 200);
  assert.equal((await call('users', { name: 'Isolated client', email: 'isolated-client@example.com', role: 'Client', customer_id: customer.data.id, password: 'Remote-testing-1234' }, admin.cookie)).status, 200);
  const client = await call('login', { email: 'isolated-client@example.com', password: 'Remote-testing-1234' });
  assert.equal(client.status, 200);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const request = await call('requests', { package_id: service.data.id, travel_date: today, passengers: 1, request_id: 'concurrent-request' }, client.cookie);
  assert.equal(request.status, 200);
  const decision = { id: request.data.id, decision: 'Accepted', base: '1000', tax: '0', discount: '0', supplier_cost: '500' };
  const decisions = await Promise.all([call('requests/decision', decision, admin.cookie), call('requests/decision', decision, admin.cookie, parallelDB)]);
  assert.deepEqual(decisions.map(x => x.status).sort(), [200, 409]);
  const booking = decisions.find(x => x.status === 200).data.booking_id;
  const payment = { booking_id: booking, amount: '600', date: today, method: 'Cash', reference: '' };
  const payments = await Promise.all([
    call('payments', { ...payment, request_id: 'concurrent-payment-a' }, admin.cookie),
    call('payments', { ...payment, request_id: 'concurrent-payment-b' }, admin.cookie, parallelDB)
  ]);
  assert.deepEqual(payments.map(x => x.status).sort(), [200, 409]);
  const state = (await call('data', null, client.cookie)).data;
  assert.equal(state.bookings.length, 1); assert.equal(state.bookings[0].paid, 60000);
  assert.equal(state.payments.length, 1); assert.equal(state.requests[0].status, 'Accepted');
  assert.equal(state.customers.length, 1); assert.equal(state.expenses.length, 0);
  assert.equal((await call('forecast', null, admin.cookie)).status, 200);
});
