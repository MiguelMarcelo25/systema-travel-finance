import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, Download, FileCheck, FileText, Info, LoaderCircle, Upload, X } from 'lucide-react';
import { Badge, Button, Card, Empty, Field, Loading, Modal } from './components';
import { api } from './utils';
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, visaRequirements } from './requirements.mjs';
const bytesLabel = size => size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
const timestamp = value => new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(value));

function UploadForm({ requirement, onClose, onSaved }) {
  const inputId = useId(), chooser = useRef(null);
  const [file, setFile] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [dragging, setDragging] = useState(false);
  const pending = useRef(false), uploadId = useRef(crypto.randomUUID());
  const close = useCallback(() => { if (!pending.current) onClose(); }, [onClose]);
  function choose(value) {
    setError(''); setFile(null); uploadId.current = crypto.randomUUID();
    if (!value) return;
    if (!DOCUMENT_TYPES.includes(value.type)) { setError('Choose a PDF, JPG, or PNG file.'); return; }
    if (!value.size || value.size > MAX_DOCUMENT_BYTES) { setError('Choose a non-empty file up to 4 MB.'); return; }
    setFile(value);
  }
  async function submit(event) {
    event.preventDefault(); if (!file || pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const form = new FormData(); form.set('file', file); form.set('requirement_id', requirement.id); form.set('request_id', uploadId.current);
      const response = await fetch('/api/documents/upload', { method: 'POST', body: form }); const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to upload this file.');
      await onSaved(); pending.current = false; onClose();
    } catch (failure) { setError(failure.message); } finally { pending.current = false; setBusy(false); }
  }
  return <Modal title="Upload requirement" onClose={close}><form onSubmit={submit} className="document-upload-form" aria-busy={busy}><h3>{requirement.title}</h3><p>{requirement.detail}</p>{requirement.original && <p className="document-original-note"><Info size={16} aria-hidden="true"/>This upload is a copy. The physical original is still required.</p>}
    <div className={`document-dropzone ${dragging ? 'is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!busy) { if (event.dataTransfer.files.length > 1) { setFile(null); setError('Upload one file at a time.'); } else choose(event.dataTransfer.files[0]); } }}>
      <Upload size={28} aria-hidden="true"/><strong>Drop a document here</strong><span>PDF, JPG, or PNG · up to 4 MB per file</span><label htmlFor={inputId} className="sr-only">Document file</label><input ref={chooser} id={inputId} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={busy} onChange={event => choose(event.target.files[0])} className="sr-only"/><Button type="button" secondary disabled={busy} onClick={() => chooser.current.click()}>Choose file</Button>
    </div>
    {file && <div className="document-selected"><FileText size={22} aria-hidden="true"/><div><strong>{file.name}</strong><span>{bytesLabel(file.size)}</span></div><button type="button" aria-label="Remove selected file" className="document-remove" disabled={busy} onClick={() => { setFile(null); chooser.current.value = ''; }}><X size={18} aria-hidden="true"/></button></div>}
    {error && <p role="alert" className="document-error">{error}</p>}<p className="document-upload-note">Files are private to your account and the administrator. You can add more files to this requirement after uploading.</p><div className="document-form-actions"><Button type="button" secondary disabled={busy} onClick={close}>Cancel</Button><Button type="submit" disabled={!file || busy}>{busy ? <><LoaderCircle size={16} className="animate-spin" aria-hidden="true"/>Uploading…</> : <><Upload size={16} aria-hidden="true"/>Upload file</>}</Button></div>
  </form></Modal>;
}

function ReviewForm({ document, onClose, onSaved }) {
  const [status, setStatus] = useState(document.status === 'Needs changes' ? 'Needs changes' : 'Reviewed'), [notes, setNotes] = useState(document.notes), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef(false), close = useCallback(() => { if (!pending.current) onClose(); }, [onClose]);
  async function submit(event) { event.preventDefault(); if (pending.current) return; pending.current = true; setBusy(true); setError(''); try { await api('documents/review', { id: document.id, status, notes }); await onSaved(); pending.current = false; onClose(); } catch (failure) { setError(failure.message); } finally { pending.current = false; setBusy(false); } }
  return <Modal title="Review document" onClose={close}><form onSubmit={submit} className="space-y-5"><p className="break-all font-semibold">{document.file_name}</p><p className="text-sm text-slate-600">{visaRequirements.find(item => item.id === document.requirement_id)?.title}</p><a className="document-download" href={`/api/documents/file?id=${encodeURIComponent(document.id)}`}><Download size={16} aria-hidden="true"/>Download document</a><Field label="Review outcome" value={status} onChange={event => setStatus(event.target.value)} disabled={busy}><option>Reviewed</option><option>Needs changes</option></Field><div><label htmlFor="document-review-notes" className="mb-2 block text-sm font-medium">{status === 'Needs changes' ? 'Corrections needed' : 'Message to client (optional)'}</label><textarea id="document-review-notes" rows={3} maxLength={2000} required={status === 'Needs changes'} disabled={busy} value={notes} onChange={event => setNotes(event.target.value)}/></div><p className="text-xs leading-relaxed text-slate-600">Review applies to this uploaded copy. It does not confirm physical receipt of an original or an embassy decision.</p>{error && <p role="alert" className="document-error">{error}</p>}<div className="document-form-actions"><Button type="button" secondary disabled={busy} onClick={close}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving review…' : 'Save review'}</Button></div></form></Modal>;
}

export default function Documents({ data, client = false }) {
  const [customer, setCustomer] = useState(''), [result, setResult] = useState(null), [error, setError] = useState(''), [upload, setUpload] = useState(null), [review, setReview] = useState(null), [message, setMessage] = useState(''), [attempt, setAttempt] = useState(0);
  const closeUpload = useCallback(() => setUpload(null), []), closeReview = useCallback(() => setReview(null), []);
  const customerId = client ? data.user.customer_id : customer;
  const endpoint = 'documents' + (!client && customerId ? `?customer_id=${encodeURIComponent(customerId)}` : '');
  useEffect(() => {
    setResult(null); setError(''); setMessage(''); if (!customerId) return;
    const controller = new AbortController(); api(endpoint, undefined, controller.signal).then(setResult).catch(failure => { if (failure.name !== 'AbortError') setError(failure.message); }); return () => controller.abort();
  }, [endpoint, customerId, attempt]);
  async function reload() { setResult(await api(endpoint)); }
  async function uploaded() { await reload(); setMessage('Your file was uploaded and is waiting for administrator review.'); }
  async function reviewed() { await reload(); setMessage('Review saved. The client can see your response.'); }
  const documents = result?.documents || [], uploadedCount = visaRequirements.filter(item => documents.some(document => document.requirement_id === item.id)).length;
  return <div className="documents-workspace">
    {!client && <Card className="document-client-selector"><div><h2>Client submission folder</h2><p>Select a customer to view and review their uploaded requirements.</p></div><Field label="Customer" value={customer} onChange={event => setCustomer(event.target.value)}><option value="">Choose a customer</option>{data.customers.map(row => <option key={row.id} value={row.id}>{row.name} · {row.email}</option>)}</Field></Card>}
    <Card className="document-guide"><div className="ui-section-heading"><div><h2>Visa application checklist</h2><p>Agency-supplied requirements · upload copies of the documents that apply to your application.</p></div><FileCheck size={24} aria-hidden="true"/></div><div className="document-guide-notes"><p><strong>Original documents</strong>Uploads support the agency’s review. Prepare and deliver originals where indicated; two passport-size pictures are also required.</p><p><strong>Processing and passport release</strong>The supplied checklist states a minimum of 12–14 working days. Once a passport is submitted to the embassy, it cannot be borrowed, pulled out, or withdrawn before its release date.</p></div></Card>
    {message && <p role="status" className="document-success"><Check size={18} aria-hidden="true"/>{message}</p>}
    {!customerId ? <Card><Empty title={client ? 'Your account needs a customer record' : 'Choose a client to get started'} description={client ? 'Ask the administrator to link your account before uploading.' : 'Client files stay in individual submission folders.'}/></Card> : error ? <Card><p role="alert" className="document-error">{error}</p><Button secondary className="mt-4" onClick={() => setAttempt(value => value + 1)}>Try again</Button></Card> : !result ? <Loading text="Loading requirements…"/> : <>
      {!result.storage_ready && <p role="alert" className="document-error">Document uploads are unavailable. Please contact the administrator.</p>}
      <div className="document-summary"><p><strong>{uploadedCount}</strong> of {visaRequirements.length} checklist items have uploaded files</p><span>{documents.length} file{documents.length !== 1 ? 's' : ''} · {documents.filter(document => document.status === 'Needs changes').length} need corrections</span></div>
      <div className="document-checklist">{visaRequirements.map((item, index) => { const files = documents.filter(document => document.requirement_id === item.id); return <Card key={item.id} className="document-requirement"><div className="document-requirement-heading"><span className="document-requirement-number">{index + 1}</span><div><h3>{item.title}</h3><div className="document-tags">{item.conditional && <span>If applicable</span>}{item.original && <span>Original required</span>}</div></div></div><p className="document-requirement-detail">{item.detail}</p>{files.length ? <ul className="document-files">{files.map(file => <li key={file.id}><div className="document-file-heading"><FileText size={18} aria-hidden="true"/><strong>{file.file_name}</strong><Badge>{file.status}</Badge></div><p className="document-file-meta">{bytesLabel(file.size)} · {timestamp(file.created)}</p>{file.notes && <p className={`document-review-message ${file.status === 'Needs changes' ? 'needs-changes' : ''}`}><strong>Administrator response</strong>{file.notes}</p>}<div className="document-file-actions"><a className="document-download" href={`/api/documents/file?id=${encodeURIComponent(file.id)}`}><Download size={15} aria-hidden="true"/>Download</a>{!client && <button type="button" className="ui-text-link" onClick={() => setReview(file)}>Review document</button>}</div></li>)}</ul> : <p className="document-no-files">No files uploaded for this item.</p>}{client && <Button secondary className="document-add-file" disabled={!result.storage_ready || files.length >= 10} onClick={() => setUpload(item)}><Upload size={15} aria-hidden="true"/>{files.length ? 'Add another file' : 'Upload document'}</Button>}</Card>; })}</div><p className="document-conditional-note">Conditional items and alternatives depend on your application. A file count is a submission summary, not a determination that all visa requirements are satisfied.</p>
    </>}
    {upload && <UploadForm requirement={upload} onClose={closeUpload} onSaved={uploaded}/>}{review && <ReviewForm document={review} onClose={closeReview} onSaved={reviewed}/>}
  </div>;
}
