import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

export default function ConfirmDialog({ open, title, description, confirmationLabel, confirmationValue, onConfirmationChange, confirmText, confirmVariant = 'danger', busy = false, onCancel, onConfirm, children }) {
  const closeRef = useRef(null);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  useEffect(() => { if (!open) return undefined; function escape(event) { if (event.key === 'Escape') onCancel(); } document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape); }, [open, onCancel]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-ink-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700"><AlertTriangle size={20} /></span><div className="min-w-0 flex-1"><h2 id="confirm-title" className="text-lg font-extrabold">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-500">{description}</p></div><button ref={closeRef} onClick={onCancel} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close dialog"><X size={18} /></button></div>{children && <div className="mt-5">{children}</div>}{confirmationLabel && <label className="mt-5 block text-xs font-extrabold">{confirmationLabel}<input className="input-base mt-2" value={confirmationValue} onChange={(event) => onConfirmationChange(event.target.value)} autoFocus /></label>}<div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button><Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>{busy ? 'Please wait…' : confirmText}</Button></div></section></div>;
}
