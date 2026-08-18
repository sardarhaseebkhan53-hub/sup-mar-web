import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import AIMessage from './AIMessage';
import CompareListings from './CompareListings';
import { useAiAssistant } from '../../ai/AiAssistantProvider';

const starters = [
  'Find a used iPhone under Rs. 150,000',
  'Show cars under Rs. 3 million',
  'Gaming laptop for university under 200k',
  'Help me sell my phone',
  'How do I promote my listing?',
  'Why is my payment pending?',
  'Find furniture near me',
];

export default function AiAssistantPanel({ variant = 'dock' }: { variant?: 'dock' | 'page' }) {
  const { open, close, messages, pending, send } = useAiAssistant();
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isPage = variant === 'page';
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }, [messages, pending, reduceMotion]);
  useEffect(() => { if (open || isPage) inputRef.current?.focus(); }, [open, isPage]);

  if (!isPage && !open) return <CompareListings />;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const next = value.trim();
    if (!next) return;
    setValue('');
    void send(next);
  };

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); }
  };

  const body = <div className={`flex min-h-0 flex-1 flex-col ${isPage ? '' : 'h-[min(72vh,640px)]'}`}>
    <header className="flex items-center gap-3 bg-ink-950 px-4 py-3 text-white">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-gold-300 text-ink-950" aria-hidden="true"><Sparkles size={18} /></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-extrabold">How can I help?</h2>
        <p className="text-[10px] text-white/55">QAVLIO AI · grounded in live marketplace data · never invents listings</p>
      </div>
      {!isPage && <button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-control text-white/70 hover:bg-white/10" aria-label="Close QAVLIO Assistant"><X size={18} aria-hidden="true" /></button>}
    </header>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" role="log" aria-live="polite" aria-relevant="additions">
      {messages.map((item) => <AIMessage key={item.id} role={item.role} text={item.text} reply={item.reply} onSuggestion={(message) => void send(message)} />)}
      {pending && <p className="inline-flex items-center gap-2 rounded-card bg-white px-3 py-2 text-xs font-bold text-violet-700 shadow-sm"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-300 border-t-violet-700 motion-reduce:animate-none" aria-hidden="true" /> QAVLIO is thinking…</p>}
      {messages.length < 3 && <div className="flex flex-wrap gap-2" aria-label="Suggested questions">{starters.map((prompt) => <button key={prompt} type="button" onClick={() => void send(prompt)} className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-left text-[11px] font-bold text-violet-800 hover:bg-violet-50">{prompt}</button>)}</div>}
      <div ref={endRef} />
    </div>
    <form onSubmit={submit} className="border-t bg-white p-3">
      <label className="sr-only" htmlFor={isPage ? 'qavlio-ai-page-input' : 'qavlio-ai-dock-input'}>Ask QAVLIO</label>
      <div className="flex items-end gap-2 rounded-card border border-ink-900/10 bg-slate-50 p-2 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
        <textarea id={isPage ? 'qavlio-ai-page-input' : 'qavlio-ai-dock-input'} ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={onKey} rows={1} maxLength={2000} placeholder="Describe what you need — I'll search live QAVLIO listings…" className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-semibold outline-none" />
        <button type="submit" disabled={pending || !value.trim()} className="grid h-10 w-10 place-items-center rounded-control bg-violet-600 text-white disabled:bg-slate-300" aria-label="Send message"><ArrowUp size={16} aria-hidden="true" /></button>
      </div>
    </form>
  </div>;

  if (isPage) return <>
    <section className="overflow-hidden rounded-panel border border-ink-900/10 bg-white shadow-card">{body}</section>
  </>;

  return <>
    <AnimatePresence>
      {open && <motion.aside role="dialog" aria-modal="true" aria-label="QAVLIO Assistant" className="fixed inset-x-3 bottom-24 z-[70] overflow-hidden rounded-panel border border-ink-900/10 bg-white shadow-floating sm:inset-x-auto sm:bottom-24 sm:right-4 sm:w-[min(calc(100vw-2rem),420px)] lg:bottom-20 lg:right-6" initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.2 }}>
        {body}
      </motion.aside>}
    </AnimatePresence>
    <CompareListings />
  </>;
}
