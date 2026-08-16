import React, { useState } from 'react';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthAlert from '../../components/auth/AuthAlert';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useTranslation } from '../../i18n';
import { authApi } from '../../services/apiClient';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState(''); const [submitting, setSubmitting] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState(null); const { t } = useTranslation(); useDocumentTitle(t('auth.forgotTitle'));
  async function submit(event) { event.preventDefault(); setSubmitting(true); setError(null); try { await authApi.forgotPassword(identifier); setSent(true); } catch (requestError) { setError(requestError); } finally { setSubmitting(false); } }
  if (sent) return <div className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Mail size={28} /></span><h1 className="mt-5 text-3xl font-extrabold">{t('auth.recoverySent')}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{t('auth.recoverySentBody')}</p><Button to="/login" className="mt-7 w-full">{t('common.logIn')}</Button></div>;
  return <div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700"><KeyRound /></span><h1 className="mt-5 text-3xl font-extrabold">{t('auth.forgotTitle')}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{t('auth.forgotSubtitle')}</p>{error && <div className="mt-5"><AuthAlert title={error.message} /></div>}<form onSubmit={submit} className="mt-7"><label htmlFor="recovery-id" className="text-xs font-extrabold">{t('auth.identifier')}</label><input id="recovery-id" className="input-base mt-2" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required autoComplete="username" /><Button type="submit" disabled={submitting} className="mt-5 w-full">{submitting ? t('auth.sendingRecovery') : t('auth.sendRecovery')}</Button></form><Link to="/login" className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft size={14} />{t('common.back')}</Link></div>;
}
