import { Copy, Facebook, Mail, Share2 } from 'lucide-react';
import { useState } from 'react';
import { listingSharePath } from '../../hooks/useFavorite';
import { Toast } from '../ui/Toast';
import { referralApi, shareApi } from '../../services/apiClient';

export default function ShareButton({ title, listing, url }: { title: string; listing?: { slug?: string; publicId?: string; id?: string }; url?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (listing ? `${window.location.origin}${listingSharePath(listing)}` : window.location.href);
  const trackShare = (method: string) => {
    const id = (listing as any)?.publicId || (listing as any)?.id || '';
    if (!id) return;
    // Try to get referral code for share attribution
    referralApi.my().then(res => {
      const code = res.data?.code?.code || null;
      shareApi.share(id, { method, referralCode: code }).catch(()=>{});
    }).catch(()=>{
      shareApi.share(id, { method }).catch(()=>{});
    });
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        trackShare('native');
        return;
      } catch { return; }
    }
    setOpen(!open);
  };
  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setOpen(false);
    trackShare('copy');
  };
  return <div className="relative">
    <button type="button" onClick={() => void share()} className="inline-flex h-11 items-center gap-2 rounded-control border bg-white px-4 text-xs font-extrabold"><Share2 size={16} />Share</button>
    {open && <div className="absolute end-0 top-12 z-30 w-52 rounded-card border bg-white p-2 shadow-floating">
      <button type="button" onClick={() => void copy()} className="flex w-full items-center gap-2 rounded-lg p-2 text-xs font-bold hover:bg-slate-50"><Copy size={14} />Copy link</button>
      <a target="_blank" rel="noreferrer" onClick={()=>trackShare('whatsapp')} href={`https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`} className="block rounded-lg p-2 text-xs font-bold hover:bg-slate-50">WhatsApp</a>
      <a target="_blank" rel="noreferrer" onClick={()=>trackShare('facebook')} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} className="flex items-center gap-2 rounded-lg p-2 text-xs font-bold hover:bg-slate-50"><Facebook size={14} />Facebook</a>
      <a target="_blank" rel="noreferrer" onClick={()=>trackShare('twitter')} href={`https://x.com/intent/post?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`} className="block rounded-lg p-2 text-xs font-bold hover:bg-slate-50">X</a>
      <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareUrl)}`} onClick={()=>trackShare('email')} className="flex items-center gap-2 rounded-lg p-2 text-xs font-bold hover:bg-slate-50"><Mail size={14} />Email</a>
    </div>}
    <Toast open={copied} message="Link copied! Aggregate share events tracked." tone="success" onClose={() => setCopied(false)} />
  </div>;
}
