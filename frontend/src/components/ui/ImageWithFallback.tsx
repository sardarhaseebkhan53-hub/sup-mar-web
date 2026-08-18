import { ImageOff } from 'lucide-react';
import { useState, type ImgHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface ImageWithFallbackProps extends ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  /** Reserve layout space to avoid layout shift (e.g. "aspect-[16/10]"). */
  aspectRatio?: string;
}

/**
 * Marketplace image with a graceful loading placeholder, an attractive error
 * state (never a broken-image icon) and CLS-safe layout reservation.
 *
 * Images default to `loading="lazy"` + `decoding="async"` so off-screen
 * marketplace thumbnails are not downloaded until needed.
 */
export function ImageWithFallback({ alt, className, wrapperClassName, aspectRatio, onLoad, onError, loading = 'lazy', decoding = 'async', ...props }: ImageWithFallbackProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return <span className={cn('relative block overflow-hidden bg-slate-100', aspectRatio, wrapperClassName)}>
    {!loaded && !failed && <span className="absolute inset-0 animate-pulse bg-slate-200" aria-hidden="true" />}
    {failed ? <span className="absolute inset-0 grid place-items-center bg-slate-100 text-slate-400" role="img" aria-label={alt || 'Image unavailable'}><span className="text-center"><ImageOff className="mx-auto" size={24} /><span className="mt-2 block text-[10px] font-bold">Image unavailable</span></span></span> : <img alt={alt} className={cn('h-full w-full object-cover', loaded && 'image-reveal', className)} loading={loading} decoding={decoding} onLoad={(event) => { setLoaded(true); onLoad?.(event); }} onError={(event) => { setFailed(true); onError?.(event); }} {...props} />}
  </span>;
}
