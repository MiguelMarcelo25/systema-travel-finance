import test from 'node:test';
import assert from 'node:assert/strict';
import { forecastRecords } from '../src/forecast.mjs';
import { handleApi } from './verified-fixture.mjs';
import { openDatabase } from '../src/database.mjs';
const records = values => values.map((total, index) => ({ date: `2026-${String(index + 1).padStart(2, '0')}-15`, total, status: 'Completed' }));
test('forecasts exclude partial months, cancelled bookings, and future information', () => {
  const rows = records([100, 100, 100, 100, 100, 100]);
  const clean = forecastRecords(rows, { asOf: '2026-07-10' });
  const dirty = forecastRecords([...rows, { date: '2026-07-01', total: 999999 }, { date: '2026-08-01', total: 999999 }, { date: '2026-03-01', total: 999999, status: 'Cancelled' }], { asOf: '2026-07-10' });
  assert.deepEqual(clean, dirty); assert.equal(clean.history[0].month, '2026-02'); assert.equal(clean.forecast[0].month, '2026-07'); assert.equal(clean.forecast[0].value, 100);
});
test('missing months become zero and insufficient history produces no forecast', () => {
  const result = forecastRecords([{ date: '2026-01-15', total: 100 }, { date: '2026-03-10', total: 100 }], { asOf: '2026-04-01' });
  assert.equal(result.available, false); assert.deepEqual(result.history.map(row => row.value), [0, 100]); assert.deepEqual(result.forecast, []);
});
test('rolling-origin comparison selects drift for a known linear series', () => {
  const result = forecastRecords(records([100, 200, 300, 400, 500, 600, 700]), { asOf: '2026-08-10', horizon: 6 });
  assert.equal(result.model, 'drift'); assert.equal(result.evaluations[0].rmse, 0); assert.equal(result.forecast[0].value, 800); assert.equal(result.forecast.at(-1).value, 1300);
});
test('declining and count forecasts keep finite, nonnegative integer ranges', () => {
  for (const metric of ['sales', 'bookings', 'collections']) {
    const result = forecastRecords(records([600, 500, 400, 300, 200, 100]), { asOf: '2026-07-01', metric, horizon: 6 });
    for (const row of result.forecast) { assert.ok(Number.isSafeInteger(row.value)); assert.ok(row.low >= 0); assert.ok(row.low <= row.value); assert.ok(row.high >= row.value); }
  }
});
test('forecast API uses persisted records and rejects anonymous, client-role and invalid queries', async () => {
  const DB = openDatabase(':memory:');
  const call = (path, data, cookie = '') => handleApi(new Request('http://localhost/api/' + path, { method: data ? 'POST' : 'GET', headers: { 'content-type': 'application/json', cookie }, body: data ? JSON.stringify(data) : undefined }), { DB, LOCAL: true });
  assert.equal((await call('forecast')).status, 401);
  const setup = await call('setup', { name: 'Test administrator', email: 'admin@example.com', password: 'testing-only-1234', agency: 'Test agency', demo: true });
  const cookie = setup.headers.get('set-cookie').split(';')[0];
  const response = await call('forecast?metric=sales&horizon=3', null, cookie), result = await response.json();
  assert.equal(response.status, 200); assert.equal(result.demo, true); assert.equal(result.available, true); assert.equal(result.forecast.length, 3);
  assert.equal((await call('forecast?metric=profit', null, cookie)).status, 400);
  assert.equal((await call('forecast?horizon=7', null, cookie)).status, 400);
  assert.equal((await call('forecast?category=unknown', null, cookie)).status, 400);
  await call('users', { name: 'Client tester', email: 'booking@example.com', password: 'testing-only-1234', role: 'Client', customer_id: 'CUS-DEMO01' }, cookie);
  const login = await call('login', { email: 'booking@example.com', password: 'testing-only-1234' });
  assert.equal((await call('forecast', null, login.headers.get('set-cookie').split(';')[0])).status, 403);
  DB.close();
});
