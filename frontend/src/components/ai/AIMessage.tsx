import { LifeBuoy } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { aiApi } from '../../services/apiClient';
import type { AiAction, AiReply } from '../../types/ai';
import AIListingResults from './AIListingResults';
import AIUsageIndicator from './AIUsageIndicator';

/** AIMessage — a single assistant/user turn with grounded listings, actions, and suggestions. */
export default function AIMessage({ role, text, reply, onSuggestion }: { role: 'user' | 'assistant'; text: string; reply?: AiReply; onSuggestion?: (message: string) => void }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [ticketOpen, setTicketOpen] = useState(false);
  const compareSummary = reply?.compare && typeof reply.compare === 'object' && Array.isArray((reply.compare as { aiSummary?: unknown[] }).aiSummary)
    ? (reply.compare as { aiSummary: unknown[] }).aiSummary
    : null;

  return (
    <div className={`max-w-[92%] ${role === 'user' ? 'ms-auto' : 'me-auto'}`}>
      <div className={`rounded-card px-3 py-2.5 text-sm leading-6 ${role === 'user' ? 'bg-violet-600 text-white' : 'bg-white text-ink-900 shadow-sm'}`}>
        <p className="font-semibold">{text}</p>
        {reply?.bullets && <ul className="mt-2 list-disc space-y-1 ps-4 text-xs">{reply.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
        {compareSummary && (
          <ul className="mt-2 space-y-1 rounded-control bg-violet-50 p-2 text-[11px] font-semibold text-violet-900">
            {compareSummary.map((line) => <li key={String(line)}>· {String(line)}</li>)}
          </ul>
        )}
        {reply?.source && <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-violet-600/80">{reply.source}</p>}
      </div>
      {reply?.listings && reply.listings.length > 0 && <AIListingResults listings={reply.listings} />}
      {reply?.actions && reply.actions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {reply.actions.map((action) => <ActionButton key={action.label} action={action} onEscalate={() => setTicketOpen(true)} onNavigate={navigate} />)}
        </div>
      )}
      {reply?.suggestions && reply.suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label={t('ai.suggestionsTitle')}>
          {reply.suggestions.slice(0, 4).map((item) => (
            <button key={item} type="button" onClick={() => onSuggestion?.(item)} className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold text-violet-800 hover:bg-violet-100">{item}</button>
          ))}
        </div>
      )}
      {reply?.unavailable && <p className="mt-2 text-[11px] font-semibold text-slate-500">{t('ai.continueSearch')}</p>}
      {role === 'assistant' && !reply?.unavailable && <div className="mt-1.5"><AIUsageIndicator tone={reply?.source ? 'data' : 'suggestion'} /></div>}
      {ticketOpen && <SupportForm onClose={() => setTicketOpen(false)} />}
    </div>
  );
}

function ActionButton({ action, onEscalate, onNavigate }: { action: AiAction; onEscalate: () => void; onNavigate: (to: string) => void }) {
  if (action.payload?.escalate) return <button type="button" onClick={onEscalate} className="inline-flex h-9 items-center gap-1 rounded-control bg-ink-950 px-3 text-[10px] font-extrabold text-white"><LifeBuoy size={13} aria-hidden="true" />{action.label}</button>;
  if (action.href) return <button type="button" onClick={() => onNavigate(action.href!)} className="h-9 rounded-control border border-violet-200 bg-white px-3 text-[10px] font-extrabold text-violet-800">{action.label}</button>;
  return null;
}

function SupportForm({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState('payment');
  const [description, setDescription] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  return <form className="mt-2 space-y-2 rounded-card border bg-white p-3" onSubmit={async (event) => {
    event.preventDefault();
    try {
      const response = await aiApi.support({ category, description, priority: 'medium' });
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
    {done && <p className="text-[11px] font-bold text-emerald-700">{done}</p>}
    <p className="text-[10px] text-slate-400"><Link to="/login?returnTo=/ai-assistant" className="underline">Sign in</Link> if you are not already — support requests need an account.</p>
  </form>;
}
