import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useTranslation } from '../../i18n';

export type ToastTone = 'success' | 'info' | 'error';
interface ToastProps { open: boolean; message: string; tone?: ToastTone; onClose: () => void; }
const tones = { success: { Icon: CheckCircle2, color: 'text-emerald-600' }, info: { Icon: Info, color: 'text-blue-600' }, error: { Icon: TriangleAlert, color: 'text-rose-600' } };

export function Toast({ open, message, tone = 'info', onClose }: ToastProps) {
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();
  const { Icon, color } = tones[tone];
  return <AnimatePresence>{open && <motion.div role="status" className="fixed inset-x-0 bottom-24 z-toast mx-auto flex w-[min(92vw,420px)] items-center gap-3 rounded-card border border-ink-900/10 bg-white p-4 shadow-floating lg:bottom-6" initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}><Icon size={19} className={color} /><p className="min-w-0 flex-1 text-sm font-bold text-ink-800">{message}</p><button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label={t('common.close')}><X size={16} /></button></motion.div>}</AnimatePresence>;
}
