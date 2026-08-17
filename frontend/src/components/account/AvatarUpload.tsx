import { Camera, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { userApi } from '../../services/apiClient';
import type { AuthUser } from '../../types/auth';
import { Button } from '../ui/Button';
import { ImageWithFallback } from '../ui/ImageWithFallback';

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
export default function AvatarUpload({ user, onUpdated }: { user: AuthUser; onUpdated: (user: AuthUser) => void }) {
  const [preview, setPreview] = useState<string | null>(user.avatar || null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const select = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]; setMessage(null);
    if (!selected) return;
    if (!allowedTypes.includes(selected.type)) { setMessage('Choose a JPEG, PNG, or WebP image.'); return; }
    if (selected.size > 5 * 1024 * 1024) { setMessage('Profile images must be smaller than 5 MB.'); return; }
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setFile(selected); setPreview(URL.createObjectURL(selected));
  };
  const upload = async () => {
    if (!file) return; setBusy(true); setMessage(null);
    try { const response = await userApi.uploadAvatar(file); onUpdated(response.data); setPreview(response.data.avatar || null); setFile(null); setMessage('Profile image updated.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Profile image upload failed.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setMessage(null);
    try { const response = await userApi.removeAvatar(); onUpdated(response.data); setPreview(null); setFile(null); setMessage('Profile image removed.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Profile image could not be removed.'); }
    finally { setBusy(false); }
  };

  return <section aria-labelledby="avatar-heading"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-card bg-violet-100">{preview ? <ImageWithFallback src={preview} alt={`${user.name} profile image preview`} wrapperClassName="h-full w-full" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center text-violet-700" role="img" aria-label="Profile image placeholder"><Camera size={24} /></span>}</div><div><h2 id="avatar-heading" className="text-sm font-extrabold">Profile image</h2><p className="mt-1 text-[10px] leading-5 text-slate-500">JPEG, PNG, or WebP · maximum 5 MB · optimized by secure cloud storage.</p><input ref={inputRef} type="file" accept={allowedTypes.join(',')} onChange={select} className="sr-only" aria-label="Choose profile image" /><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={14} /> Choose image</Button>{file && <Button type="button" size="sm" onClick={upload} disabled={busy}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />} Upload</Button>}{user.avatar && !file && <Button type="button" size="sm" variant="ghost" onClick={remove} disabled={busy}><Trash2 size={14} /> Remove</Button>}</div></div></div>{message && <p className={`mt-3 text-[10px] font-semibold ${message.includes('updated') || message.includes('removed') ? 'text-emerald-700' : 'text-rose-600'}`} role="status">{message}</p>}</section>;
}
