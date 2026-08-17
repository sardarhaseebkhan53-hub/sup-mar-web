import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AuthAlert from '../../components/auth/AuthAlert';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { authApi, QavlioApiError } from '../../services/apiClient';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState(''); const [submitting, setSubmitting] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState<string | null>(null);
  useDocumentTitle('Recover account');
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSubmitting(true); setError(null); try { await authApi.forgotPassword(identifier); setSent(true); } catch (requestError) { setError(requestError instanceof QavlioApiError && requestError.code === 'NETWORK_ERROR' ? 'Something went wrong. Please check your connection and try again.' : requestError instanceof Error ? requestError.message : 'Recovery request failed.'); } finally { setSubmitting(false); } }
  if (sent) return <div className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Mail size={28} /></span><h1 className="mt-5 text-3xl font-extrabold">Check your inbox</h1><p className="mt-3 text-sm leading-6 text-slate-500">If an eligible account exists, secure recovery instructions are on the way.</p><Button to="/login" className="mt-7 w-full">Back to login</Button></div>;
  return <div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700"><KeyRound /></span><h1 className="mt-5 text-3xl font-extrabold">Recover your account</h1><p className="mt-2 text-sm leading-6 text-slate-500">Enter your email. The response remains private whether or not an account exists.</p>{error && <div className="mt-5"><AuthAlert title={error} /></div>}<form onSubmit={submit} className="mt-7"><label htmlFor="recovery-id" className="text-xs font-extrabold">Email address</label><input id="recovery-id" type="email" className="input-base mt-2" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required autoComplete="email" /><Button type="submit" loading={submitting} className="mt-5 w-full">Send recovery instructions</Button></form><Link to="/login" className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft size={14} />Back</Link></div>;
}
