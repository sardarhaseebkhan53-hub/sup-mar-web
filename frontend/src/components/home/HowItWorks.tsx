import { Handshake, MessageCircleMore, Search, UserPlus } from 'lucide-react';
import SectionHeading from '../ui/SectionHeading';

const steps = [
  { number: '01', icon: UserPlus, title: 'Create your account', text: 'Set up your profile and preferences.' },
  { number: '02', icon: Search, title: 'Find or list something', text: 'Discover nearby value or create a listing.' },
  { number: '03', icon: MessageCircleMore, title: 'Connect with the other person', text: 'Ask questions and agree on the details.' },
  { number: '04', icon: Handshake, title: 'Make the deal', text: 'Inspect, meet safely, and complete the exchange.' },
];

export default function HowItWorks() {
  return <section className="container-shell pb-12 sm:pb-16"><div className="rounded-3xl bg-ink-950 p-6 text-white sm:p-10"><SectionHeading eyebrow="Simple by design" title="How QAVLIO Works" description="Four clear steps from discovery to a safer local deal." actionLabel={null} inverse />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{steps.map(({ number, icon: Icon, title, text }) => <article key={number} className="relative rounded-card border border-white/10 bg-white/[.055] p-5"><span className="absolute end-4 top-3 text-3xl font-extrabold text-white/[.07]">{number}</span><span className="grid h-10 w-10 place-items-center rounded-card bg-violet-600 text-white"><Icon size={19} /></span><h3 className="mt-4 text-sm font-extrabold text-white">{title}</h3><p className="mt-2 text-xs leading-5 text-white/50">{text}</p></article>)}</div>
  </div></section>;
}
