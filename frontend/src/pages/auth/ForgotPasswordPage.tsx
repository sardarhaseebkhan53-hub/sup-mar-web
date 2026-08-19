import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import AuthAlert from '../../components/auth/AuthAlert';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { authApi, QavlioApiError } from '../../services/apiClient';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: boolean; target?: string; tokenHint?: string; expiresAt?: string; channel?: string } | null>(null);
  useDocumentTitle(t('auth.forgotTitle'));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await authApi.forgotPassword(identifier);
      const data: any = response.data;
      setResult({
        sent: true,
        target: data.target,
        tokenHint: data.tokenHint,
        expiresAt: data.expiresAt,
        channel: data.channel,
      });
    } catch (requestError) {
      setError(requestError instanceof QavlioApiError ? requestError.message : t('errors.serverError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">{t('auth.forgotTitle')}</p>
      <h1 className="mt-2 text-3xl font-extrabold">{t('auth.forgotTitle')}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{t('auth.forgotSubtitle')}</p>
      {result?.sent && (
        <div className="mt-5">
          <AuthAlert type="success" title={t('auth.recoverySent')}>
            {t('auth.recoverySentBody')}
          </AuthAlert>
          {result.tokenHint && (
            <div className="mt-3 rounded-card border border-violet-200 bg-violet-50 p-4 text-[11px] leading-5 text-violet-900">
              <strong className="block text-xs uppercase tracking-wider">Secure reset token</strong>
              <p className="mt-1">Token ending <span className="font-mono font-bold">…{result.tokenHint}</span> has been issued.</p>
              <p className="mt-1 text-[10px] text-violet-700">Use it on the reset page. It is single-use and expires in 2 hours.</p>
            </div>
          )}
        </div>
      )}
      {error && <div className="mt-5"><AuthAlert title={error} /></div>}
      <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
        <label className="block text-xs font-extrabold" htmlFor="identifier">
          {t('common.email')} / {t('common.phone')}
          <span className="relative mt-2 block">
            <Mail size={17} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              className="input-base ps-11"
              placeholder={t('auth.identifierPlaceholder')}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </span>
        </label>
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? t('auth.sendingRecovery') : t('auth.sendRecovery')}
        </Button>
      </form>
      <p className="mt-6 flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-400">
        <ShieldCheck size={13} /> QAVLIO never reveals whether the email or phone exists.
      </p>
      <p className="mt-6 text-center text-xs font-semibold text-slate-500">
        <Link to="/login" className="inline-flex items-center gap-1 font-extrabold text-violet-700">
          <ArrowLeft size={13} className="rtl-flip" /> {t('common.back')} to {t('common.logIn')}
        </Link>
      </p>
    </div>
  );
}
