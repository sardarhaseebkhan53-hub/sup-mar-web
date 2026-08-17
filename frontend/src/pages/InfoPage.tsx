import { BriefcaseBusiness, Building2, Cookie, HeartHandshake, LockKeyhole, Mail, MapPin, Scale, ShieldCheck, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export type InfoPageKind = 'about' | 'contact' | 'safety' | 'terms' | 'privacy';
interface InfoSection { title: string; text: string; icon: LucideIcon; id?: string; }
interface InfoContent { eyebrow: string; title: string; intro: string; sections: InfoSection[]; }

const content: Record<InfoPageKind, InfoContent> = {
  about: { eyebrow: 'About QAVLIO', title: 'Local commerce, made clearer.', intro: 'QAVLIO brings discovery, selling, safe communication, and marketplace support into one thoughtful platform.', sections: [
    { title: 'Our purpose', text: 'Help useful things find their next home and make local marketplace participation easier to understand.', icon: HeartHandshake },
    { title: 'Built for communities', text: 'QAVLIO begins with Pakistan and an API-first foundation designed to grow responsibly across web and mobile.', icon: UsersRound },
    { title: 'Careers', text: 'Future opportunities will span product, engineering, trust, operations, and community support.', icon: BriefcaseBusiness, id: 'careers' },
  ] },
  contact: { eyebrow: 'Contact QAVLIO', title: 'Talk to the right team.', intro: 'Phase 1 provides clear contact entry points. Ticket routing and service-level workflows arrive with the support system.', sections: [
    { title: 'Customer support', text: 'Get help with your account, marketplace guidance, or a report through the Help Center.', icon: HeartHandshake },
    { title: 'General enquiries', text: 'Email hello@qavlio.pk for non-sensitive general enquiries. Never send passwords or payment details.', icon: Mail },
    { title: 'Pakistan foundation', text: 'The initial marketplace experience is designed around communities across Pakistan.', icon: MapPin },
  ] },
  safety: { eyebrow: 'QAVLIO Safety Center', title: 'Trade with confidence.', intro: 'Use clear profile signals, keep communication on-platform, inspect items carefully, and report anything suspicious.', sections: [
    { title: 'Meet thoughtfully', text: 'Choose a public place, tell someone your plan, and avoid carrying unnecessary cash.', icon: UsersRound },
    { title: 'Inspect before paying', text: 'Check the item and relevant documents. Do not rely on urgency, screenshots, or promises alone.', icon: ShieldCheck },
    { title: 'Community guidelines', text: 'Illegal, misleading, abusive, and unsafe listings do not belong on QAVLIO. Report concerns instead of engaging.', icon: Scale, id: 'guidelines' },
  ] },
  terms: { eyebrow: 'Legal', title: 'Terms of use foundation', intro: 'These Phase 1 terms describe the intended structure only and require legal review before production launch.', sections: [
    { title: 'Marketplace role', text: 'QAVLIO provides discovery and communication tools; it does not guarantee an off-platform exchange.', icon: Building2 },
    { title: 'Account responsibility', text: 'Users are responsible for accurate information, secure credentials, and activity performed through their accounts.', icon: LockKeyhole },
    { title: 'Acceptable use', text: 'Listings and communications must follow law, category rules, safety standards, and community guidelines.', icon: Scale },
  ] },
  privacy: { eyebrow: 'Legal', title: 'Privacy by design', intro: 'QAVLIO minimizes personal data, limits location precision, and keeps sensitive provider secrets outside the browser.', sections: [
    { title: 'Data minimization', text: 'Collect only what a marketplace feature needs, explain the purpose, and retain it for an approved period.', icon: ShieldCheck },
    { title: 'Security', text: 'Passwords are hashed, sessions rotate, privileged activity is audited, and exact location is not public by default.', icon: LockKeyhole },
    { title: 'Cookies', text: 'Essential session cookies support secure access. Analytics and marketing consent will be separately controlled before launch.', icon: Cookie, id: 'cookies' },
  ] },
};

interface InfoPageProps { kind: InfoPageKind; }
export default function InfoPage({ kind }: InfoPageProps) {
  const page = content[kind];
  useDocumentTitle(page.title);
  return <div><header className="border-b border-ink-900/10 bg-white py-12 sm:py-16"><div className="container-shell"><p className="eyebrow">{page.eyebrow}</p><h1 className="mt-3 max-w-3xl text-h1 text-ink-950">{page.title}</h1><p className="mt-4 max-w-2xl text-body-lg text-slate-600">{page.intro}</p></div></header><div className="container-shell py-10 sm:py-14"><div className="grid gap-4 md:grid-cols-3">{page.sections.map(({ title, text, icon: Icon, id }) => <section id={id} key={title} className="rounded-card border border-ink-900/10 bg-white p-6 shadow-sm scroll-mt-32"><span className="grid h-11 w-11 place-items-center rounded-card bg-violet-50 text-violet-700"><Icon size={20} /></span><h2 className="mt-4 text-lg font-extrabold text-ink-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></section>)}</div><div className="mt-8 flex flex-col items-start justify-between gap-5 rounded-panel bg-violet-50 p-6 sm:flex-row sm:items-center"><div><h2 className="text-lg font-extrabold text-ink-900">Need another answer?</h2><p className="mt-1 text-sm text-slate-500">Visit the QAVLIO Help Center for guided support topics.</p></div><Button to="/help" variant="secondary">Open Help Center</Button></div></div></div>;
}
