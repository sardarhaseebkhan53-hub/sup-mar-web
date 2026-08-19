import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface DropdownProps {
  trigger: (open: boolean) => ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  label: string;
}

export function Dropdown({ trigger, children, align = 'right', label }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);
  return <div ref={rootRef} className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" aria-label={label}>{trigger(open)}</button>
    <AnimatePresence>{open && <motion.div role="menu" className={`absolute top-full z-30 mt-2 min-w-52 rounded-card border border-ink-900/10 bg-white p-2 shadow-floating ${align === 'right' ? 'end-0' : 'start-0'}`} initial={reduceMotion ? false : { opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>{children}</motion.div>}</AnimatePresence>
  </div>;
}
