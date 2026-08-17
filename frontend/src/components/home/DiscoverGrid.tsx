import { Clock3, Flame, MapPin, Percent, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionHeading from '../ui/SectionHeading';

const discoveryItems = [
  { title: 'Near you', text: 'Fresh finds around Rawalpindi', icon: MapPin, tone: 'bg-violet-100 text-violet-700', to: '/marketplace?discover=nearby' },
  { title: 'New today', text: 'Just listed across QAVLIO', icon: Clock3, tone: 'bg-blue-100 text-blue-700', to: '/marketplace?discover=new' },
  { title: 'Popular', text: 'What people are viewing now', icon: Flame, tone: 'bg-orange-100 text-orange-700', to: '/marketplace?discover=popular' },
  { title: 'Price drops', text: 'Recently reduced listings', icon: Percent, tone: 'bg-emerald-100 text-emerald-700', to: '/marketplace?discover=price-drop' },
  { title: 'Trending', text: 'Fast-moving categories and finds', icon: TrendingUp, tone: 'bg-rose-100 text-rose-700', to: '/marketplace?discover=trending' },
  { title: 'Recommended', text: 'A preview of future personalization', icon: Sparkles, tone: 'bg-gold-100 text-gold-600', to: '/marketplace?discover=recommended' },
];

export default function DiscoverGrid() {
  return <section className="container-shell pb-12 sm:pb-16"><SectionHeading eyebrow="Discover differently" title="Explore What’s Around You" description="Jump into useful discovery views. Personal recommendations will use real marketplace signals in a later phase." actionLabel={null} />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{discoveryItems.map(({ title, text, icon: Icon, tone, to }) => <Link key={title} to={to} className="group flex items-center gap-4 rounded-card border border-ink-900/10 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-card"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-card ${tone}`}><Icon size={20} /></span><span className="min-w-0"><strong className="text-sm font-extrabold text-ink-900 group-hover:text-violet-700">{title}</strong><span className="mt-1 block text-xs text-slate-500">{text}</span></span></Link>)}</div>
  </section>;
}
