import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Modal } from './components';
import { api } from './utils';

export default function DeleteAccount({ account, onClose, onDeleted }) {
  const pending = useRef(false), cancel = useRef(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const close = useCallback(() => { if (!pending.current) onClose(); }, [onClose]);
  useEffect(() => { cancel.current?.focus(); }, []);
  async function remove() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      await api('users/delete', { id: account.id, confirm_email: account.email });
      await onDeleted(account.id);
    } catch (failure) { setError(failure.message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <Modal title="Delete this client account?" onClose={close}>
    <div aria-busy={busy}>
      <div className="signout-icon" aria-hidden="true"><Trash2 size={24}/></div>
      <div className="mt-4 rounded-lg border border-slate-200 p-4"><strong className="block">{account.name}</strong><p className="mt-1 break-all text-sm text-slate-600">{account.email}</p></div>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">This account will be removed from Accounts and will no longer be able to sign in. All active sessions and verification or password reset links will be revoked. This action cannot be undone.</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">Customer records, bookings, payments, uploaded documents, and audit history will be kept.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><Button ref={cancel} secondary type="button" disabled={busy} onClick={close}>Cancel</Button><Button type="button" className="account-delete-confirm" disabled={busy} onClick={remove}><Trash2 size={17} aria-hidden="true"/>{busy ? 'Deleting…' : 'Yes, delete account'}</Button></div>
    </div>
  </Modal>;
}
