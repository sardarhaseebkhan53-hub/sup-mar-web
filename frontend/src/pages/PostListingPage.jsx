import { ArrowLeft, ArrowRight, Camera, Check, ImagePlus, Info, MapPin, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import CategoryIcon from '../components/ui/CategoryIcon';
import { useCategories } from '../hooks/useCategories';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const steps = ['Category', 'Details', 'Photos', 'Location', 'Review'];

export default function PostListingPage() {
  const categories = useCategories();
  const [selectedCategory, setSelectedCategory] = useState('cat-cars');
  useDocumentTitle('Post a listing');
  return (
    <div className="container-shell py-7 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-violet-700"><ArrowLeft size={15} /> Back to marketplace</Link>
        <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">Sell on QAVLIO</p><h1 className="mt-1 text-3xl font-extrabold">Create a great listing</h1><p className="mt-2 text-sm text-slate-500">Clear details and quality photos help your item sell faster.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700">Draft saved</span></div>
        <ol className="hide-scrollbar mt-8 flex gap-2 overflow-x-auto" aria-label="Listing progress">{steps.map((step, index) => <li key={step} className={`flex min-w-[120px] flex-1 items-center gap-2 rounded-xl border p-3 ${index === 0 ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-slate-200 bg-white text-slate-400'}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-extrabold ${index === 0 ? 'bg-violet-600 text-white' : 'bg-slate-100'}`}>{index === 0 ? <Check size={13} /> : index + 1}</span><span className="text-[11px] font-extrabold">{step}</span></li>)}</ol>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_280px]">
          <form className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm sm:p-7" onSubmit={(event) => event.preventDefault()}>
            <h2 className="text-lg font-extrabold">What are you selling?</h2><p className="mt-1 text-xs text-slate-500">Choose the most relevant category for better discovery.</p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">{categories.slice(0,9).map((category) => <button type="button" key={category.id} onClick={() => setSelectedCategory(category.id)} className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${selectedCategory === category.id ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/10' : 'border-slate-200 hover:border-violet-200'}`}><CategoryIcon name={category.icon} accent={category.accent} size={18} className="h-9 w-9 shrink-0 rounded-lg" /><span className="min-w-0 truncate text-[11px] font-extrabold">{category.shortName || category.name}</span></button>)}</div>
            <div className="my-7 h-px bg-slate-100" />
            <div className="grid gap-5"><label className="text-xs font-extrabold">Listing title <span className="font-medium text-red-500">*</span><input className="input-base mt-2" placeholder="e.g. Honda Civic Oriel 2021 in excellent condition" maxLength="70" /><span className="mt-1.5 block text-right text-[9px] font-semibold text-slate-400">0 / 70</span></label><label className="text-xs font-extrabold">Description <span className="font-medium text-red-500">*</span><textarea className="input-base mt-2 min-h-32 resize-y py-3" placeholder="Describe condition, features, reason for selling, and anything a buyer should know." /><span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700"><Sparkles size={12} /> AI writing help will be available in a future phase.</span></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-extrabold">Price<input className="input-base mt-2" inputMode="numeric" placeholder="Enter amount" /></label><label className="text-xs font-extrabold">Condition<select className="input-base mt-2"><option>Select condition</option><option>New</option><option>Used</option><option>Open box</option></select></label></div></div>
            <div className="mt-7 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><Button variant="ghost">Save draft</Button><Button>Continue to photos <ArrowRight size={16} /></Button></div>
          </form>

          <aside className="space-y-4"><section className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700"><ImagePlus size={18} /></span><h3 className="mt-4 text-sm font-extrabold">Photo checklist</h3><ul className="mt-3 space-y-2 text-[11px] font-semibold leading-5 text-violet-900/65"><li>• Use bright, recent photos</li><li>• Show all sides and details</li><li>• Avoid screenshots or watermarks</li></ul></section><section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="flex items-center gap-2 text-xs font-extrabold text-amber-900"><Info size={16} /> Pricing is configurable</p><p className="mt-2 text-[11px] leading-5 text-amber-800/70">Free limits, category fees, durations, and promotions will be loaded from admin-managed platform settings.</p></section><div className="grid grid-cols-2 gap-2">{[{ icon: Camera, label: 'Up to 12 photos' }, { icon: MapPin, label: 'Local discovery' }].map(({icon: Icon,label}) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 text-center"><Icon size={17} className="mx-auto text-slate-400" /><span className="mt-2 block text-[9px] font-bold text-slate-500">{label}</span></div>)}</div></aside>
        </div>
      </div>
    </div>
  );
}
