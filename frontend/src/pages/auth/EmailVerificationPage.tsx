import { CheckCircle2, MailCheck, RotateCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthAlert from '../../components/auth/AuthAlert';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { authApi, QavlioApiError } from '../../services/apiClient';

type VerificationView = 'instructions' | 'checking' | 'success' | 'error';
export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams(); const target = searchParams.get('target') || ''; const token = searchParams.get('token');
  const [state, setState] = useState<VerificationView>(token ? 'checking' : 'instructions'); const [error, setError] = useState<string | null>(null); const [resending, setResending] = useState(false);
  useDocumentTitle('Verify email');
  useEffect(() => { if (!token || !target) return; let active = true; authApi.verifyEmail({ email: target, token }).then(() => { if (active) setState('success'); }).catch((requestError) => { if (active) { const code = requestError instanceof QavlioApiError ? requestError.code : ''; setError(code === 'OTP_EXPIRED' ? 'This verification link has expired.' : 'This verification link is invalid or has already been used.'); setState('error'); } }); return () => { active = false; }; }, [target, token]);
  async function resend() { setResending(true); setError(null); try { await authApi.resendVerification(target); setState('instructions'); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Verification email could not be resent.'); } finally { setResending(false); } }
  if (state === 'checking') return <div className="text-center" role="status"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-violet-100 text-violet-700"><RotateCw className="animate-spin" /></span><h1 className="mt-5 text-2xl font-extrabold">Checking verification link...</h1></div>;
  if (state === 'success') return <div className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircle2 size={30} /></span><h1 className="mt-5 text-3xl font-extrabold">Email verified</h1><p className="mt-3 text-sm leading-6 text-slate-500">Your QAVLIO identity is ready.</p><Button to="/login" className="mt-7 w-full">Log in</Button></div>;
  return <div className="text-center"><span className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${state === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-violet-100 text-violet-700'}`}>{state === 'error' ? <XCircle size={30} /> : <MailCheck size={30} />}</span><h1 className="mt-5 text-3xl font-extrabold">Verify your email</h1><p className="mt-3 text-sm leading-6 text-slate-500">{state === 'error' ? 'Request a fresh link to continue.' : `Open the secure link sent to ${target || 'your email address'}.`}</p>{error && <div className="mt-5 text-left"><AuthAlert title={error} /></div>}<Button type="button" onClick={resend} loading={resending} disabled={!target} className="mt-7 w-full">Resend verification email</Button><Link to="/register" className="mt-4 inline-block text-xs font-bold text-slate-500">Change email</Link></div>;
}
