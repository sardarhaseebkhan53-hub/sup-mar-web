import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: traps focus while open, restores focus on close, closes on
 * Escape, and is labelled by its title. Honors prefers-reduced-motion.
 */
export function Modal({ open, title, description, onClose, children }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    previousFocus.current = document.activeElement;

    // Move focus into the dialog.
    const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
    (focusable[0] || dialog).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((node) => !node.hasAttribute('disabled'));
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Restore focus to the element that opened the dialog.
      const previous = previousFocus.current;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [onClose, open]);

  return <AnimatePresence>
    {open && <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-ink-950/55 p-4 backdrop-blur-sm" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-lg rounded-panel bg-white p-6 shadow-floating" initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.2 }}>
        <div className="flex items-start gap-4"><div className="min-w-0 flex-1"><h2 id={titleId} className="text-xl font-extrabold text-ink-900">{title}</h2>{description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}</div><button type="button" onClick={onClose} className="tap-target grid place-items-center rounded-control text-slate-500 hover:bg-slate-100" aria-label="Close modal"><X size={19} /></button></div>
        <div className="mt-5">{children}</div>
      </motion.section>
    </motion.div>}
  </AnimatePresence>;
}
