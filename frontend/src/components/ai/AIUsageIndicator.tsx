import { LoaderCircle, Sparkles } from 'lucide-react';

type Tone = 'suggestion' | 'data' | 'draft';

const TONES: Record<Tone, { label: string; className: string }> = {
  suggestion: { label: 'AI suggestion', className: 'bg-violet-50 text-violet-700 ring-violet-200' },
  data: { label: 'Based on QAVLIO listings', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  draft: { label: 'AI-generated draft', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
};

/** AI transparency label (§59) + async processing indicator. */
export default function AIUsageIndicator({ tone = 'suggestion', processing = false, className = '' }: { tone?: Tone; processing?: boolean; className?: string }) {
  if (processing) {
    return <p role="status" className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${TONES[tone].className} ${className}`}><LoaderCircle size={11} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> QAVLIO is thinking…</p>;
  }
  return <p className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${TONES[tone].className} ${className}`}><Sparkles size={11} aria-hidden="true" /> {TONES[tone].label}</p>;
}
