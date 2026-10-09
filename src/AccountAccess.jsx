import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button, Field, Logo } from './components';
import { api } from './utils';
import { needsEmailVerification } from './account-policy.mjs';

export function AccessLayout({ title, description, children }) {
  return <main className="auth-screen"><aside className="auth-visual" aria-label="Travel inspiration"><picture><source media="(max-width: 767px)" srcSet="/images/systema-coast-mobile.webp"/><img className="auth-photo" src="/images/systema-coast.webp" width="1122" height="1402" alt="A sunlit tropical cove with turquoise water and limestone cliffs"/></picture><div className="auth-visual-copy"><h2>Your next journey starts here.</h2><p>One account for your journeys, documents, and peace of mind.</p></div></aside><section className="auth-form-panel" aria-labelledby="access-title"><div className="auth-form-content"><div className="auth-brand"><Logo/><span>Travel, in balance.</span></div><div className="auth-heading"><h1 id="access-title">{title}</h1><p>{description}</p></div>{children}</div></section></main>;
}

export default function AccountAccess({ mode, session, refresh }) {
  const location = useLocation();
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || '');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [done, setDone] = useState(false);
  const verify = mode === 'verify', reset = mode === 'reset', gate = mode === 'gate';
  const title = done ? reset ? 'Password updated' : verify ? 'Email verified' : 'Check your email' : gate || verify ? 'Verify your email' : reset ? 'Choose a new password' : 'Forgot your password?';
  useEffect(() => { document.title = title + ' · Systema'; }, [title]);
  useEffect(() => { if (token) window.history.replaceState(window.history.state, '', location.pathname + location.search); }, [token, location.pathname, location.search]);
  async function submit(event) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (reset && values.password !== values.confirm_password) throw Error('Passwords must match.');
      const result = await api(gate ? 'resend-verification' : verify ? 'verify-email' : reset ? 'reset-password' : 'forgot-password', { ...values, ...(token ? { token } : {}) });
      if (gate) setMessage(session.emailPreview ? 'Verification email preview created. Open the newest local message to use the link.' : 'Verification link sent. Check your inbox and spam folder.');
      else { setDone(true); setMessage(result.message || (reset ? 'Sign in with your new password. All previous sessions have been signed out.' : 'Your email address is confirmed.')); if (verify || reset) await refresh(); }
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  async function check() { setBusy(true); setError(''); try { const current = await api('session'); if (!current.user || needsEmailVerification(current.user)) setError('Your email is not verified yet. Open the link in your email first.'); await refresh(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  async function logout() { setBusy(true); try { await api('logout', {}); await refresh(); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  const description = gate ? `Confirm ${session.user.email} to open your ${session.user.role === 'Administrator' ? 'agency' : 'client'} workspace.` : verify ? 'Confirm your address to keep your account secure.' : reset ? 'Use 10–128 characters. Choose a password you haven’t used elsewhere.' : 'We’ll send a reset link to the email connected to your account. This works for administrator and client accounts.';
  return <AccessLayout title={title} description={description}><div className="access-symbol" aria-hidden="true">{done ? <CheckCircle2 size={28}/> : gate || verify ? <MailCheck size={28}/> : <KeyRound size={28}/>}</div>
    {message && <p role="status" className="access-success">{message}</p>}
    {error && <p role="alert" className="auth-error mb-4">{error}</p>}
    {!done && <form className="auth-form" onSubmit={submit} aria-busy={busy}>
      {!gate && !verify && !reset && <Field label="Email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com"/>}
      {reset && token && <><Field label="New password" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required/><Field label="Confirm new password" name="confirm_password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required/></>}
      {(verify || reset) && !token ? <p className="auth-error">This link is missing its security token. Request a new email and use the complete link.</p> : <Button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : gate ? 'Send verification email' : verify ? 'Verify email address' : reset ? 'Save new password' : 'Send reset link'}</Button>}
    </form>}
    {gate ? <div className="access-actions"><Button secondary disabled={busy} onClick={check}>I’ve verified my email</Button><button className="access-link" disabled={busy} onClick={logout}>Sign out</button></div> : <p className="auth-switch"><Link to={done && verify && session.user ? '/app' : (reset || verify) && !done ? reset ? '/forgot-password' : '/app' : '/login'}>{done && verify && session.user ? 'Open workspace' : (reset || verify) && !done ? 'Request a new link' : 'Back to sign in'}</Link></p>}
    {gate && <p className="auth-note">Already received a link? Open it to confirm your address. Sending another email replaces your previous link.</p>}
    {session.emailPreview && <p className="auth-note">Local email preview mode: messages are saved in <code>.sites-runtime/mail</code> on this computer instead of sent to an inbox.</p>}
  </AccessLayout>;
}
