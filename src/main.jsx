import { StrictMode, useEffect, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, Field, Logo, Loading } from './components';
import { api } from './utils';
const ClientPortal = lazy(() => import('./ClientPortal.jsx'));
import './styles.css';
const Workspace = lazy(() => import('./Workspace'));
function Auth({ session, refresh }) {
  const navigate = useNavigate();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setError(''); setBusy(true); const values = Object.fromEntries(new FormData(event.currentTarget)); try { await api('login', values); await refresh(); navigate('/app'); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  if (session.user) return <Navigate to="/app" replace/>;
  return <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-10"><section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9" aria-labelledby="login-title"><div className="mb-9 flex justify-center"><Logo/></div><h1 id="login-title" className="text-2xl font-semibold tracking-tight">Sign in</h1><p className="mt-2 text-sm text-slate-600">Welcome to your travel workspace.</p><form onSubmit={submit} className="mt-7 space-y-5"><Field label="Email" name="email" type="email" required autoComplete="username"/><Field label="Password" name="password" type="password" required minLength={session.initialized ? undefined : 10} maxLength={128} autoComplete={session.initialized ? 'current-password' : 'new-password'}/>{error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}<ArrowRight size={17}/></Button></form>{!session.initialized && <p className="mt-5 text-xs leading-relaxed text-slate-600">First sign-in creates the sole administrator account. Choose your administrator email and a password of at least 10 characters.</p>}</section></main>;
}
function App() {
  const [session, setSession] = useState(null), [error, setError] = useState('');
  const refresh = async () => { const result = await api('session'); setSession(result); setError(''); };
  useEffect(() => { refresh().catch(failure => setError(failure.message)); }, []);
  if (error) return <main className="mx-auto max-w-lg px-6 py-24"><Logo/><h1 className="mt-8 text-2xl font-semibold">Unable to load Systema</h1><p role="alert" className="my-4 text-slate-600">{error}</p><Button onClick={() => refresh().catch(failure => setError(failure.message))}>Try again</Button></main>;
  if (!session) return <Loading/>;
  return <Routes><Route path="/" element={<Navigate to={session.user ? '/app' : '/login'} replace/>}/><Route path="/login" element={<Auth session={session} refresh={refresh}/>}/><Route path="/setup" element={<Navigate to="/login" replace/>}/><Route path="/app/*" element={session.user ? <Suspense fallback={<Loading/>}>{session.user.role === 'Administrator' ? <Workspace session={session} refreshSession={refresh}/> : <ClientPortal session={session} refreshSession={refresh}/>}</Suspense> : <Navigate to="/login" replace/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
createRoot(document.getElementById('root')).render(<StrictMode><BrowserRouter><App/></BrowserRouter></StrictMode>);
