import React, { useEffect, useState } from 'react';
import { ArrowRight, Phone, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthAlert from '../../components/auth/AuthAlert';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useTranslation } from '../../i18n';
import { authApi, marketplaceApi, QavlioApiError } from '../../services/apiClient';

export default function PhoneLoginPage() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [otpStatus, setOtpStatus] = useState({ enabled: false, loading: true });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useDocumentTitle(t('auth.otpLoginTitle'));

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await marketplaceApi.getPublicConfig();
        if (active && response?.data?.auth?.otp) {
          setOtpStatus({ enabled: Boolean(response.data.auth.otp.enabled), loading: false });
        } else {
          setOtpStatus({ enabled: false, loading: false });
        }
      } catch {
        if (active) setOtpStatus({ enabled: false, loading: false });
      }
    })();
    return () => { active = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await authApi.requestOtp(phone);
      const data = response.data;
      if (data?.disabled) {
        setError(new Error(t('auth.otpDisabledMessage')));
        return;
      }
      const params = new URLSearchParams({
        phone: data.normalizedTarget,
        target: data.target,
        purpose: data.purpose,
      });
      const returnTo = searchParams.get('returnTo');
      if (returnTo) params.set('returnTo', returnTo);
      navigate(`/verify-otp?${params}`);
    } catch (requestError) {
      setError(requestError instanceof QavlioApiError ? requestError : new Error(t('errors.serverError')));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div>
      <p className="eyebrow">Secure passwordless access</p>
      <h1 className="mt-2 text-3xl font-extrabold">{t('auth.otpLoginTitle')}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{t('auth.otpLoginSubtitle')}</p>
      {!otpStatus.loading && !otpStatus.enabled && (
        <div className="mt-5">
          <AuthAlert type="info" title={t('auth.otpDisabledMessage')}>
            {t('errors.serverError')}
          </AuthAlert>
        </div>
      )}
      {error && <div className="mt-5"><AuthAlert title={error.message} /></div>}
      <form onSubmit={submit} className="mt-7">
        <label htmlFor="otp-phone" className="text-xs font-extrabold">{t('common.phone')}</label>
        <div className="relative mt-2">
          <Phone size={17} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="otp-phone"
            type="tel"
            autoComplete="tel"
            className="input-base ps-11"
            placeholder="0300 1234567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            disabled={!otpStatus.enabled}
          />
        </div>
        <Button type="submit" disabled={submitting || !otpStatus.enabled} className="mt-5 w-full">
          {submitting ? t('auth.sendingOtp') : t('auth.sendOtp')}
          <ArrowRight size={16} className="rtl-flip" />
        </Button>
      </form>
      <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-[10px] font-semibold leading-5 text-emerald-800">
        <ShieldCheck size={17} className="shrink-0" />
        OTP codes expire, have strict attempt limits, and are validated only by QAVLIO servers.
      </div>
      <p className="mt-6 text-center text-xs font-semibold text-slate-500">
        <Link to="/login" className="font-extrabold text-violet-700">{t('auth.loginAction')}</Link>
      </p>
    </div>
  );
}
