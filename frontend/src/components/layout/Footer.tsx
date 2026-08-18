import { Facebook, Instagram, Linkedin, Mail, MapPin, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';

const footerLinks = {
  QAVLIO: [['About QAVLIO', '/about'], ['Careers', '/about#careers'], ['Contact', '/contact']],
  Marketplace: [['Browse', '/marketplace'], ['Categories', '/categories'], ['Popular listings', '/marketplace?sort=popular'], ['Sell', '/sell']],
  Support: [['Help Center', '/help'], ['Ask QAVLIO', '/ai-assistant'], ['Safety', '/safety'], ['Contact Support', '/contact']],
  Legal: [['Terms', '/terms'], ['Privacy', '/privacy'], ['Cookies', '/privacy#cookies'], ['Community Guidelines', '/safety#guidelines']],
};

const socialLinks = [
  { label: 'QAVLIO on Facebook', Icon: Facebook }, { label: 'QAVLIO on Instagram', Icon: Instagram }, { label: 'QAVLIO on X', Icon: Twitter }, { label: 'QAVLIO on LinkedIn', Icon: Linkedin },
];

export default function Footer() {
  return <footer className="mt-16 bg-ink-950 pb-24 pt-14 text-white lg:pb-8">
    <div className="container-shell">
      <div className="grid gap-10 border-b border-white/10 pb-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_repeat(4,1fr)]">
        <div><Logo inverse /><p className="mt-5 max-w-xs text-sm leading-6 text-white/60">Your world of things, all in one place. Discover value, sell simply, and connect with confidence.</p><p className="mt-5 flex items-center gap-2 text-xs font-semibold text-white/45"><MapPin size={14} /> Built for communities across Pakistan</p></div>
        {Object.entries(footerLinks).map(([heading, links]) => <div key={heading}><h2 className="text-sm font-extrabold">{heading}</h2><ul className="mt-4 space-y-3">{links.map(([label, to]) => <li key={label}><Link to={to} className="text-xs font-medium text-white/55 transition hover:text-gold-300">{label}</Link></li>)}</ul></div>)}
      </div>
      <div className="flex flex-col gap-5 pt-6 md:flex-row md:items-center md:justify-between"><div><p className="text-xs text-white/45">© 2026 QAVLIO. All rights reserved.</p><a href="mailto:hello@qavlio.pk" className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white"><Mail size={13} /> hello@qavlio.pk</a></div><div id="connect"><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-white/35">Connect</p><div className="flex gap-2">{socialLinks.map(({ label, Icon }) => <a key={label} href="#connect" aria-label={label} className="grid h-9 w-9 place-items-center rounded-control bg-white/10 text-white/70 transition hover:-translate-y-0.5 hover:bg-violet-600 hover:text-white"><Icon size={16} /></a>)}</div></div></div>
    </div>
  </footer>;
}
