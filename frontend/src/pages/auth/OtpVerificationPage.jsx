import React, { useEffect, useState } from 'react';
import { CheckCircle2, RotateCw } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import AuthAlert from '../../components/auth/AuthAlert';
import OtpInput from '../../components/auth/OtpInput';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useTranslation } from '../../i18n';
import { authApi } from '../../services/apiClient';

function safeReturnTo(value, fallback = '/dashboard') { return value?.startsWith('/') && !value.startsWith('//') ? value : fallback; }

export default function OtpVerificationPage() {
  const [searchParams] = useSearchParams(); const phone = searchParams.get('phone') || ''; const purpose = searchParams.get('purpose') || 'phone_signup'; const target = searchParams.get('target') || phone;
  const [code, setCode] = useState(''); const [seconds, setSeconds] = useState(60); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(null); const [success, setSuccess] = useState(false);
  const { verifyOtp, refreshProfile } = useAuth(); const { t } = useTranslation(); const navigate = useNavigate(); useDocumentTitle(t('auth.verifyCode'));
  useEffect(() => { if (seconds <= 0) return undefined; const timer = setInterval(() => setSeconds((value) => value - 1), 1000); return () => clearInterval(timer); }, [seconds]);
  async function submit(event) { event.preventDefault(); if (code.length !== 6 || submitting) return; setSubmitting(true); setError(null); try { const result = await verifyOtp({ phone, code, purpose, remember: true }); if (purpose === 'phone_verification') await refreshProfile(); setSuccess(true); setTimeout(() => { const destination = purpose === 'phone_login' ? safeReturnTo(searchParams.get('returnTo')) : purpose === 'phone_verification' ? '/account/verification' : `/login${searchParams.get('returnTo') ? `?returnTo=${encodeURIComponent(searchParams.get('returnTo'))}` : ''}`; navigate(destination, { replace: true }); }, 900); return result; } catch (requestError) { setError(requestError); setCode(''); } finally { setSubmitting(false); } }
  async function resend() { setError(null); try { await authApi.resendOtp({ target: phone, purpose }); setSeconds(60); } catch (requestError) { setError(requestError); } }
  if (success) return <div className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircle2 size={30} /></span><h1 className="mt-5 text-3xl font-extrabold">Phone verified</h1><p className="mt-3 text-sm text-slate-500">Your trusted QAVLIO identity has been updated.</p></div>;
  return <div><p className="eyebrow">Identity verification</p><h1 className="mt-2 text-3xl font-extrabold">{t('auth.verifyCode')}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{t('auth.verifyCodeSubtitle', { target })}</p>{error && <div className="mt-5"><AuthAlert title={error.message}>{error.code === 'OTP_EXPIRED' ? t('auth.resend') : error.details?.attemptsRemaining !== undefined ? `${error.details.attemptsRemaining} attempts remaining` : null}</AuthAlert></div>}<form className="mt-7" onSubmit={submit}><OtpInput value={code} onChange={setCode} disabled={submitting} /><Button type="submit" disabled={submitting || code.length !== 6} className="mt-5 w-full">{submitting ? t('auth.verifying') : t('auth.verifyAction')}</Button></form><div className="mt-5 flex items-center justify-between gap-3"><button onClick={resend} disabled={seconds > 0} className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-violet-700 disabled:text-slate-400"><RotateCw size={13} />{seconds > 0 ? t('auth.resendIn', { seconds }) : t('auth.resend')}</button><Link to="/login/phone" className="text-[11px] font-bold text-slate-500">{t('auth.changeNumber')}</Link></div></div>;
}
