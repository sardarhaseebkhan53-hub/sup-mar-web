import { Link } from 'react-router-dom';
import brandMark from '../../assets/brand/qavlio-mark.svg';
import { cn } from '../../utils/cn';

interface LogoProps {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
}

export default function Logo({ compact = false, inverse = false, className }: LogoProps) {
  return <Link to="/" aria-label="QAVLIO home" className={cn('inline-flex shrink-0 items-center gap-2.5', className)}>
    <img src={brandMark} alt="" className={compact ? 'h-9 w-9' : 'h-11 w-11'} width="44" height="44" />
    <span className={compact ? 'hidden sm:block' : 'block'}>
      <span className={cn('block text-xl font-extrabold leading-none tracking-[0.04em]', inverse ? 'text-white' : 'text-ink-900')}>QAVLIO</span>
      {!compact && <span className={cn('mt-1 block text-[8px] font-bold uppercase tracking-[0.2em]', inverse ? 'text-white/60' : 'text-ink-700/60')}>Buy. Sell. Discover.</span>}
    </span>
  </Link>;
}
