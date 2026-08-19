import { useQuery } from '@tanstack/react-query';
import { KeyRound, LockKeyhole, ShieldCheck, UserCog } from 'lucide-react';
import { useAdminAuth } from '../../auth/AdminAuthProvider';
import AuthAlert from '../../components/auth/AuthAlert';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';
import { adminApi, QavlioApiError } from '../../services/apiClient';

/**
 * Admin security posture. Everything shown here is read from the live backend
 * configuration — no fabricated data, no secrets.
 */
export default function AdminSecurityPage() {
  useDocumentTitle('Admin security');
  const { admin, permissions } = useAdminAuth();
  const query = useQuery({ queryKey: ['admin-auth-settings'], queryFn: async () => (await adminApi.authSettings()).data as any });
  const settings = query.data;
  const policy = settings?.passwordPolicy;

  return (
    <DashboardLayout role="admin">
      <header>
        <p className="eyebrow">Administrator</p>
        <h1 className="mt-2 text-3xl font-extrabold">Security</h1>
        <p className="mt-2 text-sm text-slate-500">
          The Admin Panel uses its own authentication context. Administrator sessions are separate from marketplace customer and seller sessions.
        </p>
      </header>

      {query.isError && (
        <div className="mt-6">
          <AuthAlert title={(query.error as QavlioApiError).message || 'Security settings could not be loaded'} />
        </div>
      )}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-panel border bg-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><UserCog size={18} className="text-violet-600" /> Current admin session</h2>
          <dl className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between gap-3"><dt className="font-bold text-slate-500">Administrator</dt><dd className="font-extrabold text-ink-900">{admin?.name}</dd></div>
            <div className="flex justify-between gap-3"><dt className="font-bold text-slate-500">Username</dt><dd className="font-extrabold text-ink-900">{admin?.username || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="font-bold text-slate-500">Roles</dt><dd className="font-extrabold capitalize text-ink-900">{(admin?.roles || []).join(', ').replace(/_/g, ' ') || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="font-bold text-slate-500">Last sign-in</dt><dd className="font-extrabold text-ink-900">{admin?.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="font-bold text-slate-500">Session transport</dt><dd className="font-extrabold text-emerald-700">HttpOnly rotating refresh cookie</dd></div>
          </dl>
        </article>

        <article className="rounded-panel border bg-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><LockKeyhole size={18} className="text-violet-600" /> Password policy</h2>
          {query.isLoading ? (
            <div className="mt-4 h-32 animate-pulse rounded-card bg-slate-100" />
          ) : (
            <ul className="mt-4 space-y-2 text-xs font-bold text-slate-600">
              <li>Minimum length: <strong className="text-ink-900">{policy?.minLength ?? 10}</strong> characters</li>
              <li>Uppercase required: <strong className="text-ink-900">{policy?.requireUppercase ? 'Yes' : 'No'}</strong></li>
              <li>Lowercase required: <strong className="text-ink-900">{policy?.requireLowercase ? 'Yes' : 'No'}</strong></li>
              <li>Number required: <strong className="text-ink-900">{policy?.requireNumber ? 'Yes' : 'No'}</strong></li>
              <li>Special character required: <strong className="text-ink-900">{policy?.requireSpecial ? 'Yes' : 'No'}</strong></li>
            </ul>
          )}
          <p className="mt-4 text-[10px] font-semibold text-slate-400">Passwords are stored as bcrypt hashes only. Plaintext credentials are never persisted.</p>
        </article>

        <article className="rounded-panel border bg-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><ShieldCheck size={18} className="text-violet-600" /> Admin authorization</h2>
          <p className="mt-2 text-xs text-slate-500">Every /admin API endpoint requires an authenticated identity that also holds an administrator role.</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {permissions.length
              ? permissions.map((permission) => (
                <span key={permission} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600">{permission}</span>
              ))
              : <span className="text-xs text-slate-400">No permissions resolved for this session.</span>}
          </div>
        </article>

        <article className="rounded-panel border bg-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><KeyRound size={18} className="text-violet-600" /> Second factor</h2>
          {query.isLoading ? (
            <div className="mt-4 h-24 animate-pulse rounded-card bg-slate-100" />
          ) : (
            <>
              <p className="mt-2 text-xs text-slate-500">
                OTP verification is currently{' '}
                <strong className={settings?.otpEnabled ? 'text-emerald-700' : 'text-slate-700'}>{settings?.otpEnabled ? 'enabled' : 'disabled'}</strong>{' '}
                for the marketplace authentication flow.
              </p>
              <p className="mt-3 text-[11px] font-semibold text-slate-500">
                Administrator sign-in requires username and password. No additional administrator factor is configured, so no OTP step is requested at /admin/login.
              </p>
            </>
          )}
        </article>
      </section>
    </DashboardLayout>
  );
}
