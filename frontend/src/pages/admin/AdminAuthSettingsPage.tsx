import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Shield, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '../../i18n';
import DashboardLayout from '../../layouts/DashboardLayout';
import AuthAlert from '../../components/auth/AuthAlert';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminApi, QavlioApiError } from '../../services/apiClient';

interface AuthSettings {
  otpEnabled: boolean;
  otpProvider: string;
  otpChannel: string;
  otpRequiredForSignup: boolean;
  otpRequiredForLogin: boolean;
  otpRequiredForPasswordReset: boolean;
  accountLinkingEnabled: boolean;
  passwordPolicy: { minLength: number; requireUppercase: boolean; requireLowercase: boolean; requireNumber: boolean; requireSpecial: boolean };
  providers: Record<string, { configured: boolean; enabled: boolean; clientId?: string; clientSecretMasked?: string }>;
  socialProviders: Array<{ provider: string; configured: boolean; enabled: boolean; protocol: string; clientId?: string }>;
}

export default function AdminAuthSettingsPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('admin.auth.title'));
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin-auth-settings'], queryFn: async () => (await adminApi.authSettings()).data as AuthSettings });
  const update = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminApi.updateAuthSettings(data),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-auth-settings'] }),
  });
  const [pendingOtpState, setPendingOtpState] = useState<boolean | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const data = query.data;
  const currentOtpState = pendingOtpState ?? data?.otpEnabled ?? false;
  const submitting = update.isPending;

  if (query.isLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="h-72 animate-pulse rounded-panel bg-slate-200" />
      </DashboardLayout>
    );
  }
  if (query.isError) {
    return (
      <DashboardLayout role="admin">
        <AuthAlert title={(query.error as QavlioApiError).message || t('errors.serverError')} />
      </DashboardLayout>
    );
  }
  if (!data) return null;

  function persistOtp(next: boolean) {
    if (next && !data?.otpProvider || next && data?.otpProvider === 'none') {
      setShowWarning(true);
      return;
    }
    update.mutate({ otpEnabled: next });
  }

  const ProviderBadge = ({ provider, label }: { provider: string; label: string }) => {
    const info = data.providers?.[provider] || { configured: false, enabled: false };
    const status = info.configured ? (info.enabled ? t('common.enabled') : t('common.configured')) : t('common.notConfigured');
    const tone = info.configured ? (info.enabled ? 'emerald' : 'violet') : 'slate';
    return (
      <div className="flex items-center justify-between rounded-card border border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-xs font-extrabold text-ink-900">{label}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">OIDC / OAuth 2.0 Authorization Code with PKCE</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${tone === 'emerald' ? 'bg-emerald-100 text-emerald-700' : tone === 'violet' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
          {status}
        </span>
      </div>
    );
  };

  return (
    <DashboardLayout role="admin">
      <header>
        <p className="eyebrow">Authentication</p>
        <h1 className="mt-2 text-3xl font-extrabold">{t('admin.auth.title')}</h1>
        <p className="mt-2 text-sm text-slate-500">{t('admin.auth.subtitle')}</p>
      </header>

      <section className="mt-6 rounded-panel border bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <Shield size={18} className="text-violet-600" /> {t('admin.auth.otpTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{t('admin.auth.otpDescription')}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${currentOtpState ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
              {currentOtpState ? 'ON' : 'OFF'}
            </span>
            <span className={`text-[11px] font-extrabold ${currentOtpState ? 'text-emerald-700' : 'text-slate-500'}`}>
              {currentOtpState ? t('common.enabled') : t('common.disabled')}
            </span>
            <span className="text-[9px] font-semibold text-slate-400">{currentOtpState ? t('admin.auth.otpStatusOn') : t('admin.auth.otpStatusOff')}</span>
          </div>
        </div>
        <p className="mt-3 rounded-card bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
          This policy is enforced by the backend for marketplace authentication. Administrator sign-in at /admin/login always uses username and password only.
        </p>

        {showWarning && (
          <div className="mt-4 rounded-card border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-extrabold">
              <TriangleAlert size={16} /> {t('admin.auth.warningTurnOn')}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => { setShowWarning(false); setPendingOtpState(null); }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setShowWarning(false);
                  setPendingOtpState(null);
                  update.mutate({ otpEnabled: true });
                }}
              >
                {t('admin.auth.confirmEnable')}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{t('admin.auth.otpProvider')}</p>
            <p className="mt-2 text-sm font-bold text-ink-900">
              {data.otpProvider && data.otpProvider !== 'none' ? data.otpProvider : t('admin.auth.otpProviderNone')}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">{t('admin.auth.otpChannel')}: {data.otpChannel}</p>
          </div>
          <div className="rounded-card border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{t('admin.auth.otpChannel')}</p>
            <select
              value={data.otpChannel}
              onChange={(event) => update.mutate({ otpChannel: event.target.value })}
              className="input-base mt-2 h-10 text-sm"
            >
              <option value="sms">{t('admin.auth.otpChannelSms')}</option>
              <option value="email">{t('admin.auth.otpChannelEmail')}</option>
              <option value="both">{t('admin.auth.otpChannelBoth')}</option>
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {[
            { key: 'otpRequiredForSignup', label: t('admin.auth.requireSignup') },
            { key: 'otpRequiredForLogin', label: t('admin.auth.requireLogin') },
            { key: 'otpRequiredForPasswordReset', label: t('admin.auth.requireReset') },
          ].map((row) => (
            <label key={row.key} className="flex items-center justify-between gap-3 rounded-control border border-slate-200 bg-white px-3 py-2">
              <span className="text-xs font-extrabold text-ink-900">{row.label}</span>
              <input
                type="checkbox"
                disabled={!currentOtpState || submitting}
                checked={Boolean((data as any)[row.key])}
                onChange={(event) => update.mutate({ [row.key]: event.target.checked })}
                className="h-5 w-5 accent-violet-600 disabled:opacity-50"
              />
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={currentOtpState ? 'secondary' : 'primary'}
            loading={submitting}
            onClick={() => persistOtp(!currentOtpState)}
          >
            {currentOtpState ? t('admin.auth.confirmDisable') : t('admin.auth.confirmEnable')}
          </Button>
          {update.isSuccess && (
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700">
              <Check size={13} /> {t('admin.auth.saved')}
            </span>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-panel border bg-white p-5">
        <h2 className="text-lg font-extrabold">{t('admin.auth.providers')}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-slate-200 bg-white p-3">
            <p className="text-xs font-extrabold">{t('admin.auth.emailPassword')}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">10+ characters, mixed case, number, special.</p>
            <span className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-extrabold text-emerald-700">{t('common.enabled')}</span>
          </div>
          <ProviderBadge provider="google" label="Google" />
          <ProviderBadge provider="apple" label="Apple" />
          <ProviderBadge provider="microsoft" label="Microsoft" />
          <ProviderBadge provider="facebook" label="Facebook" />
        </div>
        <p className="mt-4 text-[10px] font-semibold text-slate-500">
          Providers are configured through environment variables (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, APPLE_*, MICROSOFT_*, FACEBOOK_*). The toggle above turns the integration on once credentials are present.
        </p>
      </section>

      {update.error && (
        <p role="alert" className="mt-4 rounded-card bg-red-50 p-4 text-xs font-bold text-red-700">
          {(update.error as QavlioApiError).message}
        </p>
      )}
    </DashboardLayout>
  );
}
