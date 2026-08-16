import React from 'react';
import { Blocks, CheckCircle2 } from 'lucide-react';
import DashboardHeading from '../../components/dashboard/DashboardHeading';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function DashboardFeaturePage({ role = 'customer', title, description, planned = [] }) {
  useDocumentTitle(title);
  return <DashboardLayout role={role}><DashboardHeading eyebrow={`${role} workspace`} title={title} description={description} /><section className="rounded-3xl border border-ink-900/10 bg-white p-7 shadow-sm"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Blocks /></span><h2 className="mt-5 text-lg font-extrabold">Routing and account permissions are ready.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">This feature belongs to a later marketplace phase. Phase 2 protects the route, preserves the account context, and provides an honest placeholder rather than fabricated activity.</p>{planned.length > 0 && <ul className="mt-6 grid gap-3 sm:grid-cols-2">{planned.map((item) => <li key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600"><CheckCircle2 size={15} className="text-violet-600" />{item}</li>)}</ul>}</section></DashboardLayout>;
}
