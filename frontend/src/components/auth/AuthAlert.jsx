import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const variants = {
  error: { style: 'border-rose-200 bg-rose-50 text-rose-800', Icon: AlertCircle },
  success: { style: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: CheckCircle2 },
  info: { style: 'border-blue-200 bg-blue-50 text-blue-800', Icon: Info },
};

export default function AuthAlert({ type = 'error', title, children }) {
  const { style, Icon } = variants[type];
  return <div role={type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border p-3 text-xs ${style}`}><Icon size={17} className="mt-0.5 shrink-0" /><div><strong className="font-extrabold">{title}</strong>{children && <p className="mt-1 leading-5 opacity-80">{children}</p>}</div></div>;
}
