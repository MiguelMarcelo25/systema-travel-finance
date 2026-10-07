import { StrictMode, useEffect, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, Field, Logo, Loading } from './components';
import { api } from './utils';
const ClientPortal = lazy(() => import('./ClientPortal.jsx'));
import './styles.css';
const Workspace = lazy(() => import('./Workspace'));
function Auth({ session, refresh, register = false }) {
  const navigate = useNavigate();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { document.title = (register ? 'Create client account' : 'Sign in') + ' · Systema'; }, [register]);
  async function submit(event) { event.preventDefault(); setError(''); const values = Object.fromEntries(new FormData(event.currentTarget)); if (register && values.password !== values.confirm_password) { setError('Passwords must match.'); return; } setBusy(true); try { await api(register ? 'register' : 'login', values); await refresh(); navigate('/app'); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  if (session.user) return <Navigate to="/app" replace/>;
  return <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-10">
    <section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9" aria-labelledby="login-title">
      <div className="mb-8 flex justify-center"><Logo/></div>
      <h1 id="login-title" className="text-2xl font-semibold tracking-tight">{register ? 'Create your account' : 'Sign in'}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{register ? 'Request your next journey and keep track of your bookings.' : 'Welcome to your travel workspace.'}</p>
      <form onSubmit={submit} className="mt-7 space-y-5">
        {register && <Field label="Full name" name="name" required maxLength={180} autoComplete="name"/>}
        <Field label="Email" name="email" type="email" required maxLength={254} autoComplete="username"/>
        {register && <Field label="Phone number" name="phone" type="tel" required maxLength={40} autoComplete="tel"/>}
        <Field label="Password" name="password" type="password" required minLength={register || !session.initialized ? 10 : undefined} maxLength={128} autoComplete={register || !session.initialized ? 'new-password' : 'current-password'} hint={register ? 'Use at least 10 characters.' : undefined}/>
        {register && <Field label="Confirm password" name="confirm_password" type="password" required minLength={10} maxLength={128} autoComplete="new-password"/>}
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <Button type="submit" disabled={busy || (register && !session.initialized)} className="w-full">{busy ? register ? 'Creating account…' : 'Signing in…' : register ? 'Create account' : 'Sign in'}<ArrowRight size={17}/></Button>
      </form>
      {register && <p className="mt-5 text-xs leading-relaxed text-slate-600">Booking requests are reviewed by the administrator before confirmation.</p>}
      {session.initialized && <p className="mt-6 text-center text-sm text-slate-600">{register ? 'Already have an account?' : 'New to Systema?'}{' '}<Link to={register ? '/login' : '/register'} className="inline-flex min-h-11 items-center font-semibold text-brand hover:underline">{register ? 'Sign in' : 'Create an account'}</Link></p>}
      {!session.initialized && <p className="mt-5 text-xs leading-relaxed text-slate-600">{register ? 'Client registration opens after the administrator sets up the workspace.' : 'First sign-in creates the sole administrator account. Choose your administrator email and a password of at least 10 characters.'}</p>}
    </section>
  </main>;
}
function App() {
  const [session, setSession] = useState(null), [error, setError] = useState('');
  const refresh = async () => { const result = await api('session'); setSession(result); setError(''); };
  useEffect(() => { refresh().catch(failure => setError(failure.message)); }, []);
  if (error) return <main className="mx-auto max-w-lg px-6 py-24"><Logo/><h1 className="mt-8 text-2xl font-semibold">Unable to load Systema</h1><p role="alert" className="my-4 text-slate-600">{error}</p><Button onClick={() => refresh().catch(failure => setError(failure.message))}>Try again</Button></main>;
  if (!session) return <Loading/>;
  return <Routes><Route path="/" element={<Navigate to={session.user ? '/app' : '/login'} replace/>}/><Route path="/login" element={<Auth key="login" session={session} refresh={refresh}/>}/><Route path="/register" element={<Auth key="register" register session={session} refresh={refresh}/>}/><Route path="/setup" element={<Navigate to="/login" replace/>}/><Route path="/app/*" element={session.user ? <Suspense fallback={<Loading/>}>{session.user.role === 'Administrator' ? <Workspace session={session} refreshSession={refresh}/> : <ClientPortal session={session} refreshSession={refresh}/>}</Suspense> : <Navigate to="/login" replace/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
createRoot(document.getElementById('root')).render(<StrictMode><BrowserRouter><App/></BrowserRouter></StrictMode>);
