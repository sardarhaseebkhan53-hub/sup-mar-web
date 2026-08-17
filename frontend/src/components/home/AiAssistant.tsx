import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bot, CircleDollarSign, ListPlus, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

const actions = [
  { label: 'Find an item', icon: Search }, { label: 'Create a listing', icon: ListPlus }, { label: 'Payment help', icon: CircleDollarSign }, { label: 'Safety advice', icon: ShieldCheck },
];

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('Choose a topic to preview the assistant entry point.');
  const reduceMotion = useReducedMotion();
  return <>
    <AnimatePresence>{open && <motion.aside className="fixed bottom-40 right-4 z-[60] w-[min(calc(100vw-2rem),340px)] overflow-hidden rounded-panel border border-ink-900/10 bg-white shadow-floating lg:bottom-20 lg:right-6" aria-label="QAVLIO AI preview" initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center gap-3 bg-ink-950 p-4 text-white"><span className="grid h-10 w-10 place-items-center rounded-card bg-violet-600"><Bot size={20} /></span><div className="min-w-0 flex-1"><p className="text-sm font-extrabold">QAVLIO AI</p><p className="text-[10px] text-white/50">Interface preview · AI is not connected</p></div><button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-control text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close QAVLIO AI"><X size={18} /></button></div>
      <div className="p-4"><h2 className="text-base font-extrabold text-ink-900">How can I help?</h2><p className="mt-1 text-xs leading-5 text-slate-500">{notice}</p><div className="mt-4 grid grid-cols-2 gap-2">{actions.map(({ label, icon: Icon }) => <button key={label} type="button" onClick={() => setNotice(`${label} guidance will be connected to QAVLIO AI in Phase 10.`)} className="flex min-h-20 flex-col items-start justify-between rounded-card border border-ink-900/10 bg-slate-50 p-3 text-left text-[11px] font-extrabold text-ink-800 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"><Icon size={17} />{label}</button>)}</div><p className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400"><ShieldCheck size={13} /> Sensitive actions will always require secure authorization.</p></div>
    </motion.aside>}</AnimatePresence>
    <motion.button type="button" onClick={() => setOpen((value) => !value)} className="fixed bottom-24 right-4 z-[60] inline-flex h-12 items-center gap-2 rounded-full bg-violet-600 px-4 text-xs font-extrabold text-white shadow-floating ring-4 ring-white transition hover:bg-violet-700 lg:bottom-6 lg:right-6" aria-label={open ? 'Close QAVLIO AI' : 'Open QAVLIO AI'} aria-expanded={open} whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>{open ? <X size={18} /> : <><span className="relative"><Bot size={19} /><Sparkles size={10} className="absolute -right-2 -top-1 text-gold-300" /></span><span>QAVLIO AI</span></>}</motion.button>
  </>;
}
