import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAiAssistant } from '../../ai/AiAssistantProvider';
import { useTranslation } from '../../i18n';
import { aiApi } from '../../services/apiClient';

/**
 * Compact "Ask QAVLIO" launcher. Docks to the inline end so it follows the reading
 * direction, sits above the mobile bottom navigation, and respects safe areas.
 */
export default function AiFloatingButton() {
  const { open, toggle } = useAiAssistant();
  const { t } = useTranslation();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const status = useQuery({ queryKey: ['ai-status'], queryFn: async () => (await aiApi.status()).data, staleTime: 60_000 });
  if (location.pathname.startsWith('/ai-assistant')) return null;
  if (status.data && status.data.enabled === false) return null;
  if (status.data?.features?.assistant === false) return null;
  return <motion.button
    type="button"
    onClick={toggle}
    className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-4 z-chatbot inline-flex h-12 items-center gap-2 rounded-full bg-ink-950 px-4 text-xs font-extrabold text-white shadow-floating ring-4 ring-white transition duration-200 hover:bg-violet-700 lg:bottom-6 lg:end-6"
    aria-label={open ? t('ai.closeAria') : t('ai.open')}
    aria-expanded={open}
    whileHover={reduceMotion ? undefined : { y: -2 }}
    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
  >
    {open ? <X size={16} aria-hidden="true" /> : <Sparkles size={15} className="text-gold-300" aria-hidden="true" />}
    <span>{open ? t('ai.close') : t('ai.button')}</span>
  </motion.button>;
}
