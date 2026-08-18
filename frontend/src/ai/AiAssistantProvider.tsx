import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { aiApi } from '../services/apiClient';
import type { AiChatResponse, AiReply } from '../types/ai';

export type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; reply?: AiReply };

interface AssistantContext {
  open: boolean;
  fullscreen?: boolean;
  messages: ChatMessage[];
  pending: boolean;
  conversationId: string;
  listingId?: string;
  compareIds: string[];
  error?: string;
  toggle: () => void;
  openAssistant: (opts?: { listingId?: string; prompt?: string }) => void;
  close: () => void;
  send: (message: string) => Promise<void>;
  toggleCompare: (id: string) => void;
}

const Context = createContext<AssistantContext | null>(null);
const guestKey = () => {
  const existing = sessionStorage.getItem('qavlio-ai-guest');
  if (existing) return existing;
  const next = crypto.randomUUID();
  sessionStorage.setItem('qavlio-ai-guest', next);
  return next;
};

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'welcome', role: 'assistant', text: "Hi! I'm QAVLIO Assistant. How can I help?" }]);
  const [pending, setPending] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [listingId, setListingId] = useState<string>();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  const send = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(undefined);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: trimmed }]);
    try {
      const response = await aiApi.chat({ message: trimmed, conversationId: conversationId || undefined, listingId, listingIds: compareIds, guestKey: guestKey() });
      const data = response.data as AiChatResponse;
      setConversationId(data.conversationId);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: data.reply.text, reply: data.reply }]);
    } catch {
      setError('QAVLIO AI is temporarily unavailable.');
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: 'QAVLIO AI is temporarily unavailable.', reply: { text: 'QAVLIO AI is temporarily unavailable.', unavailable: true, actions: [{ type: 'search', label: 'Continue with normal search', href: '/search' }] } }]);
    } finally {
      setPending(false);
    }
  }, [compareIds, conversationId, listingId, pending]);

  const value = useMemo<AssistantContext>(() => ({
    open, messages, pending, conversationId, listingId, compareIds, error,
    toggle: () => setOpen((value) => !value),
    openAssistant: (opts) => { if (opts?.listingId) setListingId(opts.listingId); setOpen(true); if (opts?.prompt) void send(opts.prompt); },
    close: () => setOpen(false),
    send,
    toggleCompare: (id) => setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(-3)),
  }), [compareIds, conversationId, error, listingId, messages, open, pending, send]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAiAssistant() {
  const context = useContext(Context);
  if (!context) throw new Error('useAiAssistant must be used inside AiAssistantProvider');
  return context;
}
