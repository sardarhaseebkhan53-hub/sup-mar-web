import { Apple, Mail, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useTranslation } from '../../i18n';
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

export default function LoginPage() {
  const { t, locale } = useTranslation();
  const [form, setForm] = useState({ identifier: '', password: '', remember: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<QavlioApiError | null>(null);
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  useDocumentTitle(t('auth.loginTitle'));

  const errorMap: Record<string, string> = {
    INVALID_CREDENTIALS: t('errors.invalidCredentials'),
    ACCOUNT_UNVERIFIED: t('errors.accountUnverified'),
    ACCOUNT_SUSPENDED: t('errors.accountSuspended'),
    ACCOUNT_BANNED: t('errors.accountBanned'),
    ACCOUNT_DEACTIVATED: t('errors.accountDeactivated'),
    NETWORK_ERROR: t('errors.network'),
    LOGIN_LOCKED: t('errors.tooManyAttempts'),
  };
  const friendlyError = (err: QavlioApiError) => errorMap[err.code] || err.message;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(form);
      navigate(safeReturnTo(searchParams.get('returnTo'), user), { replace: true });
    } catch (requestError) {
      setError(requestError instanceof QavlioApiError ? requestError : new QavlioApiError(t('errors.serverError')));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">{t('auth.welcome')}</p>
      <h1 className="mt-2 text-3xl font-extrabold">{t('auth.loginTitle')}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{t('auth.loginSubtitle')}</p>
      {location.state?.protectedAction && (
        <div className="mt-5">
          <AuthAlert type="info" title={t('auth.protectedTitle')}>
            {t('auth.protectedBody')}
          </AuthAlert>
        </div>
      )}
      {error && (
        <div className="mt-5" id="login-error">
          <AuthAlert title={friendlyError(error)}>
            {error.code === 'ACCOUNT_UNVERIFIED' ? (
              <Link to={`/verify-email?target=${encodeURIComponent(form.identifier)}`} className="font-extrabold underline">
                {t('auth.verifyEmail')}
              </Link>
            ) : error.requestId ? `Reference: ${error.requestId}` : null}
          </AuthAlert>
        </div>
      )}
      <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
        <label className="block text-xs font-extrabold" htmlFor="identifier">
          {t('common.email')}
          <span className="relative mt-2 block">
            <Mail size={17} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="identifier"
              name="identifier"
              type="email"
              autoComplete="username"
              className="input-base ps-11"
              placeholder={t('auth.identifierPlaceholder')}
              value={form.identifier}
              onChange={(event) => setForm({ ...form, identifier: event.target.value })}
              required
              aria-describedby={error ? 'login-error' : undefined}
            />
          </span>
        </label>
        <div>
          <div className="mb-2 flex justify-end">
            <Link to="/forgot-password" className="text-[11px] font-bold text-violet-700">
              {t('auth.forgot')}
            </Link>
          </div>
          <PasswordField
            id="password"
            name="password"
            label={t('common.password')}
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={form.remember}
            onChange={(event) => setForm({ ...form, remember: event.target.checked })}
            className="h-4 w-4 rounded accent-violet-600"
          />
          {t('auth.remember')}
        </label>
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? t('auth.signingIn') : t('auth.loginAction')}
        </Button>
      </form>
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('common.or')}</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <Button to={`/login/phone${searchParams.get('returnTo') ? `?returnTo=${encodeURIComponent(searchParams.get('returnTo')!)}` : ''}`} variant="secondary" className="w-full">
        {t('auth.phoneOtp')}
      </Button>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled
          title={t('auth.socialUnavailable')}
          className="h-10 rounded-xl border border-slate-200 text-[10px] font-extrabold text-slate-400 disabled:cursor-not-allowed"
        >
          Google
        </button>
        <button
          type="button"
          disabled
          title={t('auth.socialAppleUnavailable')}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 text-[10px] font-extrabold text-slate-400 disabled:cursor-not-allowed"
        >
          <Apple size={14} /> Apple
        </button>
        <button
          type="button"
          disabled
          title={t('auth.socialMicrosoftUnavailable')}
          className="h-10 rounded-xl border border-slate-200 text-[10px] font-extrabold text-slate-400 disabled:cursor-not-allowed"
        >
          Microsoft
        </button>
      </div>
      <p className="mt-3 text-center text-[10px] font-semibold text-slate-400">
        {locale === 'en'
          ? 'Social sign-in is safely disabled until provider credentials are configured.'
          : 'سوشل لاگ اِن محفوظ طریقے سے غیر فعال ہے جب تک فراہم کنندہ کی اسناد ترتیب نہیں دی جاتیں۔'}
      </p>
      <p className="mt-7 text-center text-xs font-semibold text-slate-500">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-extrabold text-violet-700">
          {t('auth.createAccount')}
        </Link>
      </p>
      <p className="mt-6 flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-400">
        <ShieldCheck size={13} /> Secure session · HttpOnly refresh · Device controls
      </p>
    </div>
  );
}
