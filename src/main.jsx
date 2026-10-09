import { StrictMode, useEffect, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Button, Logo, Loading } from './components';
import Auth from './Auth';
import AccountAccess from './AccountAccess';
import { needsEmailVerification } from './account-policy.mjs';
import { api } from './utils';
const ClientPortal = lazy(() => import('./ClientPortal.jsx'));
import './styles.css';
import './workspace.css';
const Workspace = lazy(() => import('./Workspace'));
function App() {
  const [session, setSession] = useState(null), [error, setError] = useState('');
  const refresh = async () => { const result = await api('session'); setSession(result); setError(''); };
  useEffect(() => { refresh().catch(failure => setError(failure.message)); }, []);
  if (error) return <main className="mx-auto max-w-lg px-6 py-24"><Logo/><h1 className="mt-8 text-2xl font-semibold">Unable to load Systema</h1><p role="alert" className="my-4 text-slate-600">{error}</p><Button onClick={() => refresh().catch(failure => setError(failure.message))}>Try again</Button></main>;
  if (!session) return <Loading/>;
  return <Routes><Route path="/" element={<Navigate to={session.user ? '/app' : '/login'} replace/>}/><Route path="/login" element={<Auth key="login" session={session} refresh={refresh}/>}/><Route path="/register" element={<Auth key="register" register session={session} refresh={refresh}/>}/><Route path="/forgot-password" element={<AccountAccess key="forgot" mode="forgot" session={session} refresh={refresh}/>}/><Route path="/reset-password" element={<AccountAccess key="reset" mode="reset" session={session} refresh={refresh}/>}/><Route path="/verify-email" element={<AccountAccess key="verify" mode="verify" session={session} refresh={refresh}/>}/><Route path="/setup" element={<Navigate to="/login" replace/>}/><Route path="/app/*" element={session.user ? needsEmailVerification(session.user) ? <AccountAccess key="gate" mode="gate" session={session} refresh={refresh}/> : <Suspense fallback={<Loading/>}>{session.user.role === 'Administrator' ? <Workspace session={session} refreshSession={refresh}/> : <ClientPortal session={session} refreshSession={refresh}/>}</Suspense> : <Navigate to="/login" replace/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
createRoot(document.getElementById('root')).render(<StrictMode><BrowserRouter><App/></BrowserRouter></StrictMode>);
