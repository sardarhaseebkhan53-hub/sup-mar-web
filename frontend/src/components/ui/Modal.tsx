import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useId, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, description, onClose, children }: ModalProps) {
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  return <AnimatePresence>
    {open && <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-ink-950/55 p-4 backdrop-blur-sm" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-lg rounded-panel bg-white p-6 shadow-floating" initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.2 }}>
        <div className="flex items-start gap-4"><div className="min-w-0 flex-1"><h2 id={titleId} className="text-xl font-extrabold text-ink-900">{title}</h2>{description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}</div><button type="button" onClick={onClose} className="tap-target grid place-items-center rounded-control text-slate-500 hover:bg-slate-100" aria-label="Close modal"><X size={19} /></button></div>
        <div className="mt-5">{children}</div>
      </motion.section>
    </motion.div>}
  </AnimatePresence>;
}
