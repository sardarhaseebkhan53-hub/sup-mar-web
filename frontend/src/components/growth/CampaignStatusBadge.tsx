const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-violet-50 text-violet-700 border-violet-200',
  archived: 'bg-slate-50 text-slate-500 border-slate-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  eligible: 'bg-blue-50 text-blue-700 border-blue-200',
  rewarded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function CampaignStatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${style}`}>{status.replaceAll('_',' ')}</span>;
}
