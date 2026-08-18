import { useEffect, useState } from 'react';
import { ArrowRight, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CampaignBanner({ campaign }: { campaign: any }) {
  const banner = campaign.banner || {};
  const slug = campaign.seo?.slug || campaign.slug;
  return (
    <div className="relative overflow-hidden rounded-panel border bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 p-6 text-white">
      {banner.imageUrl && <img src={banner.imageUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20" />}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">Campaign</p>
          <h3 className="mt-1 text-xl font-extrabold">{campaign.name}</h3>
          <p className="mt-2 max-w-xl text-sm text-white/90 line-clamp-2">{campaign.description}</p>
          {campaign.endAt && <Countdown endAt={campaign.endAt}/>}
        </div>
        <Link to={`/campaign/${slug}`} className="inline-flex h-11 items-center gap-2 rounded-control bg-white px-5 text-xs font-extrabold text-violet-700 hover:bg-slate-50">Explore <ArrowRight size={14}/></Link>
      </div>
    </div>
  );
}

function Countdown({ endAt }: { endAt: string }) {
  const [remaining, setRemaining] = useState<number>(() => Math.max(0, new Date(endAt).getTime() - Date.now()));
  useEffect(()=>{
    const id = setInterval(()=> setRemaining(Math.max(0, new Date(endAt).getTime() - Date.now())), 1000);
    return ()=>clearInterval(id);
  }, [endAt]);
  if (remaining <= 0) return <p className="mt-2 text-xs font-bold text-amber-200">Ended</p>;
  const days = Math.floor(remaining / (1000*60*60*24));
  const hours = Math.floor((remaining % (1000*60*60*24)) / (1000*60*60));
  const minutes = Math.floor((remaining % (1000*60*60)) / (1000*60));
  const seconds = Math.floor((remaining % (1000*60)) / 1000);
  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
      <Timer size={14}/> Offer ends in {days > 0 ? `${days}d ` : ''}{String(hours).padStart(2,'0')}h {String(minutes).padStart(2,'0')}m {String(seconds).padStart(2,'0')}s
    </div>
  );
}
