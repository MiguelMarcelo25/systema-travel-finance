import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, LogOut } from 'lucide-react';
import { Button, Modal } from './components';
import { api } from './utils';

export default function AccountMenu({ user, refreshSession }) {
  const navigate = useNavigate(), trigger = useRef(null), cancel = useRef(null), pending = useRef(false);
  const [open, setOpen] = useState(false), [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const close = useCallback(() => { if (!pending.current) { setConfirm(false); setError(''); } }, []);
  useEffect(() => {
    if (!confirm) return;
    cancel.current?.focus();
    return () => trigger.current?.focus();
  }, [confirm]);
  async function logout() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await api('logout', {}); await refreshSession(); navigate('/login'); }
    catch (failure) { setError(failure.message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className="account-menu">
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild><button ref={trigger} type="button" className="account-trigger" aria-label={`Open account menu for ${user.name}`}><span className="account-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span><span className="account-details"><strong>{user.name}</strong><small>{user.role}</small></span><ChevronDown size={16} aria-hidden="true"/></button></Popover.Trigger>
      <Popover.Portal><Popover.Content sideOffset={8} align="end" collisionPadding={12} className="account-popover" aria-label="Account options" onCloseAutoFocus={event => { if (confirm) event.preventDefault(); }}>
        <div className="account-popover-identity"><strong>{user.name}</strong><span>{user.email || user.role}</span></div>
        <button type="button" className="account-signout" onClick={() => { setOpen(false); setConfirm(true); }}><LogOut size={18} aria-hidden="true"/>Sign out</button>
      </Popover.Content></Popover.Portal>
    </Popover.Root>
    {confirm && <Modal title="Sign out of Systema?" onClose={close}><div className="signout-confirmation" aria-busy={busy}>
      <div className="signout-icon" aria-hidden="true"><LogOut size={24}/></div><p className="mt-4 text-sm leading-relaxed text-slate-600">Are you sure you want to sign out? You’ll need to log in again to access your workspace.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><button ref={cancel} type="button" className="signout-cancel" onClick={close} disabled={busy}>Cancel</button><Button type="button" onClick={logout} disabled={busy}>{busy ? 'Signing out…' : 'Yes, sign out'}</Button></div>
    </div></Modal>}
  </div>;
}
