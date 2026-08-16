import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SectionHeading({ eyebrow, title, description, actionLabel = 'View all', actionTo = '/browse' }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-5">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>}
      </div>
      {actionLabel && (
        <Link to={actionTo} className="hidden shrink-0 items-center gap-1.5 text-sm font-extrabold text-violet-700 hover:text-violet-900 sm:inline-flex">
          {actionLabel}<ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
