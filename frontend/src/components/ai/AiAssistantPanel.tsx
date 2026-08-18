import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, LifeBuoy, LoaderCircle, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAiAssistant } from '../../ai/AiAssistantProvider';
import { useAuth } from '../../auth/AuthProvider';
import { aiApi } from '../../services/apiClient';
import type { AiAction } from '../../types/ai';
import AiListingCard from './AiListingCard';

const starters = [
  'Find a used iPhone under Rs. 150,000',
  'Show cars under Rs. 3 million',
  'Help me sell my phone',
  'How do I promote my listing?',
  'Why is my payment pending?',
  'Find furniture near me',
  'Compare these listings',
];

export default function AiAssistantPanel({ variant = 'dock' }: { variant?: 'dock' | 'page' }) {
  const { open, close, messages, pending, send, compareIds, listingId } = useAiAssistant();
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isPage = variant === 'page';
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }, [messages, pending, reduceMotion]);
  useEffect(() => { if (open || isPage) inputRef.current?.focus(); }, [open, isPage]);

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

  const body = <div className={`flex min-h-0 flex-1 flex-col ${isPage ? '' : 'h-[min(72vh,640px)]'}`}>
    <header className="flex items-center gap-3 bg-ink-950 px-4 py-3 text-white">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-gold-300 text-ink-950" aria-hidden="true"><Sparkles size={18} /></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-extrabold">How can I help?</h2>
        <p className="text-[10px] text-white/55">QAVLIO Assistant · grounded in live marketplace data</p>
      </div>
      {!isPage && <button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-control text-white/70 hover:bg-white/10" aria-label="Close QAVLIO Assistant"><X size={18} /></button>}
    </header>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" role="log" aria-live="polite" aria-relevant="additions">
      {listingId && <p className="rounded-control bg-violet-50 px-3 py-2 text-[11px] font-bold text-violet-800">Asking about listing {listingId}</p>}
      {compareIds.length > 0 && <p className="text-[11px] font-semibold text-slate-500">Comparing {compareIds.length} selected listing{compareIds.length > 1 ? 's' : ''}.</p>}
      {messages.map((item) => <MessageBubble key={item.id} role={item.role} text={item.text} reply={item.reply} />)}
      {pending && <p className="inline-flex items-center gap-2 rounded-card bg-white px-3 py-2 text-xs font-bold text-violet-700 shadow-sm"><LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" /> QAVLIO is thinking...</p>}
      {messages.length < 3 && <div className="flex flex-wrap gap-2" aria-label="Suggested questions">{starters.map((prompt) => <button key={prompt} type="button" onClick={() => void send(prompt)} className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-left text-[11px] font-bold text-violet-800 hover:bg-violet-50">{prompt}</button>)}</div>}
      <div ref={endRef} />
    </div>
    <form onSubmit={submit} className="border-t bg-white p-3">
      <label className="sr-only" htmlFor={isPage ? 'qavlio-ai-page-input' : 'qavlio-ai-dock-input'}>Ask QAVLIO</label>
      <div className="flex items-end gap-2 rounded-card border border-ink-900/10 bg-slate-50 p-2 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
        <textarea id={isPage ? 'qavlio-ai-page-input' : 'qavlio-ai-dock-input'} ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={onKey} rows={1} maxLength={2000} placeholder="Type your question..." className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-semibold outline-none" />
        <button type="submit" disabled={pending || !value.trim()} className="grid h-10 w-10 place-items-center rounded-control bg-violet-600 text-white disabled:bg-slate-300" aria-label="Send message"><ArrowUp size={16} /></button>
      </div>
    </form>
  </div>;

  if (isPage) return <section className="overflow-hidden rounded-panel border border-ink-900/10 bg-white shadow-card">{body}</section>;

  return <AnimatePresence>
    {open && <motion.aside role="dialog" aria-modal="true" aria-label="QAVLIO Assistant" className="fixed inset-x-3 bottom-24 z-[70] overflow-hidden rounded-panel border border-ink-900/10 bg-white shadow-floating sm:inset-x-auto sm:bottom-24 sm:right-4 sm:w-[min(calc(100vw-2rem),420px)] lg:bottom-20 lg:right-6" initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.2 }}>
      {body}
    </motion.aside>}
  </AnimatePresence>;
}

function MessageBubble({ role, text, reply }: { role: 'user' | 'assistant'; text: string; reply?: import('../../types/ai').AiReply }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticketOpen, setTicketOpen] = useState(false);
  return <div className={`max-w-[92%] ${role === 'user' ? 'ml-auto' : ''}`}>
    <div className={`rounded-card px-3 py-2.5 text-sm leading-6 ${role === 'user' ? 'bg-violet-600 text-white' : 'bg-white text-ink-900 shadow-sm'}`}>
      <p className="font-semibold">{text}</p>
      {reply?.bullets && <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">{reply.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
      {reply?.source && <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-violet-600/80">{reply.source}</p>}
    </div>
    {reply?.listings && reply.listings.length > 0 && <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">{reply.listings.slice(0, 4).map((listing) => <AiListingCard key={listing.publicId} listing={listing} />)}</div>}
    {reply?.actions && <div className="mt-2 flex flex-wrap gap-2">{reply.actions.map((action) => <ActionButton key={action.label} action={action} onEscalate={() => setTicketOpen(true)} onNavigate={navigate} />)}</div>}
    {reply?.suggestions && <div className="mt-2 flex flex-wrap gap-1.5">{reply.suggestions.slice(0, 4).map((item) => <SuggestionChip key={item} label={item} />)}</div>}
    {reply?.unavailable && <p className="mt-2 text-[11px] font-semibold text-slate-500">You can keep using normal search while the assistant recovers.</p>}
    {ticketOpen && <SupportForm signedIn={Boolean(user)} onClose={() => setTicketOpen(false)} />}
  </div>;
}

function SuggestionChip({ label }: { label: string }) {
  const { send } = useAiAssistant();
  return <button type="button" onClick={() => void send(label)} className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold text-violet-800">{label}</button>;
}

function ActionButton({ action, onEscalate, onNavigate }: { action: AiAction; onEscalate: () => void; onNavigate: (to: string) => void }) {
  if (action.payload?.escalate) return <button type="button" onClick={onEscalate} className="inline-flex h-9 items-center gap-1 rounded-control bg-ink-950 px-3 text-[10px] font-extrabold text-white"><LifeBuoy size={13} />{action.label}</button>;
  if (action.href) return <button type="button" onClick={() => onNavigate(action.href!)} className="h-9 rounded-control border border-violet-200 bg-white px-3 text-[10px] font-extrabold text-violet-800">{action.label}</button>;
  return null;
}

function SupportForm({ signedIn, onClose }: { signedIn: boolean; onClose: () => void }) {
  const { conversationId } = useAiAssistant();
  const [category, setCategory] = useState('payment');
  const [description, setDescription] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  if (!signedIn) return <div className="mt-2 rounded-card border bg-white p-3 text-xs">Sign in to create a support request. <Link to="/login?returnTo=/ai-assistant" className="font-extrabold text-violet-700">Sign in</Link></div>;
  if (done) return <div className="mt-2 rounded-card border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{done}</div>;
  return <form className="mt-2 space-y-2 rounded-card border bg-white p-3" onSubmit={async (event) => {
    event.preventDefault();
    try {
      const response = await aiApi.support({ category, description, conversationId, priority: 'medium' });
      setDone(response.data.message || 'Support request created.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the request.');
    }
  }}>
    <p className="text-xs font-extrabold">Connect with QAVLIO Support</p>
    <label className="block text-[10px] font-bold">Category
      <select value={category} onChange={(event) => setCategory(event.target.value)} className="input-base mt-1 !h-9 text-xs">
        <option value="payment">Payment</option><option value="listing">Listing</option><option value="account">Account</option><option value="chat">Chat</option><option value="safety">Safety</option><option value="other">Other</option>
      </select>
    </label>
    <label className="block text-[10px] font-bold">What happened?
      <textarea required minLength={8} value={description} onChange={(event) => setDescription(event.target.value)} className="input-base mt-1 min-h-20 py-2 text-xs" />
    </label>
    {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
    <div className="flex gap-2">
      <button type="submit" className="h-9 rounded-control bg-violet-600 px-3 text-[10px] font-extrabold text-white">Create request</button>
      <button type="button" onClick={onClose} className="h-9 rounded-control px-3 text-[10px] font-bold">Cancel</button>
    </div>
  </form>;
}
