import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUp, Sparkles, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import AIMessage from './AIMessage';
import CompareListings from './CompareListings';
import { useAiAssistant } from '../../ai/AiAssistantProvider';
import { useTranslation } from '../../i18n';

const STARTER_KEYS = ['mobiles', 'cars', 'laptops', 'sell', 'promote', 'furniture'] as const;

/**
 * Ask QAVLIO chat surface.
 *
 * Fully localized, direction-aware (the panel docks to the inline end so it follows
 * the reading direction), a bottom sheet on small screens, and layered with the
 * shared z-index scale so it can never sit behind the header or search results.
 */
export default function AiAssistantPanel({ variant = 'dock' }: { variant?: 'dock' | 'page' }) {
  const { open, close, messages, pending, error, send } = useAiAssistant();
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isPage = variant === 'page';
  const starters = STARTER_KEYS.map((key) => t(`ai.starters.${key}`));

  // Keep the newest message visible without scrolling the page behind the panel.
  useEffect(() => {
    const anchor = endRef.current;
    if (typeof anchor?.scrollIntoView === 'function') anchor.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }, [messages, pending, reduceMotion]);
  useEffect(() => { if (open || isPage) inputRef.current?.focus(); }, [open, isPage]);
  // Escape closes the docked panel.
  useEffect(() => {
    if (isPage || !open) return undefined;
    const onKeyDown = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close, isPage, open]);

  if (!isPage && !open) return <CompareListings />;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const next = value.trim();
    if (!next || pending) return;
    setValue('');
    void send(next);
  };

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); }
  };

  const inputId = isPage ? 'qavlio-ai-page-input' : 'qavlio-ai-dock-input';
  const body = <div className={`flex min-h-0 flex-1 flex-col ${isPage ? '' : 'h-[min(70vh,620px)] max-h-[calc(100dvh-8rem)]'}`}>
    <header className="flex items-center gap-3 bg-ink-950 px-4 py-3 text-white">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-gold-300 text-ink-950" aria-hidden="true"><Sparkles size={18} /></span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-extrabold">{t('ai.title')}</h2>
        <p className="truncate text-[10px] text-white/55">{t('ai.subtitle')}</p>
      </div>
      {!isPage && <button type="button" onClick={close} className="grid h-9 w-9 shrink-0 place-items-center rounded-control text-white/70 transition duration-150 hover:bg-white/10" aria-label={t('ai.closeAria')}><X size={18} aria-hidden="true" /></button>}
    </header>

    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 p-4" role="log" aria-live="polite" aria-relevant="additions">
      {messages.map((item) => (
        <AIMessage
          key={item.id}
          role={item.role}
          text={item.i18nKey ? t(item.i18nKey) : item.text}
          reply={item.reply}
          onSuggestion={(message) => void send(message)}
        />
      ))}

      {pending && (
        <p className="inline-flex items-center gap-2 rounded-card bg-white px-3 py-2 text-xs font-bold text-violet-700 shadow-sm">
          <span className="flex items-center gap-1" aria-hidden="true">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="h-1.5 w-1.5 animate-thinking-dot rounded-full bg-violet-600 motion-reduce:animate-none" style={{ animationDelay: `${dot * 140}ms` }} />
            ))}
          </span>
          {t('ai.thinking')}
        </p>
      )}

      {error && !pending && (
        <p role="alert" className="flex items-start gap-2 rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {t('ai.error')}
        </p>
      )}

      {messages.length < 3 && (
        <div className="space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{t('ai.suggestionsTitle')}</p>
          <div className="flex flex-wrap gap-2">
            {starters.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                disabled={pending}
                className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-start text-[11px] font-bold text-violet-800 transition duration-150 hover:-translate-y-px hover:bg-violet-50 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>

    <form onSubmit={submit} className="border-t bg-white p-3">
      <label className="sr-only" htmlFor={inputId}>{t('ai.title')}</label>
      <div className="flex items-end gap-2 rounded-card border border-ink-900/10 bg-slate-50 p-2 transition duration-150 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10">
        <textarea
          id={inputId}
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKey}
          rows={1}
          maxLength={2000}
          placeholder={isPage ? t('ai.placeholderLong') : t('ai.placeholder')}
          className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-semibold outline-none"
        />
        <button
          type="submit"
          disabled={pending || !value.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-violet-600 text-white transition duration-150 hover:bg-violet-700 disabled:bg-slate-300"
          aria-label={t('ai.send')}
        >
          <ArrowUp size={16} aria-hidden="true" className="rtl-flip" />
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[10px] font-semibold text-slate-400">{t('ai.hint')}</p>
    </form>
  </div>;

  if (isPage) return <section className="overflow-hidden rounded-panel border border-ink-900/10 bg-white shadow-card">{body}</section>;

  return <>
    <AnimatePresence>
      {open && <motion.aside
        role="dialog"
        aria-modal="false"
        aria-label={t('ai.title')}
        className="fixed inset-x-3 bottom-24 z-chatbot overflow-hidden rounded-panel border border-ink-900/10 bg-white shadow-floating sm:inset-x-auto sm:end-4 sm:w-[min(calc(100vw-2rem),400px)] lg:bottom-20 lg:end-6"
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        {body}
      </motion.aside>}
    </AnimatePresence>
    <CompareListings />
  </>;
}
