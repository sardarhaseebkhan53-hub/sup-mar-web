import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BadgeCheck, MapPin, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import car480 from '../../assets/listings/honda-civic-480.webp';
import car960 from '../../assets/listings/honda-civic-960.webp';
import phone480 from '../../assets/listings/iphone-480.webp';
import phone960 from '../../assets/listings/iphone-960.webp';
import sofa480 from '../../assets/listings/sofa-480.webp';
import sofa960 from '../../assets/listings/sofa-960.webp';
import { Button } from '../ui/Button';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import SearchBar from '../layout/SearchBar';

const trustPoints = [
  { icon: BadgeCheck, label: 'Verified profiles' },
  { icon: ShieldCheck, label: 'Safer conversations' },
  { icon: MapPin, label: 'Local discovery' },
];

export default function Hero() {
  const reduceMotion = useReducedMotion();
  const enter = (delay: number) => reduceMotion ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay } };
  return <section className="container-shell pt-5 sm:pt-7">
    <div className="hero-grid relative overflow-hidden rounded-3xl border border-violet-200/70 bg-white shadow-card">
      <div className="absolute inset-x-0 top-0 h-1 bg-violet-600" />
      <div className="grid min-h-[540px] items-center lg:grid-cols-[1.04fr_.96fr]">
        <div className="relative z-10 px-6 pb-7 pt-10 sm:px-10 lg:px-14 lg:py-14">
          <motion.span {...enter(0)} className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-extrabold text-violet-700"><Sparkles size={14} /> Your world of things, all in one place.</motion.span>
          <motion.h1 {...enter(0.08)} className="mt-6 max-w-xl text-display text-ink-950">Find What <span className="text-violet-600">Matters.</span></motion.h1>
          <motion.p {...enter(0.14)} className="mt-5 max-w-xl text-body-lg font-medium text-slate-600">Discover great products, sell what you no longer need, and connect with people around you.</motion.p>
          <motion.div {...enter(0.2)} className="mt-7 flex flex-col gap-3 sm:flex-row"><Button to="/marketplace" size="lg">Explore Marketplace <ArrowRight size={17} /></Button><Button to="/sell" size="lg" variant="secondary"><Plus size={17} /> Sell Something</Button></motion.div>
          <motion.div {...enter(0.26)} className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink-900/10 pt-5">{trustPoints.map(({ icon: Icon, label }) => <span key={label} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><Icon size={14} className="text-violet-600" />{label}</span>)}</motion.div>
          <div className="mt-6 grid grid-cols-3 gap-2 lg:hidden"><ImageWithFallback src={car960} srcSet={`${car480} 480w, ${car960} 960w`} alt="Car listing preview" loading="eager" wrapperClassName="aspect-[4/3] rounded-card" /><ImageWithFallback src={phone960} srcSet={`${phone480} 480w, ${phone960} 960w`} alt="Smartphone listing preview" loading="eager" wrapperClassName="aspect-[4/3] rounded-card" /><ImageWithFallback src={sofa960} srcSet={`${sofa480} 480w, ${sofa960} 960w`} alt="Sofa listing preview" loading="eager" wrapperClassName="aspect-[4/3] rounded-card" /></div>
        </div>

        <motion.div className="relative hidden min-h-[540px] lg:block" aria-label="A selection of products available across QAVLIO" initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <div className="absolute left-[12%] top-[12%] h-[360px] w-[360px] rounded-full bg-violet-100" />
          <svg className="absolute inset-0 h-full w-full text-violet-300" viewBox="0 0 560 540" fill="none" aria-hidden="true"><path d="M80 392C174 312 173 148 316 116C402 97 448 143 486 205" stroke="currentColor" strokeWidth="2" strokeDasharray="7 10"/><circle cx="80" cy="392" r="5" fill="#F6BC36"/><circle cx="486" cy="205" r="5" fill="#6746D9"/></svg>
          <motion.div className="absolute bottom-[16%] left-[3%] w-[72%] overflow-hidden rounded-panel border-4 border-white bg-white shadow-floating" animate={reduceMotion ? undefined : { y: [0, -7, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}><ImageWithFallback src={car960} srcSet={`${car480} 480w, ${car960} 960w`} alt="Silver car listing preview" loading="eager" sizes="(min-width: 1024px) 40vw, 0px" wrapperClassName="aspect-[16/9]" className="object-cover" /></motion.div>
          <div className="absolute right-[7%] top-[15%] w-40 rotate-2 overflow-hidden rounded-card border-4 border-white bg-white shadow-floating"><ImageWithFallback src={phone960} srcSet={`${phone480} 480w, ${phone960} 960w`} alt="Smartphone listing preview" loading="eager" sizes="160px" wrapperClassName="aspect-[4/5]" className="object-cover" /><span className="block px-3 py-2 text-[10px] font-extrabold text-ink-900">Popular near you</span></div>
          <div className="absolute bottom-[7%] right-[3%] w-44 -rotate-2 overflow-hidden rounded-card border-4 border-white bg-white shadow-floating"><ImageWithFallback src={sofa960} srcSet={`${sofa480} 480w, ${sofa960} 960w`} alt="Modern sofa listing preview" loading="eager" sizes="176px" wrapperClassName="aspect-[4/3]" className="object-cover" /><span className="block px-3 py-2 text-[10px] font-extrabold text-ink-900">Freshly listed</span></div>
          <span className="absolute left-[14%] top-[14%] inline-flex items-center gap-1.5 rounded-full bg-ink-950 px-3 py-2 text-[10px] font-extrabold text-white shadow-lg"><MapPin size={13} className="text-gold-300" /> 2.4 km away</span>
        </motion.div>
      </div>

      <motion.div {...enter(0.3)} className="relative z-20 mx-4 mb-4 lg:-mt-8 lg:mx-10 lg:mb-8"><SearchBar variant="hero" /></motion.div>
    </div>
  </section>;
}
