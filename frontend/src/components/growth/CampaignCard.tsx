import { Eye, MousePointer, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import CampaignStatusBadge from './CampaignStatusBadge';

export default function CampaignCard({ campaign }: { campaign: any }) {
  const slug = campaign.seo?.slug || campaign.slug || campaign._id;
  return (
    <Link to={`/campaign/${slug}`} className="group block overflow-hidden rounded-card border bg-white transition hover:-translate-y-0.5 hover:shadow-card">
      {campaign.banner?.imageUrl ? <div className="aspect-[16/7] overflow-hidden bg-slate-100"><img src={campaign.banner.imageUrl} alt={campaign.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"/></div> : <div className="h-24 bg-gradient-to-r from-violet-100 to-indigo-100"/>}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-sm font-extrabold">{campaign.name}</h3>
          <CampaignStatusBadge status={campaign.status}/>
        </div>
        <p className="mt-2 line-clamp-2 text-xs text-slate-500">{campaign.description}</p>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><Eye size={12}/>{campaign.analytics?.views || 0} views</span>
          <span className="inline-flex items-center gap-1"><MousePointer size={12}/>{campaign.analytics?.clicks || 0} clicks</span>
          <span className="inline-flex items-center gap-1"><TrendingUp size={12}/>{campaign.analytics?.conversions || 0} conv</span>
        </div>
      </div>
    </Link>
  );
}
