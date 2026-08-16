import React from 'react';
import { BellRing, Heart, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function SavedPage() {
  useDocumentTitle('Saved listings');
  return <div className="container-shell py-12"><div className="mx-auto max-w-3xl text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-600"><Heart /></span><p className="eyebrow mt-5">Private to your account</p><h1 className="mt-2 text-3xl font-extrabold">Saved listings</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">Your account and protected route are ready. Favorite persistence will connect to the listing system in the marketplace phase.</p><div className="mt-8 grid gap-4 text-left sm:grid-cols-2"><article className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm"><Search className="text-violet-600" /><h2 className="mt-4 text-sm font-extrabold">No saved listings yet</h2><p className="mt-2 text-xs leading-5 text-slate-500">Browse public inventory, then use the heart action. Authentication returns you to the exact listing you were viewing.</p><Button to="/browse" className="mt-5">Browse listings</Button></article><article className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm"><BellRing className="text-gold-500" /><h2 className="mt-4 text-sm font-extrabold">Saved search alerts</h2><p className="mt-2 text-xs leading-5 text-slate-500">Query storage and notification delivery are planned with search and discovery. No activity is fabricated here.</p><Button to="/dashboard/saved-searches" variant="secondary" className="mt-5">View foundation</Button></article></div></div></div>;
}
