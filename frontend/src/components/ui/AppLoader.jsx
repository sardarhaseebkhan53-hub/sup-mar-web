import React from 'react';
import brandMark from '../../assets/brand/qavlio-mark.svg';

export default function AppLoader() {
  return <div className="grid min-h-[50vh] place-items-center bg-surface" role="status" aria-label="Loading QAVLIO"><div className="text-center"><img src={brandMark} alt="" className="mx-auto h-14 w-14 animate-pulse" /><p className="mt-3 text-xs font-extrabold tracking-wide text-violet-700">Loading QAVLIO…</p></div></div>;
}
