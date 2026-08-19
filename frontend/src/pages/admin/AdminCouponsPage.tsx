import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import CampaignStatusBadge from '../../components/growth/CampaignStatusBadge';
import { adminCouponApi } from '../../services/apiClient';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export default function AdminCouponsPage() {
  useDocumentTitle('Admin Coupons - QAVLIO');
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ code: '', type: 'percentage' as any, value: 15, endAt: new Date(Date.now()+30*86400000).toISOString().slice(0,16), scope: 'platform' as any, minimumAmount: 0, usageLimit: 1000, perUserLimit: 1, description: '' });

  const query = useQuery({ queryKey: ['admin-coupons', statusFilter], queryFn: async () => (await adminCouponApi.list(statusFilter ? `?status=${statusFilter}` : '')).data });

  const create = useMutation({
    mutationFn: () => adminCouponApi.create({ ...form, endAt: new Date(form.endAt).toISOString(), code: form.code.toUpperCase() }),
    onSuccess: () => { setOpen(false); void client.invalidateQueries({ queryKey: ['admin-coupons'] }); },
  });

  const toggle = async (c:any) => {
    const newStatus = c.status === 'active' ? 'paused' : 'active';
    await adminCouponApi.update(c._id || c.id, { status: newStatus });
    void client.invalidateQueries({ queryKey: ['admin-coupons'] });
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <header>
          <p className="eyebrow">Growth engine</p>
          <h1 className="mt-2 text-3xl font-extrabold">Coupons</h1>
          <p className="mt-2 text-sm text-slate-500">Create, pause, activate, expire, and view usage. Platform-wide, seller, and campaign scopes.</p>
        </header>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-11 rounded-control border bg-white px-3 text-xs"><option value="">All</option><option value="active">Active</option><option value="paused">Paused</option><option value="expired">Expired</option><option value="disabled">Disabled</option></select>
          <Button onClick={()=>setOpen(true)}><Plus size={14}/>New Coupon</Button>
        </div>
      </div>

      {query.isLoading ? <div className="mt-6 h-60 animate-pulse rounded-panel bg-slate-200"/> : (
        <div className="mt-6 overflow-hidden rounded-panel border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody className="divide-y">
                {(query.data?.coupons || []).map((c:any)=><tr key={c._id} className="hover:bg-slate-50/50"><td className="px-4 py-3 font-mono font-bold">{c.code}</td><td className="px-4 py-3 capitalize">{c.type}</td><td className="px-4 py-3">{c.value}{c.type==='percentage'?'%':' PKR'}</td><td className="px-4 py-3 capitalize">{c.scope}</td><td className="px-4 py-3">{c.usageCount||0}/{c.usageLimit||'∞'}</td><td className="px-4 py-3"><CampaignStatusBadge status={c.status}/></td><td className="px-4 py-3 flex gap-2"><button onClick={()=>toggle(c)} className="font-bold text-violet-600">{c.status==='active'?'Pause':'Activate'}</button><button onClick={async ()=>{ const r = await adminCouponApi.redemptions(c._id || c.id); alert(`Total redemptions: ${r.data?.pagination?.total ?? r.data?.redemptions?.length ?? 0}`); }} className="font-bold text-slate-600">Usage</button></td></tr>)}
              </tbody>
            </table>
          </div>
          {!query.data?.coupons?.length && <p className="p-10 text-center text-xs text-slate-500">No coupons.</p>}
        </div>
      )}

      <Modal open={open} title="Create Coupon" description="Server validates code, status, dates, limits, eligibility." onClose={()=>setOpen(false)}>
        <div className="grid gap-3">
          <label className="text-xs font-bold">Code<input value={form.code} onChange={e=>setForm(f=>({...f, code: e.target.value.toUpperCase()}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 font-mono text-sm font-bold uppercase"/></label>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-bold">Type<select value={form.type} onChange={e=>setForm(f=>({...f, type: e.target.value as any}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"><option value="percentage">Percentage</option><option value="fixed">Fixed</option><option value="credit">Credit</option></select></label>
            <label className="text-xs font-bold">Value<input type="number" value={form.value} onChange={e=>setForm(f=>({...f, value: Number(e.target.value)}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Scope<select value={form.scope} onChange={e=>setForm(f=>({...f, scope: e.target.value as any}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"><option value="platform">Platform</option><option value="seller">Seller</option><option value="campaign">Campaign</option></select></label>
          </div>
          <label className="text-xs font-bold">Ends At<input type="datetime-local" value={form.endAt} onChange={e=>setForm(f=>({...f, endAt: e.target.value}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-bold">Min Amount<input type="number" value={form.minimumAmount} onChange={e=>setForm(f=>({...f, minimumAmount: Number(e.target.value)}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Usage Limit<input type="number" value={form.usageLimit} onChange={e=>setForm(f=>({...f, usageLimit: Number(e.target.value)}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Per User<input type="number" value={form.perUserLimit} onChange={e=>setForm(f=>({...f, perUserLimit: Number(e.target.value)}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
          </div>
          <label className="text-xs font-bold">Description<textarea value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} className="mt-1 min-h-20 w-full rounded-control border bg-white px-3 py-2 text-sm"/></label>
          <Button onClick={()=>create.mutate()} loading={create.isPending}>Create</Button>
          {create.isError && <p className="text-xs font-bold text-red-600">{(create.error as any)?.message}</p>}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
