import { StrictMode, useEffect, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button, Field, Logo, Loading } from './components';
import { api } from './utils';
import Landing from './Landing';
import './styles.css';
const Workspace = lazy(() => import('./Workspace'));
function Auth({ session, refresh }) {
  const setup = !session.initialized, navigate = useNavigate();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setError(''); setBusy(true); const values = Object.fromEntries(new FormData(event.currentTarget)); values.demo = values.demo === 'on'; try { await api(setup ? 'setup' : 'login', values); await refresh(); navigate('/app'); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }
  if (session.user) return <Navigate to="/app" replace/>;
  return <div className="grid min-h-dvh lg:grid-cols-2"><div className="hidden flex-col justify-between bg-navy p-16 text-white lg:flex"><Link to="/"><Logo light/></Link><div><p className="mb-5 text-xs font-semibold uppercase tracking-[.18em] text-orange-300">Travel, in balance.</p><h1 className="max-w-lg text-5xl font-semibold leading-tight tracking-tight">More clarity.<br/>From your first booking<br/>to your next decision.</h1><p className="mt-6 max-w-md leading-7 text-slate-300">One place for your agency’s bookings, payments, financial reports, and predictive insights.</p></div><p className="flex items-center gap-2 text-sm text-slate-300"><ShieldCheck size={18}/>Access built around your team’s responsibilities.</p></div><main className="flex items-center justify-center px-6 py-12"><div className="w-full max-w-md"><Link to="/" className="mb-10 inline-block lg:hidden"><Logo/></Link><p className="mb-3 text-xs font-semibold uppercase tracking-[.15em] text-brand">{setup ? 'A fresh start' : 'Welcome back'}</p><h2 className="text-3xl font-semibold tracking-tight">{setup ? 'Set up your workspace' : 'Sign in to Systema'}</h2><p className="mt-3 text-sm leading-relaxed text-slate-600">{setup ? 'Create your agency and first administrator account.' : 'Pick up where your team left off.'}</p><form onSubmit={submit} className="mt-8 space-y-5">{setup && <><Field label="Agency name" name="agency" required autoComplete="organization"/><Field label="Your name" name="name" required autoComplete="name"/></>}<Field label="Email address" name="email" type="email" required autoComplete="username"/><Field label="Password" name="password" type="password" required minLength={setup ? 10 : undefined} maxLength={128} autoComplete={setup ? 'new-password' : 'current-password'} hint={setup ? 'Use at least 10 characters.' : undefined}/>{setup && <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm"><input name="demo" type="checkbox" className="mt-0.5"/><span>Include fictional sample data<span className="mt-1 block text-xs leading-relaxed text-slate-600">Optional. Explore the workspace and forecasting before adding real records.</span></span></label>}{error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<Button type="submit" disabled={busy} className="w-full">{busy ? 'Please wait…' : setup ? 'Create workspace' : 'Sign in'}<ArrowRight size={18}/></Button></form><Link to="/" className="mt-6 inline-block min-h-11 text-sm text-slate-600 hover:text-brand">← Back to home</Link></div></main></div>;
}
function App() {
  const [session, setSession] = useState(null), [error, setError] = useState('');
  const refresh = async () => { const result = await api('session'); setSession(result); setError(''); };
  useEffect(() => { refresh().catch(failure => setError(failure.message)); }, []);
  if (error) return <main className="mx-auto max-w-lg px-6 py-24"><Logo/><h1 className="mt-8 text-2xl font-semibold">Unable to load Systema</h1><p role="alert" className="my-4 text-slate-600">{error}</p><Button onClick={() => refresh().catch(failure => setError(failure.message))}>Try again</Button></main>;
  if (!session) return <Loading/>;
  return <Routes><Route path="/" element={<Landing session={session}/>}/><Route path="/login" element={<Auth session={session} refresh={refresh}/>}/><Route path="/setup" element={<Auth session={session} refresh={refresh}/>}/><Route path="/app/*" element={session.user ? <Suspense fallback={<Loading/>}><Workspace session={session} refreshSession={refresh}/></Suspense> : <Navigate to={session.initialized ? '/login' : '/setup'} replace/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
createRoot(document.getElementById('root')).render(<StrictMode><BrowserRouter><App/></BrowserRouter></StrictMode>);
