import { BadgeCheck, Flag, MessageCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionHeading from '../ui/SectionHeading';

const trustItems = [
  { icon: BadgeCheck, title: 'Verified Profiles', text: 'Know which identity checks a profile has completed.' },
  { icon: MessageCircle, title: 'Secure Communication', text: 'Keep conversations inside QAVLIO when messaging launches.' },
  { icon: Flag, title: 'Report Anything Suspicious', text: 'Clear reporting paths help the community respond to risk.' },
  { icon: ShieldCheck, title: 'Marketplace Guidance', text: 'Get practical safety tips before completing a deal.' },
];

export default function TrustSafety() {
  return <section className="container-shell pb-12 sm:pb-16"><SectionHeading eyebrow="Trust is designed in" title="Trade with confidence" description="Clear signals, secure communication foundations, and practical guidance help people make informed decisions." actionLabel="Visit Safety Center" actionTo="/safety" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{trustItems.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-card border border-ink-900/10 bg-white p-5 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-card bg-emerald-50 text-emerald-700"><Icon size={20} /></span><h3 className="mt-4 text-sm font-extrabold text-ink-900">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></article>)}</div>
    <p className="mt-5 text-xs text-slate-500">Verification describes a completed check; it does not guarantee an item or transaction. <Link to="/safety" className="font-extrabold text-violet-700">Read the safety guidance.</Link></p>
  </section>;
}
