import React from 'react';
export default function DashboardHeading({ eyebrow, title, description, action }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{title}</h1>{description && <p className="mt-2 text-xs font-semibold text-slate-500 sm:text-sm">{description}</p>}</div>{action}</div>;
}
