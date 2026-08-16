import React from 'react';
import { ArrowRight, BadgeCheck, CircleDollarSign, MapPin, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import carImage from '../../assets/listings/honda-civic.jpg';
import phoneImage from '../../assets/listings/iphone.jpg';
import sofaImage from '../../assets/listings/sofa.jpg';
import { Button } from '../ui/Button';

const trustPoints = [
  { icon: CircleDollarSign, title: 'Free to browse', body: 'Discover local value' },
  { icon: BadgeCheck, title: 'Trusted sellers', body: 'Verified identities' },
  { icon: ShieldCheck, title: 'Safer deals', body: 'Built-in protection' },
];

export default function Hero() {
  return (
    <section className="container-shell pt-5 sm:pt-7">
      <div className="hero-grid relative overflow-hidden rounded-3xl border border-violet-200/70 bg-white shadow-card">
        <div className="grid min-h-[470px] items-center lg:grid-cols-[1.03fr_.97fr]">
          <div className="relative z-10 px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
            <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-extrabold text-violet-700"><Sparkles size={14} /> Pakistan's community marketplace</span>
            <h1 className="mt-6 max-w-2xl text-[2.55rem] font-extrabold leading-[1.03] text-ink-950 sm:text-5xl lg:text-[3.55rem]">Find <span className="text-violet-600">anything.</span><br />Sell <span className="text-gold-500">everything.</span></h1>
            <p className="mt-5 max-w-lg text-sm font-medium leading-6 text-slate-600 sm:text-base sm:leading-7">From everyday essentials to once-in-a-lifetime finds—buy and sell with confidence in your city.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button to="/browse" size="lg">Browse categories <ArrowRight size={17} /></Button><Button to="/sell" size="lg" variant="secondary"><Plus size={17} /> Sell your item</Button></div>
            <div className="mt-9 grid max-w-xl grid-cols-3 gap-3 border-t border-ink-900/10 pt-6">
              {trustPoints.map(({ icon: Icon, title, body }) => <div key={title} className="flex items-start gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700"><Icon size={16} /></span><span><strong className="block text-[10px] font-extrabold text-ink-900 sm:text-xs">{title}</strong><small className="hidden text-[9px] font-semibold text-slate-400 sm:block">{body}</small></span></div>)}
            </div>
          </div>

          <div className="relative hidden h-full min-h-[470px] lg:block" aria-hidden="true">
            <div className="absolute left-[8%] top-[11%] h-[350px] w-[350px] rounded-full bg-gradient-to-br from-violet-500 to-violet-800 shadow-float" />
            <div className="absolute left-[22%] top-[23%] h-[270px] w-[270px] rounded-full border border-dashed border-white/50" />
            <div className="hero-orbit absolute bottom-[16%] left-[2%] w-[72%] overflow-hidden rounded-2xl border-4 border-white bg-white shadow-float"><img src={carImage} alt="" className="aspect-[16/9] w-full object-cover" /></div>
            <div className="absolute right-[8%] top-[17%] w-36 rotate-3 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-float"><img src={phoneImage} alt="" className="aspect-[4/5] w-full object-cover" /></div>
            <div className="absolute bottom-[8%] right-[4%] w-40 -rotate-2 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-float"><img src={sofaImage} alt="" className="aspect-[4/3] w-full object-cover" /></div>
            <span className="absolute right-[38%] top-[10%] grid h-12 w-12 place-items-center rounded-2xl bg-gold-300 text-ink-950 shadow-lg"><MapPin /></span>
          </div>
        </div>
      </div>
    </section>
  );
}
