import { visaRequirements, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from './requirements.mjs';
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const id = prefix => prefix + '-' + crypto.randomUUID().toUpperCase();
const now = () => new Date().toISOString();
export function documentMime(bytes) {
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-') return 'application/pdf';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)) return 'image/png';
  return null;
}
export async function handleDocuments(request, env, user, body) {
  const url = new URL(request.url), path = url.pathname, DB = env.DB;
  const q = (sql, ...args) => DB.prepare(sql).bind(...args);
  const one = (sql, ...args) => q(sql, ...args).first();
  const json = data => Response.json(data, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  const audit = (action, entity) => q('INSERT INTO audit(id,user_id,action,entity_id,created) VALUES(?,?,?,?,?)', id('LOG'), user.id, action, entity, now());
  const own = document => { if (!document || (user.role !== 'Administrator' && document.customer_id !== user.customer_id)) fail('Document not found.', 404); };
  if (path === '/api/documents' && request.method === 'GET') {
    const customer = user.role === 'Administrator' ? url.searchParams.get('customer_id') : user.customer_id;
    if (user.role === 'Client' && url.searchParams.has('customer_id') && url.searchParams.get('customer_id') !== user.customer_id) fail('This submission folder is unavailable.', 403);
    if (!customer) return json({ documents: [], storage_ready: !!env.STORAGE });
    const documents = (await q('SELECT id,customer_id,requirement_id,file_name,mime,size,status,notes,created,reviewed_at FROM client_documents WHERE customer_id=? ORDER BY created DESC,id DESC', customer).all()).results;
    return json({ documents, storage_ready: !!env.STORAGE });
  }
  if (path === '/api/documents/upload' && request.method === 'POST') {
    if (user.role !== 'Client') fail('Only clients can upload their requirements.', 403);
    if (!user.customer_id) fail('Ask the administrator to link your customer record.', 409);
    if (!env.STORAGE) fail('Document uploads are not configured. Contact the administrator.', 503);
    const length = Number(request.headers.get('content-length') || 0);
    if (length > MAX_DOCUMENT_BYTES + 65536) fail('Files must be 4 MB or smaller.', 413);
    let form; try { form = await request.formData(); } catch { fail('Choose a file to upload.'); }
    const requirement = form.get('requirement_id'), file = form.get('file'), requestId = form.get('request_id');
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{10,100}$/.test(requestId)) fail('A valid upload identifier is required.');
    const duplicate = await one('SELECT id,customer_id FROM client_documents WHERE request_id=?', requestId);
    if (duplicate) { if (duplicate.customer_id !== user.customer_id) fail('Upload identifier is unavailable.', 409); return json({ id: duplicate.id }); }
    if (!visaRequirements.some(item => item.id === requirement)) fail('Choose a valid requirement.');
    if (!(file instanceof File) || file.size < 1) fail('Choose a non-empty file.');
    if (file.size > MAX_DOCUMENT_BYTES) fail('Files must be 4 MB or smaller.', 413);
    const bytes = new Uint8Array(await file.arrayBuffer()), mime = documentMime(bytes);
    if (!mime || !DOCUMENT_TYPES.includes(file.type) || mime !== file.type) fail('Upload a valid PDF, JPG, or PNG file.');
    const name = file.name.split(/[\\/]/).at(-1).replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 180);
    if (!name) fail('The file needs a name.');
    const extension = name.toLowerCase().split('.').at(-1);
    if (!({ 'application/pdf': ['pdf'], 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'] })[mime].includes(extension)) fail('Use a PDF, JPG, or PNG filename that matches the file type.');
    const count = await one('SELECT COUNT(*) count FROM client_documents WHERE customer_id=? AND requirement_id=?', user.customer_id, requirement);
    if (count.count >= 10) fail('This requirement already has 10 files. Contact the administrator before adding more.', 409);
    const documentId = id('DOC'), storagePath = user.customer_id + '/' + documentId + '.' + ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' })[mime];
    await env.STORAGE.upload(storagePath, bytes, mime);
    try {
      const results = await DB.batch([q('INSERT INTO client_documents(id,customer_id,requirement_id,file_name,mime,size,storage_path,request_id,status,notes,created,uploaded_by) SELECT ?,?,?,?,?,?,?,?,\'Pending review\',\'\',?,? WHERE (SELECT COUNT(*) FROM client_documents WHERE customer_id=? AND requirement_id=?)<10', documentId, user.customer_id, requirement, name, mime, file.size, storagePath, requestId, now(), user.id, user.customer_id, requirement), q('INSERT INTO audit(id,user_id,action,entity_id,created) SELECT ?,?,?,?,? WHERE changes()>0', id('LOG'), user.id, 'Uploaded client requirement', documentId, now())]);
      if (!results[0].meta.changes) fail('This requirement already has 10 files.', 409);
    } catch (failure) {
      try { await env.STORAGE.remove(storagePath); } catch { /* A storage operator can remove the unreferenced object; never log document bytes. */ }
      const completed = await one('SELECT id,customer_id FROM client_documents WHERE request_id=?', requestId);
      if (completed?.customer_id === user.customer_id) return json({ id: completed.id });
      throw failure;
    }
    return json({ id: documentId });
  }
  if (path === '/api/documents/review' && request.method === 'POST') {
    if (user.role !== 'Administrator') fail('Administrator access is required.', 403);
    const document = await one('SELECT * FROM client_documents WHERE id=?', String(body.id || '')); own(document);
    if (!['Reviewed', 'Needs changes'].includes(body.status)) fail('Choose a valid review outcome.');
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (notes.length > 2000 || (body.status === 'Needs changes' && !notes)) fail('Add a correction message of up to 2,000 characters.');
    await DB.batch([q('UPDATE client_documents SET status=?,notes=?,reviewed_by=?,reviewed_at=? WHERE id=?', body.status, notes, user.id, now(), document.id), audit('Reviewed client requirement', document.id)]);
    return json({ id: document.id });
  }
  if (path === '/api/documents/file' && request.method === 'GET') {
    const document = await one('SELECT * FROM client_documents WHERE id=?', url.searchParams.get('id') || ''); own(document);
    if (!env.STORAGE) fail('Document storage is unavailable.', 503);
    const file = await env.STORAGE.download(document.storage_path);
    return new Response(file, { headers: { 'Content-Type': document.mime, 'Content-Disposition': `attachment; filename="document.${document.mime === 'application/pdf' ? 'pdf' : document.mime === 'image/png' ? 'png' : 'jpg'}"; filename*=UTF-8''${encodeURIComponent(document.file_name).replace(/'/g, '%27')}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  fail('Document endpoint not found.', 404);
}
