import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAiAssistant } from '../../ai/AiAssistantProvider';
import { aiApi } from '../../services/apiClient';

export default function AiFloatingButton() {
  const { open, toggle } = useAiAssistant();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const status = useQuery({ queryKey: ['ai-status'], queryFn: async () => (await aiApi.status()).data, staleTime: 60_000 });
  if (location.pathname.startsWith('/ai-assistant')) return null;
  if (status.data && status.data.enabled === false) return null;
  if (status.data?.features?.assistant === false) return null;
  return <motion.button type="button" onClick={toggle} className="fixed bottom-24 right-4 z-[65] inline-flex h-12 items-center gap-2 rounded-full bg-ink-950 px-4 text-xs font-extrabold text-white shadow-floating ring-4 ring-white hover:bg-violet-700 lg:bottom-6 lg:right-6" aria-label={open ? 'Close QAVLIO AI' : 'Open QAVLIO AI'} aria-expanded={open} whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
    {open ? <X size={16} /> : <Sparkles size={15} className="text-gold-300" />}
    <span>{open ? 'Close' : 'Ask QAVLIO'}</span>
  </motion.button>;
}
