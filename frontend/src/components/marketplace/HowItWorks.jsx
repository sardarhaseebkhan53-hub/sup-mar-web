import React from 'react';
import { MessageCircleMore, Search, Tag } from 'lucide-react';

const steps = [
  { number: '01', icon: Search, title: 'Discover nearby', text: 'Search by category, location, and what matters to you.' },
  { number: '02', icon: MessageCircleMore, title: 'Connect safely', text: 'Chat with sellers, ask questions, and agree on the details.' },
  { number: '03', icon: Tag, title: 'Make a great deal', text: 'Meet safely, inspect your item, and complete the exchange.' },
];

export default function HowItWorks() {
  return <section className="container-shell py-14"><div className="overflow-hidden rounded-3xl bg-ink-950 p-7 text-white sm:p-10"><div className="grid gap-8 lg:grid-cols-[.8fr_2.2fr] lg:items-center"><div><p className="eyebrow !text-gold-300">Simple by design</p><h2 className="mt-3 text-3xl font-extrabold">A better deal in three steps.</h2><p className="mt-3 text-sm leading-6 text-white/55">DealHub makes local buying and selling clear, fast, and human.</p></div><div className="grid gap-3 sm:grid-cols-3">{steps.map(({ number, icon: Icon, title, text }) => <article key={number} className="relative rounded-2xl border border-white/10 bg-white/[.06] p-5"><span className="absolute right-4 top-3 text-3xl font-extrabold text-white/[.06]">{number}</span><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white"><Icon size={19} /></span><h3 className="mt-4 text-sm font-extrabold">{title}</h3><p className="mt-2 text-xs leading-5 text-white/50">{text}</p></article>)}</div></div></div></section>;
}
