import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actionLabel?: string | null;
  actionTo?: string;
  inverse?: boolean;
}

export default function SectionHeading({ eyebrow, title, description, actionLabel = 'View all', actionTo = '/marketplace', inverse = false }: SectionHeadingProps) {
  return <div className="mb-6 flex items-end justify-between gap-5 sm:mb-8">
    <div>
      {eyebrow && <p className={`eyebrow mb-2 ${inverse ? '!text-gold-300' : ''}`}>{eyebrow}</p>}
      <h2 className={`section-title ${inverse ? '!text-white' : ''}`}>{title}</h2>
      {description && <p className={`mt-2 max-w-2xl text-sm leading-6 ${inverse ? 'text-white/60' : 'text-slate-600'}`}>{description}</p>}
    </div>
    {actionLabel && <Link to={actionTo} className={`hidden shrink-0 items-center gap-1.5 text-sm font-extrabold sm:inline-flex ${inverse ? 'text-gold-300 hover:text-white' : 'text-violet-700 hover:text-violet-900'}`}>{actionLabel}<ArrowRight size={16} /></Link>}
  </div>;
}
