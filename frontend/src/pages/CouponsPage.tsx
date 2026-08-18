import { useQuery } from '@tanstack/react-query';
import { Tag, Percent, Gift } from 'lucide-react';
import CouponCard from '../components/growth/CouponCard';
import CouponInput from '../components/growth/CouponInput';
import { couponApi } from '../services/apiClient';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useState } from 'react';

export default function CouponsPage() {
  useDocumentTitle('Coupons - QAVLIO');
  const [preview, setPreview] = useState<any>(null);

  const publicCoupons = useQuery({ queryKey: ['coupons-public'], queryFn: async () => (await couponApi.public()).data });

  return (
      <div className="container-shell py-8">
        <header>
          <p className="eyebrow">Savings & offers</p>
          <h1 className="mt-2 text-3xl font-extrabold">Coupons</h1>
          <p className="mt-2 text-sm text-slate-500">Platform-wide, seller, and campaign coupons. All discounts are validated server-side. Never trust browser values.</p>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-sm font-extrabold">Available Coupons</h2>
            {publicCoupons.isLoading ? <div className="mt-3 h-40 animate-pulse rounded-card bg-slate-200"/> : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(publicCoupons.data?.coupons || []).map((c:any)=><CouponCard key={c._id || c.code} coupon={c}/>)}
                {!publicCoupons.data?.coupons?.length && <div className="col-span-2 rounded-card border border-dashed bg-white p-8 text-center"><Tag className="mx-auto text-slate-300"/><p className="mt-3 text-sm font-bold">No active coupons</p><p className="mt-1 text-xs text-slate-500">Check back soon for new promotions.</p></div>}
              </div>
            )}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <article className="rounded-card border bg-white p-4"><Percent className="text-violet-600" size={18}/><p className="mt-2 text-sm font-extrabold">Percentage & Fixed</p><p className="mt-1 text-[11px] text-slate-500">Supports % and fixed PKR discounts with max cap.</p></article>
              <article className="rounded-card border bg-white p-4"><Gift className="text-emerald-600" size={18}/><p className="mt-2 text-sm font-extrabold">Abuse Resistant</p><p className="mt-1 text-[11px] text-slate-500">Usage limits, per-user limits, atomic redemption.</p></article>
              <article className="rounded-card border bg-white p-4"><Tag className="text-amber-600" size={18}/><p className="mt-2 text-sm font-extrabold">Transparent</p><p className="mt-1 text-[11px] text-slate-500">Clear error messages: expired, min amount, category mismatch.</p></article>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-extrabold">Validate Coupon</h2>
            <p className="mt-1 text-xs text-slate-500">Test a coupon against an order amount. Backend is authoritative.</p>
            <div className="mt-3">
              <CouponInput amount={5000} onApplied={(p,c)=>setPreview({p,c}) } onRemove={()=>setPreview(null)}/>
              {preview && <div className="mt-4 rounded-card border bg-slate-50 p-4 text-xs"><p className="font-bold">Preview</p><p className="mt-2">Original: {preview.p.originalAmount} PKR</p><p>Discount: {preview.p.discount} PKR</p><p>Final: {preview.p.finalAmount} PKR</p><p className="mt-2 text-[10px] text-slate-500">Coupon: {preview.c.code} · {preview.c.type}</p></div>}
            </div>
            <div className="mt-6 rounded-card border bg-violet-50 p-4 text-xs"><p className="font-extrabold text-violet-900">Security Notes</p><ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-violet-800"><li>Brute-force protection</li><li>Expiration-aware</li><li>Race-condition safe via transactions</li><li>No client-side amount authority</li></ul></div>
          </div>
        </section>
      </div>
  );
}
