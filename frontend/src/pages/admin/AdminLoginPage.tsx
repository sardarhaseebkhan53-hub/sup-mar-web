import { KeyRound, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../../auth/AdminAuthProvider';
import AuthAlert from '../../components/auth/AuthAlert';
import PasswordField from '../../components/auth/PasswordField';
import { Button } from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { QavlioApiError } from '../../services/apiClient';

/** Only same-origin admin paths are accepted as a post-login destination. */
function safeAdminReturnTo(value: string | null) {
  if (value && value.startsWith('/admin') && !value.startsWith('//') && !value.startsWith('/admin/login')) return value;
  return '/admin/dashboard';
}

/**
 * Administrator sign-in.
 *
 * Username + password only. No phone number, no OTP, no marketplace profile checks.
 * Credentials are verified by the backend at POST /api/v1/admin/auth/login — the
 * browser bundle never contains an administrator password.
 */
export default function AdminLoginPage() {
  useDocumentTitle('QAVLIO Admin — Sign in');
  const { admin, loading, login } = useAdminAuth();
  const [form, setForm] = useState({ username: '', password: '', remember: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<QavlioApiError | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const destination = safeAdminReturnTo(searchParams.get('returnTo'));

  if (!loading && admin) return <Navigate to={destination} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await login({ username: form.username.trim(), password: form.password, remember: form.remember });
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof QavlioApiError ? requestError : new QavlioApiError('Admin sign-in failed. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600/20 text-violet-300">
            <ShieldCheck size={24} />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold">QAVLIO Admin</h1>
          <p className="mt-2 text-xs font-semibold text-white/50">Restricted area · Administrator credentials required</p>
        </div>

        <div className="rounded-panel bg-white p-6 shadow-floating sm:p-8">
          {error && (
            <div className="mb-5" id="admin-login-error">
              <AuthAlert title={error.message}>
                {error.code === 'NOT_AN_ADMINISTRATOR'
                  ? 'This account exists but does not hold an administrator role.'
                  : error.requestId
                    ? `Reference: ${error.requestId}`
                    : null}
              </AuthAlert>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <label className="block text-xs font-extrabold" htmlFor="admin-username">
              Username
              <span className="relative mt-2 block">
                <UserRound size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="input-base px-11"
                  placeholder="admin"
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  required
                  aria-describedby={error ? 'admin-login-error' : undefined}
                />
              </span>
            </label>

            <PasswordField
              id="admin-password"
              name="password"
              label="Password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(event) => setForm({ ...form, remember: event.target.checked })}
                className="h-4 w-4 rounded accent-violet-600"
              />
              Keep me signed in on this device
            </label>

            <Button type="submit" loading={submitting} className="w-full">
              {submitting ? 'Signing in…' : 'Sign in to Admin Panel'}
            </Button>
          </form>

          <p className="mt-6 flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-400">
            <LockKeyhole size={13} /> Credentials are verified server-side · HttpOnly admin session
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] font-semibold text-white/40">
          <KeyRound size={12} className="mr-1 inline" />
          Marketplace customer or seller?{' '}
          <Link to="/login" className="font-extrabold text-violet-300 underline">
            Use the QAVLIO account login
          </Link>
        </p>
      </div>
    </div>
  );
}
