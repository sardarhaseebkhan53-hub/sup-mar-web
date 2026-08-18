import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { shareApi } from '../../services/apiClient';

export default function ShareButton({ listingId, url, referralCode }: { listingId: string; url: string; referralCode?: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = referralCode ? `${url}?ref=${referralCode}` : url;
    const shareData = { title: 'Check this listing on QAVLIO', text: 'Found this on QAVLIO', url: shareUrl };
    if ((navigator as any).share && (navigator as any).canShare?.(shareData)) {
      try { await (navigator as any).share(shareData); await shareApi.share(listingId, { method: 'native', referralCode }).catch(()=>{}); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(()=>setCopied(false), 2000);
      await shareApi.share(listingId, { method: 'copy', referralCode }).catch(()=>{});
    } catch {
      // fallback
    }
  };

  return (
    <button onClick={handleShare} aria-label="Share listing" className="inline-flex h-10 items-center gap-2 rounded-control border bg-white px-4 text-xs font-bold hover:bg-slate-50">
      {copied ? <><Check size={14} className="text-emerald-600"/>Copied</> : <><Share2 size={14}/>Share</>}
    </button>
  );
}

export function CopyLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false),1500);
  };
  return (
    <button onClick={copy} className="inline-flex h-8 items-center gap-1 rounded-full border bg-white px-3 text-[11px] font-bold">
      {copied ? <Check size={12} className="text-emerald-600"/> : <Copy size={12}/>} {copied ? 'Copied' : 'Copy link'}
    </button>
  );
}
