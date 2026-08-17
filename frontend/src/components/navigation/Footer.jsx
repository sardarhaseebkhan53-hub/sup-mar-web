import React from 'react';
import { Facebook, Instagram, Linkedin, Mail, MapPin, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';

const footerLinks = {
  Marketplace: [['Browse listings', '/browse'], ['Popular categories', '/browse'], ['Sell an item', '/sell'], ['Featured deals', '/browse?featured=true']],
  'QAVLIO for you': [['Customer dashboard', '/dashboard'], ['Seller centre', '/seller'], ['Safety centre', '/help'], ['Help & support', '/help']],
  Company: [['About QAVLIO', '/help'], ['Careers', '/help'], ['Terms of use', '/help'], ['Privacy policy', '/help']],
};

export default function Footer() {
  return (
    <footer className="mt-16 bg-ink-950 pb-24 pt-14 text-white lg:pb-8">
      <div className="container-shell">
        <div className="grid gap-10 border-b border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-[1.35fr_repeat(3,1fr)]">
          <div><Logo inverse /><p className="mt-5 max-w-sm text-sm leading-6 text-white/60">Pakistan's trusted community marketplace for finding great value, meeting verified sellers, and turning unused items into opportunities.</p><div className="mt-5 flex gap-2">{[Facebook, Instagram, Twitter, Linkedin].map((Icon, index) => <a key={index} href="#social" aria-label="QAVLIO social media" className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white/70 hover:bg-violet-600 hover:text-white"><Icon size={16} /></a>)}</div></div>
          {Object.entries(footerLinks).map(([heading, links]) => <div key={heading}><h2 className="text-sm font-extrabold">{heading}</h2><ul className="mt-4 space-y-3">{links.map(([label, to]) => <li key={label}><Link to={to} className="text-xs font-medium text-white/55 hover:text-gold-300">{label}</Link></li>)}</ul></div>)}
        </div>
        <div className="flex flex-col gap-3 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 QAVLIO. All rights reserved.</p><div className="flex flex-wrap gap-4"><span className="inline-flex items-center gap-1.5"><MapPin size={13} /> Rawalpindi, Pakistan</span><a href="mailto:hello@qavlio.pk" className="inline-flex items-center gap-1.5 hover:text-white"><Mail size={13} /> hello@qavlio.pk</a></div></div>
      </div>
    </footer>
  );
}
