import { useQuery } from '@tanstack/react-query';
import { CreditCard, LockKeyhole, MapPin, ShieldCheck, Siren } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { trustApi } from '../services/apiClient';

export default function SafetyCenterPage() {
  const { slug } = useParams<{ slug?: string }>();
  const overview = useQuery({ queryKey: ['safety'], queryFn: async () => (await trustApi.safety()).data });
  const page = useQuery({ queryKey: ['safety', slug || 'overview'], queryFn: async () => (await trustApi.safetyPage(slug || 'overview')).data });
  const data = page.data || overview.data?.overview;
  useDocumentTitle(data?.title || 'Safety Center');
  return <div>
    <header className="border-b border-ink-900/10 bg-white py-12 sm:py-16">
      <div className="container-shell">
        <p className="eyebrow">{data?.eyebrow || 'QAVLIO Safety Center'}</p>
        <h1 className="mt-3 max-w-3xl text-h1 text-ink-950">{data?.title || 'Trade with confidence.'}</h1>
        <p className="mt-4 max-w-2xl text-body-lg text-slate-600">{data?.intro}</p>
      </div>
    </header>
    <div className="container-shell py-10 sm:py-14">
      <nav className="hide-scrollbar mb-8 flex gap-2 overflow-x-auto" aria-label="Safety topics">
        <Link to="/safety" className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold ${!slug ? 'bg-ink-950 text-white' : 'border bg-white'}`}>Overview</Link>
        {(overview.data?.pages || []).map((item: any) => <Link key={item.slug} to={`/safety/${item.slug}`} className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold ${slug === item.slug ? 'bg-ink-950 text-white' : 'border bg-white'}`}>{item.title}</Link>)}
      </nav>
      <div className="grid gap-4 md:grid-cols-3">
        {(data?.sections || []).map((section: any) => { const Icon=section.slug==='account'?LockKeyhole:section.slug==='payments'?CreditCard:section.slug==='reporting'||section.slug==='scams'?Siren:section.slug==='meetings'?MapPin:ShieldCheck;return <section key={section.title} id={section.slug} className="rounded-card border border-ink-900/10 bg-white p-6 shadow-sm">
          <span className="grid h-11 w-11 place-items-center rounded-card bg-violet-50 text-violet-700"><Icon size={20} /></span>
          <h2 className="mt-4 text-lg font-extrabold">{section.slug ? <Link to={`/safety/${section.slug}`}>{section.title}</Link> : section.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{section.text}</p>
        </section>})}
      </div>
      <aside className="mt-8 rounded-panel bg-violet-50 p-6">
        <h2 className="text-lg font-extrabold">Need to report something?</h2>
        <p className="mt-1 text-sm text-slate-600">Use Report on a listing, seller, review, or conversation. Never send passwords or OTPs.</p>
      </aside>
    </div>
  </div>;
}
