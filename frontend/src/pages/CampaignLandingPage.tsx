import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Timer, Gift, Eye, MousePointer } from 'lucide-react';
import { campaignApi } from '../services/apiClient';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Seo } from '../seo/Seo';
import CampaignBanner from '../components/growth/CampaignBanner';

export default function CampaignLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const query = useQuery({ queryKey: ['campaign', slug], queryFn: async () => (await campaignApi.bySlug(slug!)).data, enabled: Boolean(slug) });
  const countdownQuery = useQuery({ queryKey: ['campaign-countdown', slug], queryFn: async () => (await campaignApi.countdown(slug!)).data, enabled: Boolean(slug), refetchInterval: 1000 });

  useDocumentTitle(query.data?.campaign?.seo?.title || query.data?.campaign?.name || 'Campaign');

  if (query.isLoading) return <div className="container-shell py-12"><div className="h-80 animate-pulse rounded-panel bg-slate-200"/></div>;
  if (query.isError || !query.data?.campaign) return <div className="container-shell py-12"><p className="rounded-card border bg-white p-10 text-center text-sm font-bold">Campaign not found or not active.</p></div>;

  const { campaign, listings } = query.data;
  const countdown = countdownQuery.data;

  return (
      <>
      <Seo title={campaign.seo?.title || campaign.name} description={campaign.seo?.description || `Discover the ${campaign.name} offers on QAVLIO.`} canonicalPath={`/campaign/${campaign.slug || slug}`} noindex={!campaign.isPublic} />
      <div className="container-shell py-8">
        <CampaignBanner campaign={campaign}/>
        {countdown?.valid && countdown?.countdown && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
            <Timer size={14}/> Ends in {countdown.countdown.days}d {String(countdown.countdown.hours).padStart(2,'0')}h {String(countdown.countdown.minutes).padStart(2,'0')}m {String(countdown.countdown.seconds).padStart(2,'0')}s
          </div>
        )}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <article className="lg:col-span-2 rounded-panel border bg-white p-6">
            <h1 className="text-2xl font-extrabold">{campaign.name}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{campaign.description}</p>
            {campaign.couponId && <div className="mt-4 rounded-xl bg-violet-50 p-4 text-xs"><p className="flex items-center gap-2 font-extrabold text-violet-900"><Gift size={14}/>Offer attached</p><p className="mt-1 text-[11px] text-violet-800">Use coupon at checkout. Validated server-side.</p></div>}
            <div className="mt-6">
              <h2 className="text-sm font-extrabold">Featured Listings</h2>
              {listings?.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{listings.map((l:any)=><a key={l._id} href={`/listing/${l.publicId}/${l.slug||''}`} className="rounded-card border bg-white p-3 hover:shadow-sm"><img src={l.coverImage || 'https://via.placeholder.com/300'} alt={l.title} className="aspect-[4/3] w-full rounded-xl object-cover"/><p className="mt-2 truncate text-xs font-bold">{l.title}</p><p className="text-[11px] text-slate-500">{l.price ? `${l.price} ${l.currency||'PKR'}` : 'Contact for price'}</p></a>)}</div> : <p className="mt-3 text-xs text-slate-500">No specific listings — browse marketplace for eligible items.</p>}
            </div>
          </article>
          <aside className="space-y-4">
            <div className="rounded-panel border bg-white p-5">
              <h3 className="text-sm font-extrabold">Campaign Details</h3>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-bold capitalize">{campaign.status}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Audience</dt><dd className="font-bold capitalize">{campaign.audience.replaceAll('_',' ')}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Start</dt><dd>{new Date(campaign.startAt).toLocaleDateString()}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">End</dt><dd>{new Date(campaign.endAt).toLocaleDateString()}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Views</dt><dd className="flex items-center gap-1"><Eye size={12}/>{campaign.analytics?.views||0}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Clicks</dt><dd className="flex items-center gap-1"><MousePointer size={12}/>{campaign.analytics?.clicks||0}</dd></div>
              </dl>
              <a href="/" className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-control bg-violet-600 text-xs font-extrabold text-white">Browse Marketplace</a>
              <p className="mt-2 text-[10px] text-slate-400">Listings remain subject to marketplace moderation. Banners use Phase 8 ad system placements without intrusion.</p>
            </div>
            <div className="rounded-panel border bg-slate-50 p-4 text-[11px]"><p className="font-bold">Transparency</p><p className="mt-1 text-slate-600">Countdown is visual only. Backend timestamp is authoritative for validity.</p></div>
          </aside>
        </div>
      </div>
      </>
  );
}
