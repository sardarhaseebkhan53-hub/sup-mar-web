import { useMutation, useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CreditBalance from '../../components/monetization/CreditBalance';
import ListingQuota from '../../components/monetization/ListingQuota';
import PackageCard from '../../components/monetization/PackageCard';
import DashboardLayout from '../../layouts/DashboardLayout';
import { monetizationApi } from '../../services/apiClient';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function SellerPackagesPage() {
  useDocumentTitle('Seller packages'); const navigate=useNavigate();
  const packages=useQuery({queryKey:['seller-packages'],queryFn:async()=>(await monetizationApi.packages()).data});
  const overview=useQuery({queryKey:['monetization-overview'],queryFn:async()=>(await monetizationApi.overview()).data});
  const purchase=useMutation({mutationFn:(id:string)=>monetizationApi.purchasePackage(id,crypto.randomUUID()),onSuccess:(response)=>navigate(`/checkout?payment=${response.data.payment.id}`)});
  return <DashboardLayout role="seller"><header><p className="eyebrow">Seller credits</p><h1 className="mt-2 text-3xl font-extrabold">Packages built for how you sell</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Buy listing and promotion credits at prices verified by QAVLIO’s server. Credits are marketplace services, not withdrawable cash.</p></header>
    <div className="mt-6 grid gap-4 md:grid-cols-2"><ListingQuota quota={overview.data?.quota}/><CreditBalance wallet={overview.data?.wallet}/></div>
    {packages.isLoading?<div className="mt-7 h-96 animate-pulse rounded-panel bg-slate-200"/>:<div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{packages.data?.map((item:any,index:number)=><PackageCard key={item.id} item={item} featured={index===1} busy={purchase.isPending&&purchase.variables===item.id} onPurchase={()=>purchase.mutate(item.id)}/>)}</div>}
    {purchase.error&&<p role="alert" className="mt-4 rounded-card bg-red-50 p-4 text-xs font-bold text-red-700">{purchase.error.message}</p>}
    <p className="mt-6 flex items-center gap-2 text-[10px] text-slate-500"><ShieldCheck size={14}/>All package contents, prices and credit awards are verified on the backend.</p>
  </DashboardLayout>;
}
