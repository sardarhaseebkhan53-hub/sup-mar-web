import { Bot, ChevronRight, CircleDollarSign, Flag, KeyRound, LifeBuoy, MessageCircle, Search, ShieldCheck, Store } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Seo } from '../seo/Seo';

const topics = [
  { icon: KeyRound, title: 'Account & access', text: 'Login, signup, verification, and profile help' },
  { icon: Store, title: 'Selling on QAVLIO', text: 'Listings, seller tools, and promotion guidance' },
  { icon: CircleDollarSign, title: 'Payments & fees', text: 'Charges, receipts, refunds, and billing' },
  { icon: ShieldCheck, title: 'Trust & safety', text: 'Safe trading, privacy, and fraud prevention' },
  { icon: Flag, title: 'Reports & moderation', text: 'Report users, listings, or suspicious activity' },
  { icon: MessageCircle, title: 'Chat & notifications', text: 'Messages, calls, alerts, and preferences' },
];

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('Select a topic to preview its support entry point.');
  const filteredTopics = useMemo(() => topics.filter((topic) => `${topic.title} ${topic.text}`.toLowerCase().includes(query.toLowerCase())), [query]);
  useDocumentTitle('Help Center');
  return <div><Seo title="Help Center" description="Get help with your QAVLIO account, selling, payments, trust & safety, messages and support requests." canonicalPath="/help" /><section className="bg-ink-950 py-14 text-white sm:py-20"><div className="container-shell text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-600"><LifeBuoy /></span><p className="eyebrow mt-5 !text-gold-300">QAVLIO support</p><h1 className="mt-2 text-h1 text-white">How can we help?</h1><p className="mx-auto mt-3 max-w-xl text-sm text-white/55">Find clear answers, learn how to trade safely, or prepare a support request.</p><label className="relative mx-auto mt-7 block max-w-xl"><span className="sr-only">Search Help Center</span><Search className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 w-full rounded-control bg-white ps-12 pe-4 text-sm text-ink-900 outline-none ring-offset-ink-950 focus:ring-2 focus:ring-violet-400" placeholder="Search help topics" /></label></div></section>
    <section className="container-shell py-12"><p className="mb-5 text-xs font-semibold text-slate-500" aria-live="polite">{selected}</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredTopics.map(({ icon: Icon, title, text }) => <button type="button" onClick={() => setSelected(`${title} guidance will open here when the support knowledge base is connected.`)} key={title} className="group flex items-center gap-4 rounded-2xl border border-ink-900/10 bg-white p-5 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-card"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Icon size={20} /></span><span className="min-w-0 flex-1"><strong className="text-sm">{title}</strong><span className="mt-1 block text-[11px] leading-5 text-slate-500">{text}</span></span><ChevronRight size={17} className="text-slate-300 group-hover:text-violet-600" /></button>)}</div>
      {!filteredTopics.length && <div className="rounded-card border border-dashed border-ink-900/15 bg-white p-8 text-center"><p className="text-sm font-extrabold">No matching help topics</p><button type="button" onClick={() => setQuery('')} className="mt-2 text-xs font-bold text-violet-700">Clear search</button></div>}
      <div className="mt-10 grid gap-5 lg:grid-cols-2"><section className="rounded-3xl bg-violet-700 p-7 text-white"><Bot className="text-gold-300" /><p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-gold-300">QAVLIO Assistant</p><h2 className="mt-2 text-2xl font-extrabold">Ask QAVLIO</h2><p className="mt-3 text-sm leading-6 text-white/65">Search listings, understand fees, and escalate to support. Answers use real QAVLIO data — never invented prices or sellers.</p><Button to="/ai-assistant" className="mt-5 bg-white text-violet-800 hover:bg-gold-300">Open QAVLIO Assistant</Button></section><section className="rounded-3xl border border-ink-900/10 bg-white p-7 shadow-sm"><p className="eyebrow">Still need help?</p><h2 className="mt-2 text-2xl font-extrabold">Talk to our support team</h2><p className="mt-3 text-sm leading-6 text-slate-500">If the assistant cannot resolve it, create a support request from the chat. You can also contact the team directly.</p><Button to="/contact" className="mt-5">Contact support</Button></section></div>
    </section></div>;
}
