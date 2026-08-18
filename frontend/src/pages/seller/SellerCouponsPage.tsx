import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import CouponCard from '../../components/growth/CouponCard';
import CampaignStatusBadge from '../../components/growth/CampaignStatusBadge';
import { sellerCouponApi } from '../../services/apiClient';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export default function SellerCouponsPage() {
  useDocumentTitle('Seller Coupons - QAVLIO');
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'percentage' as any, value: 10, endAt: new Date(Date.now()+7*86400000).toISOString().slice(0,16), minimumAmount: 0, usageLimit: 100, perUserLimit: 1, description: '' });

  const query = useQuery({ queryKey: ['seller-coupons'], queryFn: async () => (await sellerCouponApi.list()).data });

  const create = useMutation({
    mutationFn: () => sellerCouponApi.create({ ...form, endAt: new Date(form.endAt).toISOString(), code: form.code.toUpperCase() }),
    onSuccess: () => { setOpen(false); void client.invalidateQueries({ queryKey: ['seller-coupons'] }); setForm({ code: '', type: 'percentage', value: 10, endAt: new Date(Date.now()+7*86400000).toISOString().slice(0,16), minimumAmount: 0, usageLimit: 100, perUserLimit: 1, description: '' }); },
  });

  const toggleStatus = async (coupon: any) => {
    const newStatus = coupon.status === 'active' ? 'paused' : 'active';
    await sellerCouponApi.update(coupon._id || coupon.id, { status: newStatus });
    void client.invalidateQueries({ queryKey: ['seller-coupons'] });
  };

  return (
    <DashboardLayout role="seller">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <header>
          <p className="eyebrow">Growth tools</p>
          <h1 className="mt-2 text-3xl font-extrabold">Coupons</h1>
          <p className="mt-2 text-sm text-slate-500">Create coupons for your own listings. Seller A must never modify Seller B’s coupon.</p>
        </header>
        <Button onClick={()=>setOpen(true)}><Plus size={14}/>Create Coupon</Button>
      </div>

      {query.isLoading ? <div className="mt-6 h-40 animate-pulse rounded-panel bg-slate-200"/> : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(query.data?.coupons || []).map((c:any)=><article key={c._id} className="rounded-card border bg-white p-5">
            <div className="flex items-center justify-between"><h3 className="font-mono text-sm font-extrabold">{c.code}</h3><CampaignStatusBadge status={c.status}/></div>
            <p className="mt-2 text-xs text-slate-500">{c.description || `${c.type} ${c.value}`}</p>
            <div className="mt-3 flex gap-2 text-[11px] text-slate-500"><span>{c.usageCount||0}/{c.usageLimit||'∞'} used</span><span>Min {c.minimumAmount||0} PKR</span></div>
            <div className="mt-3 flex gap-2">
              <button onClick={()=>toggleStatus(c)} className="text-xs font-bold text-violet-600">{c.status==='active'?'Pause':'Activate'}</button>
              <button onClick={async ()=>{ const data = await sellerCouponApi.redemptions(c._id || c.id); alert(`Redemptions: ${data.data?.pagination?.total || data.data?.redemptions?.length || 0}`); }} className="text-xs font-bold text-slate-600">View usage</button>
            </div>
          </article>)}
          {!query.data?.coupons?.length && <div className="col-span-3 rounded-panel border border-dashed bg-white p-12 text-center"><Tag className="mx-auto text-slate-300"/><p className="mt-3 text-sm font-bold">No coupons yet</p><p className="mt-1 text-xs text-slate-500">Create discounts to drive sales. All validation is server-side and atomic.</p></div>}
        </div>
      )}

      <Modal open={open} title="Create Coupon" description="Eligible sellers can create coupons for own listings." onClose={()=>setOpen(false)}>
        <div className="grid gap-3">
          <label className="text-xs font-bold">Code<input value={form.code} onChange={e=>setForm(f=>({...f, code: e.target.value.toUpperCase()}))} placeholder="SUMMER20" className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm font-bold uppercase" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">Type<select value={form.type} onChange={e=>setForm(f=>({...f, type: e.target.value as any}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"><option value="percentage">Percentage</option><option value="fixed">Fixed PKR</option><option value="credit">Credit</option></select></label>
            <label className="text-xs font-bold">Value<input type="number" value={form.value} onChange={e=>setForm(f=>({...f, value: Number(e.target.value)}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">Ends At<input type="datetime-local" value={form.endAt} onChange={e=>setForm(f=>({...f, endAt: e.target.value}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Min Amount (PKR)<input type="number" value={form.minimumAmount} onChange={e=>setForm(f=>({...f, minimumAmount: Number(e.target.value)}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">Usage Limit<input type="number" value={form.usageLimit} onChange={e=>setForm(f=>({...f, usageLimit: Number(e.target.value)}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">Per User Limit<input type="number" value={form.perUserLimit} onChange={e=>setForm(f=>({...f, perUserLimit: Number(e.target.value)}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
          </div>
          <label className="text-xs font-bold">Description<textarea value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} className="mt-1 min-h-20 w-full rounded-control border bg-white px-3 py-2 text-sm" placeholder="Summer sale for my electronics listings"/></label>
          <Button onClick={()=>create.mutate()} loading={create.isPending} disabled={!form.code || !form.endAt}>Create Coupon</Button>
          {create.isError && <p className="text-xs font-bold text-red-600">{(create.error as any)?.message || 'Failed to create coupon'}</p>}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
