import { LifeBuoy } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAiAssistant } from '../../ai/AiAssistantProvider';
import { useAuth } from '../../auth/AuthProvider';
import { aiApi } from '../../services/apiClient';
import type { AiAction, AiReply } from '../../types/ai';
import AIListingResults from './AIListingResults';

/**
 * One turn in the QAVLIO assistant conversation. Assistant answers always show
 * their source, and listings come from AIListingResults (real listings only).
 */
export default function AIMessage({ role, text, reply }: { role: 'user' | 'assistant'; text: string; reply?: AiReply }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticketOpen, setTicketOpen] = useState(false);

  return (
    <div className={`max-w-[92%] ${role === 'user' ? 'ml-auto' : ''}`}>
      <div className={`rounded-card px-3 py-2.5 text-sm leading-6 ${role === 'user' ? 'bg-violet-600 text-white' : 'bg-white text-ink-900 shadow-sm'}`}>
        <p className="sr-only">{role === 'user' ? 'You said' : 'QAVLIO Assistant said'}</p>
        <p className="whitespace-pre-wrap font-semibold">{text}</p>
        {reply?.bullets && <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">{reply.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
        {reply?.source && <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-violet-600/80">{reply.source}</p>}
      </div>

      {reply?.listings && reply.listings.length > 0 && (
        <div className="mt-2">
          <AIListingResults listings={reply.listings} columns={2} limit={4} showReasons={false} />
        </div>
      )}

      {reply?.actions && <div className="mt-2 flex flex-wrap gap-2">{reply.actions.map((action) => <ActionButton key={action.label} action={action} onEscalate={() => setTicketOpen(true)} onNavigate={navigate} />)}</div>}
      {reply?.suggestions && <div className="mt-2 flex flex-wrap gap-1.5">{reply.suggestions.slice(0, 4).map((item) => <SuggestionChip key={item} label={item} />)}</div>}
      {reply?.unavailable && <p className="mt-2 text-[11px] font-semibold text-slate-500">You can keep using normal search while the assistant recovers.</p>}
      {ticketOpen && <SupportForm signedIn={Boolean(user)} onClose={() => setTicketOpen(false)} />}
    </div>
  );
}

function SuggestionChip({ label }: { label: string }) {
  const { send } = useAiAssistant();
  return <button type="button" onClick={() => void send(label)} className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold text-violet-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">{label}</button>;
}

function ActionButton({ action, onEscalate, onNavigate }: { action: AiAction; onEscalate: () => void; onNavigate: (to: string) => void }) {
  if (action.payload?.escalate) return <button type="button" onClick={onEscalate} className="inline-flex h-9 items-center gap-1 rounded-control bg-ink-950 px-3 text-[10px] font-extrabold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"><LifeBuoy size={13} aria-hidden="true" />{action.label}</button>;
  if (action.href) return <button type="button" onClick={() => onNavigate(action.href!)} className="h-9 rounded-control border border-violet-200 bg-white px-3 text-[10px] font-extrabold text-violet-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">{action.label}</button>;
  return null;
}

function SupportForm({ signedIn, onClose }: { signedIn: boolean; onClose: () => void }) {
  const { conversationId } = useAiAssistant();
  const [category, setCategory] = useState('payment');
  const [description, setDescription] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  if (!signedIn) return <div className="mt-2 rounded-card border bg-white p-3 text-xs">Sign in to create a support request. <Link to="/login?returnTo=/ai-assistant" className="font-extrabold text-violet-700">Sign in</Link></div>;
  if (done) return <div className="mt-2 rounded-card border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800" role="status">{done}</div>;

  return (
    <form
      className="mt-2 space-y-2 rounded-card border bg-white p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          const response = await aiApi.support({ category, description, conversationId, priority: 'medium' });
          setDone(response.data.message || 'Support request created.');
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Could not create the request.');
        }
      }}
    >
      <p className="text-xs font-extrabold">Connect with QAVLIO Support</p>
      <label className="block text-[10px] font-bold">Category
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="input-base mt-1 !h-9 text-xs">
          <option value="payment">Payment</option><option value="listing">Listing</option><option value="account">Account</option><option value="chat">Chat</option><option value="safety">Safety</option><option value="other">Other</option>
        </select>
      </label>
      <label className="block text-[10px] font-bold">What happened?
        <textarea required minLength={8} value={description} onChange={(event) => setDescription(event.target.value)} className="input-base mt-1 min-h-20 py-2 text-xs" />
      </label>
      {error && <p role="alert" className="text-[11px] font-bold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="h-9 rounded-control bg-violet-600 px-3 text-[10px] font-extrabold text-white">Create request</button>
        <button type="button" onClick={onClose} className="h-9 rounded-control px-3 text-[10px] font-bold">Cancel</button>
      </div>
    </form>
  );
}
