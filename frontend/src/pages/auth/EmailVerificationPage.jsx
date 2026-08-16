import React, { useEffect, useState } from 'react';
import { CheckCircle2, MailCheck, RotateCw, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthAlert from '../../components/auth/AuthAlert';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useTranslation } from '../../i18n';
import { authApi } from '../../services/apiClient';

export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams(); const target = searchParams.get('target') || ''; const token = searchParams.get('token');
  const [state, setState] = useState(token ? 'checking' : 'instructions'); const [error, setError] = useState(null); const [resending, setResending] = useState(false);
  const { t } = useTranslation(); useDocumentTitle(t('auth.verifyEmail'));
  useEffect(() => { if (!token || !target) return; let active = true; authApi.verifyEmail({ email: target, token }).then(() => { if (active) setState('success'); }).catch((requestError) => { if (active) { setError(requestError); setState('error'); } }); return () => { active = false; }; }, [target, token]);
  async function resend() { setResending(true); setError(null); try { await authApi.resendOtp({ target, purpose: 'email_verification' }); setState('instructions'); } catch (requestError) { setError(requestError); } finally { setResending(false); } }
  if (state === 'checking') return <div className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-violet-100 text-violet-700"><RotateCw className="animate-spin" /></span><h1 className="mt-5 text-2xl font-extrabold">{t('auth.checkingLink')}</h1></div>;
  if (state === 'success') return <div className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircle2 size={30} /></span><h1 className="mt-5 text-3xl font-extrabold">{t('auth.emailVerified')}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{t('auth.emailVerifiedBody')}</p><Button to={`/login${searchParams.get('returnTo') ? `?returnTo=${encodeURIComponent(searchParams.get('returnTo'))}` : ''}`} className="mt-7 w-full">{t('common.logIn')}</Button></div>;
  return <div className="text-center"><span className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${state === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-violet-100 text-violet-700'}`}>{state === 'error' ? <XCircle size={30} /> : <MailCheck size={30} />}</span><h1 className="mt-5 text-3xl font-extrabold">{t('auth.verifyEmail')}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{state === 'error' ? t('auth.invalidLink') : t('auth.verifyEmailSubtitle', { target })}</p>{error && <div className="mt-5 text-left"><AuthAlert title={error.message} /></div>}<Button onClick={resend} disabled={!target || resending} className="mt-7 w-full">{resending ? t('common.loading') : t('auth.resendEmail')}</Button><Link to="/register" className="mt-4 inline-block text-xs font-bold text-slate-500">{t('auth.changeEmail')}</Link></div>;
}
