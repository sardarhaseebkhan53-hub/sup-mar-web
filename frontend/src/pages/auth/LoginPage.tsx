import { Mail, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import AuthAlert from '../../components/auth/AuthAlert';
import PasswordField from '../../components/auth/PasswordField';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { QavlioApiError } from '../../services/apiClient';
import type { AuthUser } from '../../types/auth';

function safeReturnTo(value: string | null, user: AuthUser) {
  if (value?.startsWith('/') && !value.startsWith('//')) return value;
  if (user.roles.some((role) => ['admin', 'super_admin'].includes(role))) return '/admin';
  if (user.roles.includes('seller')) return '/seller';
  return '/account';
}
const friendlyError = (error: QavlioApiError) => ({
  INVALID_CREDENTIALS: "We couldn't sign you in. Please check your details and try again.",
  ACCOUNT_UNVERIFIED: 'Verify your account before signing in.',
  ACCOUNT_SUSPENDED: 'This account is suspended. Contact QAVLIO support for help.',
  ACCOUNT_BANNED: 'This account is unavailable. Contact QAVLIO support if you believe this is an error.',
  NETWORK_ERROR: 'Something went wrong. Please check your connection and try again.',
  LOGIN_LOCKED: 'Too many attempts. Wait a few minutes before trying again.',
}[error.code] || error.message);

export default function LoginPage() {
  const [form, setForm] = useState({ identifier: '', password: '', remember: true });
  const [submitting, setSubmitting] = useState(false); const [error, setError] = useState<QavlioApiError | null>(null);
  const { login } = useAuth(); const [searchParams] = useSearchParams(); const location = useLocation(); const navigate = useNavigate();
  useDocumentTitle('Log in');
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting) return; setSubmitting(true); setError(null);
    try { const user = await login(form); navigate(safeReturnTo(searchParams.get('returnTo'), user), { replace: true }); }
    catch (requestError) { setError(requestError instanceof QavlioApiError ? requestError : new QavlioApiError('Something went wrong. Please try again.')); }
    finally { setSubmitting(false); }
  }
  return <div><p className="eyebrow">Welcome back</p><h1 className="mt-2 text-3xl font-extrabold">Log in to QAVLIO</h1><p className="mt-2 text-sm leading-6 text-slate-500">Pick up your conversations, saved finds, and seller tools securely.</p>
    {location.state?.protectedAction && <div className="mt-5"><AuthAlert type="info" title="Sign in to continue">You will return to where you left off.</AuthAlert></div>}
    {error && <div className="mt-5" id="login-error"><AuthAlert title={friendlyError(error)}>{error.code === 'ACCOUNT_UNVERIFIED' ? <Link to={`/verify-email?target=${encodeURIComponent(form.identifier)}`} className="font-extrabold underline">Open email verification</Link> : error.requestId ? `Reference: ${error.requestId}` : null}</AuthAlert></div>}
    <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate><label className="block text-xs font-extrabold" htmlFor="identifier">Email address<span className="relative mt-2 block"><Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id="identifier" name="identifier" type="email" autoComplete="username" className="input-base pl-11" placeholder="you@example.com" value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} required aria-describedby={error ? 'login-error' : undefined} /></span></label><div><div className="mb-2 flex justify-end"><Link to="/forgot-password" className="text-[11px] font-bold text-violet-700">Forgot password?</Link></div><PasswordField id="password" name="password" label="Password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></div><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={form.remember} onChange={(event) => setForm({ ...form, remember: event.target.checked })} className="h-4 w-4 rounded accent-violet-600" /> Keep me signed in on this device</label><Button type="submit" loading={submitting} className="w-full">{submitting ? 'Signing you in...' : 'Log in securely'}</Button></form>
    <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-slate-200" /><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">or</span><span className="h-px flex-1 bg-slate-200" /></div><Button to={`/login/phone${searchParams.get('returnTo') ? `?returnTo=${encodeURIComponent(searchParams.get('returnTo')!)}` : ''}`} variant="secondary" className="w-full">Use phone OTP instead</Button><div className="mt-3 grid grid-cols-2 gap-2">{['Google', 'Facebook'].map((provider) => <button type="button" disabled key={provider} title="Social sign-in is safely disabled until provider credentials are configured" className="h-10 rounded-xl border border-slate-200 text-[10px] font-extrabold text-slate-400 disabled:cursor-not-allowed">{provider}</button>)}</div><p className="mt-7 text-center text-xs font-semibold text-slate-500">New to QAVLIO? <Link to="/register" className="font-extrabold text-violet-700">Create an account</Link></p><p className="mt-6 flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-400"><ShieldCheck size={13} /> Secure session · HttpOnly refresh · Device controls</p>
  </div>;
}
