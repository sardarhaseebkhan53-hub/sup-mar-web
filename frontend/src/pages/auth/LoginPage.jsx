import React, { useState } from 'react';
import { Eye, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import AuthAlert from '../../components/auth/AuthAlert';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useTranslation } from '../../i18n';

function safeReturnTo(value, user) {
  if (value?.startsWith('/') && !value.startsWith('//')) return value;
  if (user?.roles?.some((role) => ['admin', 'super_admin'].includes(role))) return '/admin';
  if (user?.roles?.includes('seller')) return '/seller';
  return '/dashboard';
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ identifier: '', password: '', remember: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  useDocumentTitle(t('common.logIn'));

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true); setError(null);
    try {
      const user = await login(form);
      navigate(safeReturnTo(searchParams.get('returnTo'), user), { replace: true });
    } catch (requestError) {
      setError(requestError);
    } finally { setSubmitting(false); }
  }

  return <div>
    <p className="eyebrow">{t('auth.welcome')}</p><h1 className="mt-2 text-3xl font-extrabold">{t('auth.loginTitle')}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{t('auth.loginSubtitle')}</p>
    {location.state?.protectedAction && <div className="mt-5"><AuthAlert type="info" title={t('auth.protectedTitle')}>{t('auth.protectedBody')}</AuthAlert></div>}
    {error && <div className="mt-5"><AuthAlert title={error.message}>{error.code === 'ACCOUNT_UNVERIFIED' ? t('auth.verifyEmail') : error.requestId ? `Reference: ${error.requestId}` : null}</AuthAlert></div>}
    <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
      <div><label htmlFor="identifier" className="mb-2 block text-xs font-extrabold">{t('auth.identifier')}</label><div className="relative"><Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" /><input id="identifier" name="identifier" autoComplete="username" className="input-base pl-11 rtl:pl-4 rtl:pr-11" placeholder={t('auth.identifierPlaceholder')} value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} required aria-describedby={error ? 'login-error' : undefined} /></div></div>
      <div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-xs font-extrabold">{t('common.password')}</label><Link to="/forgot-password" className="text-[11px] font-bold text-violet-700">{t('auth.forgot')}</Link></div><div className="relative"><LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" /><input id="password" name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} className="input-base px-11" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 rtl:left-3 rtl:right-auto" aria-label={showPassword ? 'Hide password' : 'Show password'}><Eye size={16} /></button></div></div>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={form.remember} onChange={(event) => setForm({ ...form, remember: event.target.checked })} className="h-4 w-4 rounded accent-violet-600" /> {t('auth.remember')}</label>
      <Button type="submit" disabled={submitting} className="w-full">{submitting ? t('auth.signingIn') : t('auth.loginAction')}</Button>
    </form>
    <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-slate-200" /><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('common.or')}</span><span className="h-px flex-1 bg-slate-200" /></div>
    <Button to={`/login/phone${searchParams.get('returnTo') ? `?returnTo=${encodeURIComponent(searchParams.get('returnTo'))}` : ''}`} variant="secondary" className="w-full">{t('auth.phoneOtp')}</Button>
    <div className="mt-3 grid grid-cols-3 gap-2">{['Google', 'Facebook', 'Apple'].map((provider) => <button type="button" disabled key={provider} title={t('auth.socialUnavailable')} className="h-10 rounded-xl border border-slate-200 text-[10px] font-extrabold text-slate-400 disabled:cursor-not-allowed">{provider}</button>)}</div>
    <p className="mt-7 text-center text-xs font-semibold text-slate-500">{t('auth.noAccount')} <Link to={`/register${searchParams.get('returnTo') ? `?returnTo=${encodeURIComponent(searchParams.get('returnTo'))}` : ''}`} className="font-extrabold text-violet-700">{t('auth.createAccount')}</Link></p>
    <p className="mt-6 flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-400"><ShieldCheck size={13} /> Secure session · HttpOnly refresh · Device controls</p>
  </div>;
}
