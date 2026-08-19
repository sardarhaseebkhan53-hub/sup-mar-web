import { CheckCircle2, KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import AuthAlert from '../../components/auth/AuthAlert';
import PasswordField from '../../components/auth/PasswordField';
import PasswordStrength, { passwordChecks } from '../../components/auth/PasswordStrength';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { authApi, QavlioApiError } from '../../services/apiClient';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState(searchParams.get('target') || '');
  const [tokenOrCode, setTokenOrCode] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle(t('auth.resetTitle'));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) { setError(t('auth.passwordMismatch')); return; }
    if (!passwordChecks(password).every((item) => item.passed)) { setError(t('auth.strongerPassword')); return; }
    setSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword({ identifier, tokenOrCode, password, confirmPassword });
      setSuccess(true);
    } catch (requestError) {
      const code = requestError instanceof QavlioApiError ? requestError.code : '';
      setError(
        code === 'OTP_EXPIRED'
          ? 'This reset token has expired. Request a new one.'
          : code === 'OTP_INVALID' || code === 'RESET_INVALID'
            ? 'This reset token is invalid or has already been used.'
            : requestError instanceof Error
              ? requestError.message
              : t('errors.serverError'),
      );
    } finally { setSubmitting(false); }
  }
  if (success) {
    return (
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
          <CheckCircle2 size={30} />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold">{t('auth.resetSuccess')}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{t('auth.resetSuccessBody')}</p>
        <Button to="/login" className="mt-7 w-full">{t('common.logIn')}</Button>
      </div>
    );
  }
  return (
    <div>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700">
        <KeyRound />
      </span>
      <h1 className="mt-5 text-3xl font-extrabold">{t('auth.resetTitle')}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{t('auth.resetSubtitle')}</p>
      {error && <div className="mt-5"><AuthAlert title={error} /></div>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-xs font-extrabold">
          {t('common.email')}
          <input type="email" className="input-base mt-2" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
        </label>
        <label className="block text-xs font-extrabold">
          {localeAwareLabel(t)}
          <input className="input-base mt-2 font-mono" value={tokenOrCode} onChange={(event) => setTokenOrCode(event.target.value)} required />
        </label>
        <div>
          <PasswordField label={t('security.newPassword')} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <PasswordStrength password={password} />
        </div>
        <PasswordField
          label={t('common.confirmPassword')}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          error={confirmPassword && confirmPassword !== password ? t('auth.passwordMismatch') : undefined}
        />
        <Button type="submit" loading={submitting} className="w-full">{t('auth.resetAction')}</Button>
      </form>
    </div>
  );
}

function localeAwareLabel(t: (k: string) => string) {
  return t('auth.verifyCode').includes('verification') ? 'Secure reset token' : 'محفوظ ری سیٹ ٹوکن';
}
