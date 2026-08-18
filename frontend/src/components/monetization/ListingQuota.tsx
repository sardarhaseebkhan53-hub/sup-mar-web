import { CircleCheck, Info } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';

export default function ListingQuota({ quota }: { quota?: any }) {
  const available = Number(quota?.freeListingsRemaining || 0) > 0;
  return <section className={`rounded-card border p-5 ${available ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
    <div className="flex items-start gap-3">{available ? <CircleCheck className="text-emerald-700" size={20}/> : <Info className="text-amber-700" size={20}/>}<div><h2 className="text-sm font-extrabold">{available ? `${quota.freeListingsRemaining} free listing available` : 'Your free listing has been used.'}</h2><p className="mt-1 text-xs text-slate-600">{available ? 'Your next eligible listing can be published free.' : `Additional listing: ${formatPrice(quota?.additionalListingPrice || 0, quota?.currency || 'PKR')}`}</p></div></div>
  </section>;
}
