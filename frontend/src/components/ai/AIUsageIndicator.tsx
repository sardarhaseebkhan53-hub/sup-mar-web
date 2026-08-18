import { Sparkles } from 'lucide-react';

interface Props {
  state: 'idle' | 'thinking' | 'ready' | 'unavailable' | 'degraded';
  label?: string;
  compact?: boolean;
}

const COPY: Record<Props['state'], string> = {
  idle: 'QAVLIO AI',
  thinking: 'QAVLIO is thinking…',
  ready: 'Answered from QAVLIO listings',
  unavailable: 'QAVLIO AI is temporarily unavailable',
  degraded: 'Running in basic mode',
};

/**
 * Consistent, honest AI status affordance. Tells the user when AI is active,
 * degraded, or unavailable so results are never mistaken for something else.
 */
export default function AIUsageIndicator({ state, label, compact }: Props) {
  const text = label || COPY[state];
  const tone =
    state === 'unavailable' ? 'text-amber-800' :
    state === 'degraded' ? 'text-slate-500' :
    state === 'thinking' ? 'text-violet-700' : 'text-slate-400';

  return (
    <p className={`inline-flex items-center gap-1.5 font-bold ${compact ? 'text-[10px]' : 'text-[11px]'} ${tone}`} role="status" aria-live="polite">
      <Sparkles size={compact ? 10 : 12} className={state === 'thinking' ? 'animate-pulse' : ''} aria-hidden="true" />
      {text}
    </p>
  );
}
