import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import CampaignStatusBadge from '../../components/growth/CampaignStatusBadge';
import CampaignCard from '../../components/growth/CampaignCard';
import { adminCampaignApi } from '../../services/apiClient';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export default function AdminCampaignsPage() {
  useDocumentTitle('Campaigns - QAVLIO');
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ name: '', description: '', startAt: new Date().toISOString().slice(0,16), endAt: new Date(Date.now()+7*86400000).toISOString().slice(0,16), audience: 'all' as any, status: 'draft' as any, slug: '', bannerImage: '' });

  const query = useQuery({ queryKey: ['admin-campaigns', status], queryFn: async () => (await adminCampaignApi.list(status ? `?status=${status}` : '')).data });

  const create = useMutation({
    mutationFn: () => adminCampaignApi.create({ ...form, startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString(), seo: { slug: form.slug || undefined, title: form.name }, banner: { imageUrl: form.bannerImage } }),
    onSuccess: () => { setOpen(false); void client.invalidateQueries({ queryKey: ['admin-campaigns'] }); setForm({ name: '', description: '', startAt: new Date().toISOString().slice(0,16), endAt: new Date(Date.now()+7*86400000).toISOString().slice(0,16), audience: 'all', status: 'draft', slug: '', bannerImage: '' }); },
  });

  const sync = useMutation({ mutationFn: () => adminCampaignApi.sync(), onSuccess: () => void client.invalidateQueries({ queryKey: ['admin-campaigns'] }) });

  const updateStatus = async (id:string, newStatus:string) => {
    await adminCampaignApi.update(id, { status: newStatus });
    void client.invalidateQueries({ queryKey: ['admin-campaigns'] });
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <header>
          <p className="eyebrow">Growth engine</p>
          <h1 className="mt-2 text-3xl font-extrabold">Campaigns</h1>
          <p className="mt-2 text-sm text-slate-500">Platform campaigns: name, banner, dates, audience, coupon, target categories/listings, status.</p>
        </header>
        <div className="flex gap-2">
          <select value={status} onChange={e=>setStatus(e.target.value)} className="h-11 rounded-control border bg-white px-3 text-xs"><option value="">All statuses</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="archived">Archived</option></select>
          <Button variant="secondary" onClick={()=>sync.mutate()} loading={sync.isPending}>Sync Expiry</Button>
          <Button onClick={()=>setOpen(true)}><Plus size={14}/>New Campaign</Button>
        </div>
      </div>

      {query.isLoading ? <div className="mt-6 h-60 animate-pulse rounded-panel bg-slate-200"/> : (
        <div className="mt-6 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(query.data?.campaigns || []).map((c:any)=><CampaignCard key={c._id} campaign={c}/>)}</div>
          <div className="overflow-hidden rounded-panel border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Audience</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Views</th><th className="px-4 py-3">Actions</th></tr></thead>
                <tbody className="divide-y">
                  {(query.data?.campaigns || []).map((c:any)=><tr key={c._id} className="hover:bg-slate-50/50"><td className="px-4 py-3 font-bold">{c.name}</td><td className="px-4 py-3 font-mono">{c.seo?.slug}</td><td className="px-4 py-3 capitalize">{c.audience.replaceAll('_',' ')}</td><td className="px-4 py-3"><CampaignStatusBadge status={c.status}/></td><td className="px-4 py-3">{c.analytics?.views||0}</td><td className="px-4 py-3 flex gap-2"><button onClick={()=>updateStatus(c._id, c.status==='active'?'paused':'active')} className="font-bold text-violet-600">{c.status==='active'?'Pause':'Activate'}</button><a href={`/campaign/${c.seo?.slug}`} target="_blank" className="font-bold text-slate-600 inline-flex items-center gap-1"><Eye size={12}/>View</a></td></tr>)}
                </tbody>
              </table>
            </div>
            {!query.data?.campaigns?.length && <p className="p-10 text-center text-xs text-slate-500">No campaigns.</p>}
          </div>
        </div>
      )}

      <Modal open={open} title="Create Campaign" description="SEO title, slug, OG image are validated. Only active campaigns are public." onClose={()=>setOpen(false)}>
        <div className="grid gap-3">
          <label className="text-xs font-bold">Name<input value={form.name} onChange={e=>setForm(f=>({...f, name: e.target.value}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
          <label className="text-xs font-bold">Slug (SEO)<input value={form.slug} onChange={e=>setForm(f=>({...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-')}))} placeholder="summer-electronics-sale" className="mt-1 h-11 w-full rounded-control border bg-white px-3 font-mono text-sm"/></label>
          <label className="text-xs font-bold">Description<textarea value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))} className="mt-1 min-h-20 w-full rounded-control border bg-white px-3 py-2 text-sm"/></label>
          <label className="text-xs font-bold">Banner Image URL<input value={form.bannerImage} onChange={e=>setForm(f=>({...f, bannerImage: e.target.value}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">Start<input type="datetime-local" value={form.startAt} onChange={e=>setForm(f=>({...f, startAt: e.target.value}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
            <label className="text-xs font-bold">End<input type="datetime-local" value={form.endAt} onChange={e=>setForm(f=>({...f, endAt: e.target.value}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"/></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">Audience<select value={form.audience} onChange={e=>setForm(f=>({...f, audience: e.target.value as any}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"><option value="all">All users</option><option value="new_users">New users</option><option value="returning_users">Returning users</option><option value="sellers">Sellers</option><option value="category_interested">Category-interested</option><option value="wishlist">Wishlist</option><option value="saved_search">Saved search</option></select></label>
            <label className="text-xs font-bold">Status<select value={form.status} onChange={e=>setForm(f=>({...f, status: e.target.value as any}))} className="mt-1 h-11 w-full rounded-control border bg-white px-3 text-sm"><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="active">Active</option><option value="paused">Paused</option></select></label>
          </div>
          <Button onClick={()=>create.mutate()} loading={create.isPending} disabled={!form.name || !form.startAt || !form.endAt}>Create Campaign</Button>
          {create.isError && <p className="text-xs font-bold text-red-600">{(create.error as any)?.message}</p>}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
