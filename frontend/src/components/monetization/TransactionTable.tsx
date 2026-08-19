import { Link } from 'react-router-dom';
import PaymentStatus from '../payments/PaymentStatus';
import { formatPrice } from '../../utils/formatters';

export default function TransactionTable({ payments }: { payments:any[] }) {
  return <div className="overflow-x-auto rounded-card border bg-white"><table className="w-full min-w-[720px] text-start"><thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wide text-slate-500"><tr>{['Date','Description','Amount','Status','Invoice'].map((head)=><th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody>{payments.map(item=><tr key={item.id} className="border-t text-xs"><td className="px-4 py-4">{new Date(item.createdAt).toLocaleDateString()}</td><td className="px-4"><strong className="block capitalize">{item.type.replace('_',' ')}</strong><span className="text-[10px] text-slate-400">{item.metadata?.listingTitle||item.metadata?.packageSnapshot?.name||item.reference}</span></td><td className="px-4 font-extrabold">{formatPrice(item.amount,item.currency)}</td><td className="px-4"><PaymentStatus status={item.status}/></td><td className="px-4"><Link to={`/seller/transactions/${item.id}`} className="font-bold text-violet-700">{item.status==='paid'||item.status==='refunded'?'View invoice':'View'}</Link></td></tr>)}</tbody></table></div>;
}
