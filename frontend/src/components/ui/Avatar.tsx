import { UserRound } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils/cn';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'h-8 w-8 text-[10px]', md: 'h-10 w-10 text-xs', lg: 'h-14 w-14 text-sm' };

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <span className={cn('inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-violet-100 font-extrabold text-violet-700', sizes[size], className)}>
    {src && !failed ? <img src={src} alt="" width={96} height={96} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" /> : initials || <UserRound size={16} />}
  </span>;
}
