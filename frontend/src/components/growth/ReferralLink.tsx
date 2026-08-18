import { useState } from 'react';
import { Copy, Share2, Check, Link2 } from 'lucide-react';
import { Button } from '../ui/Button';

export default function ReferralLink({ code, link }: { code: string; link: string }) {
  const [copied, setCopied] = useState<'code'|'link'|null>(null);

  const copy = async (text: string, which: 'code'|'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(()=>setCopied(null), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(which);
      setTimeout(()=>setCopied(null), 2000);
    }
  };

  const share = async () => {
    const shareData = { title: 'Join QAVLIO', text: `Use my referral code ${code} to join QAVLIO!`, url: link };
    if ((navigator as any).share && (navigator as any).canShare?.(shareData)) {
      try { await (navigator as any).share(shareData); return; } catch { /* user cancelled */ }
    }
    await copy(link, 'link');
  };

  return (
    <div className="rounded-panel border bg-white p-6">
      <h3 className="flex items-center gap-2 text-sm font-extrabold"><Link2 size={16} className="text-violet-600"/>Your Referral</h3>
      <div className="mt-4 grid gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Referral Code</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded-control border bg-slate-50 px-4 py-3 text-sm font-bold tracking-widest">{code}</code>
            <button onClick={()=>copy(code,'code')} aria-label="Copy referral code" className="grid h-11 w-11 place-items-center rounded-control border bg-white hover:bg-slate-50">
              {copied==='code' ? <Check size={16} className="text-emerald-600"/> : <Copy size={16}/>}
            </button>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Referral Link</p>
          <div className="mt-2 flex items-center gap-2">
            <input readOnly value={link} className="h-11 flex-1 rounded-control border bg-slate-50 px-4 text-xs" />
            <button onClick={()=>copy(link,'link')} aria-label="Copy referral link" className="grid h-11 w-11 place-items-center rounded-control border bg-white hover:bg-slate-50">
              {copied==='link' ? <Check size={16} className="text-emerald-600"/> : <Copy size={16}/>}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={share} variant="secondary" size="sm"><Share2 size={14}/>Share</Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Join QAVLIO with my code ${code} ${link}`)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1 rounded-control border bg-white px-3 text-xs font-bold hover:bg-slate-50">WhatsApp</a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1 rounded-control border bg-white px-3 text-xs font-bold hover:bg-slate-50">Facebook</a>
        </div>
        <p className="text-[11px] text-slate-500">Share transparently. New users signing up with your code may earn you rewards after eligibility checks. Abuse is monitored.</p>
      </div>
    </div>
  );
}
