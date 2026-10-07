import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/database.mjs';
import { handleApi } from '../src/api.mjs';
import { MAX_DOCUMENT_BYTES } from '../src/requirements.mjs';
const pdf = new TextEncoder().encode('%PDF-1.4\n% Fictional requirement test document\n%%EOF');
class MemoryStorage {
  files = new Map();
  async upload(path, bytes, mime) { this.files.set(path, new Blob([bytes], { type: mime })); }
  async download(path) { return this.files.get(path); }
  async remove(path) { this.files.delete(path); }
}
const form = (requirement = 'visa-form', bytes = pdf, name = 'fictional-form.pdf', type = 'application/pdf') => { const value = new FormData(); value.set('requirement_id', requirement); value.set('request_id', crypto.randomUUID()); value.set('file', new File([bytes], name, { type })); return value; };
test('client files persist with private ownership, reviewed outcomes, and strict upload validation', async t => {
  const DB = openDatabase(':memory:'), STORAGE = new MemoryStorage(); t.after(() => DB.close());
  const call = async (path, body, cookie = '', overrides = {}) => {
    const headers = { cookie }; if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await handleApi(new Request('https://systema.example/api/' + path, { method: body ? 'POST' : 'GET', headers, body: body ? body instanceof FormData ? body : JSON.stringify(body) : undefined }), { DB, STORAGE, LOCAL: true, ...overrides });
    return { status: response.status, data: response.headers.get('content-type').includes('application/json') ? await response.json() : new Uint8Array(await response.arrayBuffer()), headers: response.headers, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const admin = await call('setup', { name: 'Admin', agency: 'Test agency', email: 'admin@example.test', password: 'Document-tests-2026', demo: true });
  await call('users', { name: 'Client A', email: 'a@example.test', role: 'Client', customer_id: 'CUS-DEMO01', password: 'Document-tests-2026' }, admin.cookie);
  await call('users', { name: 'Client B', email: 'b@example.test', role: 'Client', customer_id: 'CUS-DEMO02', password: 'Document-tests-2026' }, admin.cookie);
  const a = await call('login', { email: 'a@example.test', password: 'Document-tests-2026' }), b = await call('login', { email: 'b@example.test', password: 'Document-tests-2026' });
  assert.equal((await call('documents/upload', form())).status, 401);
  assert.equal((await call('documents/upload', form(), admin.cookie)).status, 403);
  assert.equal((await call('documents/upload', form(), a.cookie, { STORAGE: undefined })).status, 503);
  assert.equal((await call('documents/upload', form('invalid'), a.cookie)).status, 400);
  assert.equal((await call('documents/upload', form('visa-form', new Uint8Array(), 'empty.pdf'), a.cookie)).status, 400);
  assert.equal((await call('documents/upload', form('visa-form', new Uint8Array(MAX_DOCUMENT_BYTES + 1), 'large.pdf'), a.cookie)).status, 413);
  assert.equal((await call('documents/upload', form('visa-form', new TextEncoder().encode('<script>bad</script>')), a.cookie)).status, 400);
  assert.equal((await call('documents/upload', form('visa-form', pdf, 'wrong.png', 'image/png'), a.cookie)).status, 400);
  assert.equal((await call('documents/upload', form('visa-form', pdf, 'wrong.exe'), a.cookie)).status, 400);
  const submission = form(); const upload = await call('documents/upload', submission, a.cookie); assert.equal(upload.status, 200);
  assert.equal((await call('documents/upload', submission, a.cookie)).data.id, upload.data.id);
  assert.equal((await call('documents/upload', submission, b.cookie)).status, 409);
  const docs = (await call('documents', undefined, a.cookie)).data.documents;
  assert.equal(docs.length, 1); assert.equal(docs[0].status, 'Pending review'); assert.equal(docs[0].customer_id, 'CUS-DEMO01'); assert.ok(!('storage_path' in docs[0]));
  assert.equal((await call('documents', undefined, b.cookie)).data.documents.length, 0);
  assert.equal((await call('documents?customer_id=CUS-DEMO01', undefined, b.cookie)).status, 403);
  assert.equal((await call('documents/file?id=' + upload.data.id, undefined, b.cookie)).status, 404);
  assert.equal((await call('documents/file?id=' + upload.data.id)).status, 401);
  const download = await call('documents/file?id=' + upload.data.id, undefined, a.cookie); assert.deepEqual(download.data, pdf); assert.match(download.headers.get('Content-Disposition'), /^attachment/); assert.match(download.headers.get('Cache-Control'), /no-store/);
  assert.equal((await call('documents/review', { id: upload.data.id, status: 'Reviewed' }, a.cookie)).status, 403);
  assert.equal((await call('documents/review', { id: upload.data.id, status: 'Needs changes' }, admin.cookie)).status, 400);
  assert.equal((await call('documents/review', { id: upload.data.id, status: 'Needs changes', notes: 'Please provide a clear scan.' }, admin.cookie)).status, 200);
  assert.equal((await call('documents', undefined, a.cookie)).data.documents[0].notes, 'Please provide a clear scan.');
  assert.equal((await call('documents/review', { id: upload.data.id, status: 'Reviewed', notes: 'Copy reviewed.' }, admin.cookie)).status, 200);
  assert.equal((await call('documents?customer_id=CUS-DEMO01', undefined, admin.cookie)).data.documents[0].status, 'Reviewed');
  assert.deepEqual((await call('documents/file?id=' + upload.data.id, undefined, admin.cookie)).data, pdf);
  for (let i = 1; i < 10; i++) assert.equal((await call('documents/upload', form(), a.cookie)).status, 200);
  assert.equal((await call('documents/upload', form(), a.cookie)).status, 409);
  assert.equal(STORAGE.files.size, 10);
  const failedDB = { ...DB, batch: async () => { throw Object.assign(new Error('Simulated failed metadata transaction'), { status: 503 }); } };
  assert.equal((await call('documents/upload', form('bank'), a.cookie, { DB: failedDB })).status, 503);
  assert.equal(STORAGE.files.size, 10, 'failed metadata insertion removes only its unreferenced upload');
  const crossOrigin = await handleApi(new Request('https://systema.example/api/documents/upload', { method: 'POST', headers: { origin: 'https://other.example', cookie: a.cookie }, body: form() }), { DB, STORAGE, LOCAL: true });
  assert.equal(crossOrigin.status, 403);
});
