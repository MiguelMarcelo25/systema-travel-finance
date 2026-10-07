import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Button, Field, Logo } from './components';
import { api } from './utils';

export default function Auth({ session, refresh, register = false }) {
  const navigate = useNavigate();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { document.title = (register ? 'Create client account' : 'Sign in') + ' · Systema'; }, [register]);
  async function submit(event) {
    event.preventDefault(); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (register && values.password !== values.confirm_password) { setError('Passwords must match.'); return; }
    setBusy(true);
    try { await api(register ? 'register' : 'login', values); await refresh(); navigate('/app'); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  if (session.user) return <Navigate to="/app" replace/>;
  return <main className={`auth-screen ${register ? 'auth-register' : ''}`}>
    <aside className="auth-visual" aria-label="Travel inspiration">
      <picture><source media="(max-width: 767px)" srcSet="/images/systema-coast-mobile.webp"/><img className="auth-photo" src="/images/systema-coast.webp" width="1122" height="1402" alt="A sunlit tropical cove with turquoise water, limestone cliffs, and a small outrigger boat" fetchPriority="high" decoding="async"/></picture>
      <div className="auth-visual-copy"><h2>Your next journey starts here.</h2><p>Plan your travels and keep every booking, payment, and detail in one place.</p></div>
    </aside>
    <section className="auth-form-panel" aria-labelledby="login-title">
      <div className="auth-form-content">
        <div className="auth-brand auth-enter"><Logo/><span>Travel, in balance.</span></div>
        <div className="auth-heading auth-enter"><h1 id="login-title">{register ? 'Create your account' : 'Welcome back.'}</h1><p>{register ? 'Your next adventure starts with an account.' : 'Sign in to pick up where you left off.'}</p></div>
        <form onSubmit={submit} className="auth-form auth-enter" aria-busy={busy}>
          {register && <Field label="Full name" name="name" required maxLength={180} autoComplete="name" placeholder="Your full name"/>}
          <Field label="Email" name="email" type="email" required maxLength={254} autoComplete="username" placeholder="you@example.com"/>
          {register && <Field label="Phone number" name="phone" type="tel" required maxLength={40} autoComplete="tel" placeholder="Your phone number"/>}
          <Field label="Password" name="password" type="password" required minLength={register || !session.initialized ? 10 : undefined} maxLength={128} autoComplete={register || !session.initialized ? 'new-password' : 'current-password'} placeholder={register ? 'Create a password' : 'Enter your password'} hint={register ? 'Use at least 10 characters.' : undefined}/>
          {register && <Field label="Confirm password" name="confirm_password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" placeholder="Re-enter your password"/>}
          {error && <p role="alert" className="auth-error">{error}</p>}
          <Button type="submit" disabled={busy || (register && !session.initialized)} className="auth-submit">{busy ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true"/> : null}{busy ? register ? 'Creating account…' : 'Signing in…' : register ? 'Create account' : 'Sign in'}{!busy && <ArrowRight size={18} aria-hidden="true"/>}</Button>
        </form>
        {register && <p className="auth-note">Booking requests are reviewed by the administrator before confirmation.</p>}
        {session.initialized && <p className="auth-switch auth-enter">{register ? 'Already have an account?' : 'New to Systema?'}{' '}<Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}<ArrowRight size={15} aria-hidden="true"/></Link></p>}
        {!session.initialized && <p className="auth-note">{register ? 'Client registration opens after the administrator sets up the workspace.' : 'First sign-in creates the sole administrator account. Choose your administrator email and a password of at least 10 characters.'}</p>}
      </div>
    </section>
  </main>;
}
