import { BadgeCheck, Clock3, ShieldQuestion, XCircle, type LucideIcon } from 'lucide-react';
import type { VerificationState } from '../../types/auth';
const styles: Record<VerificationState, { className: string; Icon: LucideIcon }> = {
  verified: { className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', Icon: BadgeCheck }, pending: { className: 'bg-amber-50 text-amber-700 ring-amber-600/15', Icon: Clock3 }, rejected: { className: 'bg-rose-50 text-rose-700 ring-rose-600/15', Icon: XCircle }, expired: { className: 'bg-slate-100 text-slate-600 ring-slate-500/15', Icon: Clock3 }, not_verified: { className: 'bg-slate-100 text-slate-500 ring-slate-500/15', Icon: ShieldQuestion },
};
export default function VerificationBadge({ label, status = 'not_verified' }: { label: string; status?: VerificationState }) { const config = styles[status] || styles.not_verified; const Icon = config.Icon; return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-extrabold ring-1 ${config.className}`}><Icon size={13} />{label}<span className="capitalize opacity-60">· {status.replace('_', ' ')}</span></span>; }
