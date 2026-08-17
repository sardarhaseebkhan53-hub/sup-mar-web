import { MailWarning } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AuthUser } from '../../types/auth';

export default function VerificationBanner({ user }: { user: AuthUser }) {
  if (user.verification.email?.status === 'verified' || !user.email) return null;
  return <aside className="mb-5 flex flex-col gap-3 rounded-card border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center"><MailWarning className="shrink-0 text-amber-700" /><div className="flex-1"><p className="text-xs font-extrabold text-amber-900">Verify your email</p><p className="mt-1 text-[10px] text-amber-800/75">Verification protects account recovery and future marketplace actions.</p></div><Link to={`/verify-email?target=${encodeURIComponent(user.email)}`} className="text-xs font-extrabold text-amber-800 underline">Open verification</Link></aside>;
}
