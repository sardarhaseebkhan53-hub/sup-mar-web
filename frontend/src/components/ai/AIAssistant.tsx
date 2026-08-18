import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, LoaderCircle, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAiAssistant } from '../../ai/AiAssistantProvider';
import AIMessage from './AIMessage';

const STARTERS = [
  'Find a used iPhone under Rs. 150,000',
  'Show cars under Rs. 3 million',
  'Help me sell my phone',
  'How do I promote my listing?',
  'Why is my payment pending?',
  'Find furniture near me',
  'Compare these listings',
];

/**
 * QAVLIO shopping assistant. It can search, explain filters, compare, suggest
 * alternatives and help sellers — it can never buy, pay, verify, refund, or
 * change any account. QAVLIO branding throughout; not a ChatGPT clone.
 */
export default function AIAssistant({ variant = 'dock' }: { variant?: 'dock' | 'page' }) {
  const { open, close, messages, pending, send, compareIds, listingId, error } = useAiAssistant();
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const isPage = variant === 'page';

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }, [messages, pending, reduceMotion]);

  // Focus management: move focus into the dialog on open, restore it on close.
  useEffect(() => {
    if (isPage) { inputRef.current?.focus(); return; }
    if (open) {
      restoreFocusTo.current = document.activeElement as HTMLElement;
      inputRef.current?.focus();
    } else {
      restoreFocusTo.current?.focus?.();
      restoreFocusTo.current = null;
    }
  }, [open, isPage]);

  // Escape closes the dock; Tab is trapped inside it.
  useEffect(() => {
    if (isPage || !open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, isPage, close]);

  if (!isPage && !open) return null;

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

  const inputId = isPage ? 'qavlio-ai-page-input' : 'qavlio-ai-dock-input';

  const body = (
    <div className={`flex min-h-0 flex-1 flex-col ${isPage ? '' : 'h-[min(72vh,640px)]'}`}>
      <header className="flex items-center gap-3 bg-ink-950 px-4 py-3 text-white">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-gold-300 text-ink-950" aria-hidden="true"><Sparkles size={18} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold">How can I help?</h2>
          <p className="text-[10px] text-white/55">QAVLIO Assistant · grounded in live marketplace data</p>
        </div>
        {!isPage && <button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-control text-white/70 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Close QAVLIO Assistant"><X size={18} aria-hidden="true" /></button>}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with QAVLIO Assistant">
        {listingId && <p className="rounded-control bg-violet-50 px-3 py-2 text-[11px] font-bold text-violet-800">Asking about listing {listingId}</p>}
        {compareIds.length > 0 && <p className="text-[11px] font-semibold text-slate-500">Comparing {compareIds.length} selected listing{compareIds.length > 1 ? 's' : ''}.</p>}
        {messages.map((item) => <AIMessage key={item.id} role={item.role} text={item.text} reply={item.reply} />)}
        {pending && <p className="inline-flex items-center gap-2 rounded-card bg-white px-3 py-2 text-xs font-bold text-violet-700 shadow-sm"><LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> QAVLIO is thinking...</p>}
        {error && <p role="alert" className="rounded-card bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">{error}</p>}
        {messages.length < 3 && (
          <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
            {STARTERS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => void send(prompt)} className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-left text-[11px] font-bold text-violet-800 hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">{prompt}</button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-t bg-white p-3">
        <label className="sr-only" htmlFor={inputId}>Ask QAVLIO</label>
        <div className="flex items-end gap-2 rounded-card border border-ink-900/10 bg-slate-50 p-2 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
          <textarea id={inputId} ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={onKey} rows={1} maxLength={2000} placeholder="Type your question..." className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-semibold outline-none" />
          <button type="submit" disabled={pending || !value.trim()} className="grid h-10 w-10 place-items-center rounded-control bg-violet-600 text-white disabled:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1" aria-label="Send message"><ArrowUp size={16} aria-hidden="true" /></button>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">QAVLIO Assistant can search and explain listings. It cannot buy, pay, verify identity, or change your account.</p>
      </form>
    </div>
  );

  if (isPage) return <section className="overflow-hidden rounded-panel border border-ink-900/10 bg-white shadow-card">{body}</section>;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="QAVLIO Assistant"
          className="fixed inset-x-3 bottom-24 z-[70] overflow-hidden rounded-panel border border-ink-900/10 bg-white shadow-floating sm:inset-x-auto sm:bottom-24 sm:right-4 sm:w-[min(calc(100vw-2rem),420px)] lg:bottom-20 lg:right-6"
          initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          {body}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
