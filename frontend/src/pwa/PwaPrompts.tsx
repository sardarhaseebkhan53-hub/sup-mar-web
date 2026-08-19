import { motion, useReducedMotion } from 'framer-motion';
import { Download, RefreshCw, X } from 'lucide-react';
import { usePwa } from './usePwa';

/**
 * Renders the three PWA surfaces that need no per-page wiring:
 *   - an offline banner,
 *   - a subtle, once-per-session install prompt,
 *   - an update prompt when a new app version is ready.
 *
 * All prompts are dismissible, keyboard-operable, and honor reduced motion.
 */
export default function PwaPrompts() {
  const { isOffline, canInstall, needsUpdate, promptInstall, applyUpdate, dismissUpdate, dismissInstall } = usePwa();

  return (
    <>
      {isOffline && (
        <div role="status" className="fixed inset-x-0 top-0 z-toast bg-ink-900 px-4 py-2.5 text-center text-xs font-bold text-white">
          You are offline. Showing saved content — transactions won&apos;t be sent until you reconnect.
        </div>
      )}

      {canInstall && (
        <PromptShell onClose={dismissInstall} ariaLabel="Install QAVLIO">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><Download size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-ink-800">Install QAVLIO</p>
            <p className="mt-0.5 text-xs text-slate-500">Add the marketplace to your home screen for a faster, app-like experience.</p>
          </div>
          <button type="button" onClick={() => void promptInstall()} className="shrink-0 rounded-lg bg-violet-700 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-violet-800">
            Install
          </button>
        </PromptShell>
      )}

      {needsUpdate && (
        <PromptShell onClose={dismissUpdate} ariaLabel="Update QAVLIO">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600"><RefreshCw size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-ink-800">A new version is available</p>
            <p className="mt-0.5 text-xs text-slate-500">Refresh to get the latest updates. Your current session won&apos;t be interrupted until you confirm.</p>
          </div>
          <button type="button" onClick={applyUpdate} className="shrink-0 rounded-lg bg-violet-700 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-violet-800">
            Refresh
          </button>
        </PromptShell>
      )}
    </>
  );
}

function PromptShell({ children, onClose, ariaLabel }: { children: React.ReactNode; onClose: () => void; ariaLabel: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      role="dialog"
      aria-label={ariaLabel}
      className="fixed bottom-24 left-1/2 z-toast flex w-[min(92vw,440px)] -translate-x-1/2 items-center gap-3 rounded-card border border-ink-900/10 bg-white p-4 shadow-floating lg:bottom-6"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
      <button type="button" onClick={onClose} className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Dismiss">
        <X size={16} />
      </button>
    </motion.div>
  );
}
