import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useFavorite } from '../../hooks/useFavorite';

export default function FavoriteButton({ id, title = 'listing', className = '', compact = false }: { id: string; title?: string; className?: string; compact?: boolean }) {
  const favorite = useFavorite(id, title);
  return <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={favorite.toggle} aria-pressed={favorite.saved} aria-label={favorite.label} className={`inline-flex h-11 items-center justify-center gap-2 rounded-control border border-slate-200 bg-white px-4 text-xs font-extrabold ${favorite.saved ? 'text-rose-600' : 'text-ink-800'} ${className}`}>
    <Heart size={compact ? 16 : 17} fill={favorite.saved ? 'currentColor' : 'none'} />
    {!compact && (favorite.saved ? 'Saved' : 'Save')}
  </motion.button>;
}
