import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaState {
  /** A new service worker is installed and waiting — show the update prompt. */
  needsUpdate: boolean;
  /** Whether an install prompt is available (browser supports app install). */
  canInstall: boolean;
  /** Whether the browser is currently offline. */
  isOffline: boolean;
  /** Whether the user previously dismissed the install prompt this session. */
  installDismissed: boolean;
  /** Trigger the browser's install prompt (must be called from a user gesture). */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** Apply the pending update and reload. */
  applyUpdate: () => void;
  /** Dismiss the update prompt. */
  dismissUpdate: () => void;
  /** Dismiss the install prompt for this session. */
  dismissInstall: () => void;
}

const STORAGE_KEY = 'qavlio:install-dismissed';

export function usePwa(): PwaState {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  const [installDismissed, setInstallDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [pendingPrompt, setPendingPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;

    let waiting: ServiceWorker | null = null;
    const refreshIsUpdate = (registration: ServiceWorkerRegistration) => {
      setNeedsUpdate(Boolean(registration.waiting));
      waiting = registration.waiting || null;
    };

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      refreshIsUpdate(registration);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedsUpdate(true);
            waiting = newWorker;
          }
        });
      });

      // The current page was claimed/controlled by a new SW that skipped waiting.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (waiting) window.location.reload();
      });
    }).catch(() => { /* SW unavailable (e.g. unsupported origin) — not fatal */ });

    return () => { waiting = null; };
  }, []);

  // Offline / online detection.
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Install prompt.
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPendingPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setCanInstall(false);
      setPendingPrompt(null);
      setInstallDismissed(true);
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    });
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!pendingPrompt) return 'unavailable' as const;
    const prompt = pendingPrompt;
    setPendingPrompt(null);
    setCanInstall(false);
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome;
  }, [pendingPrompt]);

  const applyUpdate = useCallback(() => {
    setNeedsUpdate(false);
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
  }, []);

  const dismissUpdate = useCallback(() => setNeedsUpdate(false), []);
  const dismissInstall = useCallback(() => {
    setCanInstall(false);
    setPendingPrompt(null);
    setInstallDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
  }, []);

  return {
    needsUpdate,
    canInstall: canInstall && !installDismissed,
    isOffline,
    installDismissed,
    promptInstall,
    applyUpdate,
    dismissUpdate,
    dismissInstall,
  };
}
