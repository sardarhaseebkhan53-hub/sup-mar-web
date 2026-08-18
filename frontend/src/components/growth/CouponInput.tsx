import { useState } from 'react';
import { Tag, Loader2, Check, X } from 'lucide-react';
import { couponApi } from '../../services/apiClient';

export default function CouponInput({ amount, listingId, onApplied, onRemove }: { amount: number; listingId?: string; onApplied: (preview:any, coupon:any)=>void; onRemove?: ()=>void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const validate = async () => {
    if (!code.trim()) { setError('Enter a coupon code'); return; }
    setLoading(true); setError(null);
    try {
      const res = await couponApi.validate({ code: code.trim(), amount, listingId });
      setPreview(res.data.preview);
      setAppliedCoupon(res.data.coupon);
      onApplied(res.data.preview, res.data.coupon);
    } catch (e:any) {
      setError(e?.message || 'Coupon validation failed');
      setPreview(null);
    } finally { setLoading(false); }
  };

  const clear = () => {
    setCode(''); setPreview(null); setAppliedCoupon(null); setError(null);
    onRemove?.();
  };

  return (
    <div className="rounded-card border bg-white p-4">
      <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Coupon Code</label>
      <div className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <Tag size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="ENTER CODE" className="h-11 w-full rounded-control border bg-white pl-9 pr-3 text-sm font-bold uppercase tracking-widest placeholder:tracking-normal" />
        </div>
        {!preview ? <button disabled={loading} onClick={validate} className="inline-flex h-11 items-center justify-center rounded-control bg-violet-600 px-5 text-xs font-extrabold text-white disabled:opacity-50">{loading ? <Loader2 size={14} className="animate-spin"/> : 'Apply'}</button> : <button onClick={clear} className="inline-flex h-11 items-center justify-center rounded-control border bg-white px-4 text-xs font-bold">Remove</button>}
      </div>
      {error && <p className="mt-2 flex items-center gap-1 text-xs font-bold text-red-600"><X size={12}/>{error}</p>}
      {preview && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs">
        <p className="flex items-center gap-1 font-extrabold text-emerald-800"><Check size={14}/>Coupon applied: {appliedCoupon?.code}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
          <div><span className="block text-[9px] text-slate-500">Original</span><strong>{preview.originalAmount} PKR</strong></div>
          <div><span className="block text-[9px] text-slate-500">Discount</span><strong className="text-emerald-700">-{preview.discount} PKR</strong></div>
          <div><span className="block text-[9px] text-slate-500">Final</span><strong>{preview.finalAmount} PKR</strong></div>
        </div>
      </div>}
    </div>
  );
}
