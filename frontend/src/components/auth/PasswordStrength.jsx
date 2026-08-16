import React from 'react';
import { Check, Circle } from 'lucide-react';

export default function PasswordStrength({ password, label }) {
  const checks = [password.length >= 10, /[A-Z]/.test(password), /[a-z]/.test(password), /\d/.test(password)];
  const score = checks.filter(Boolean).length;
  return <div className="mt-2" aria-live="polite"><div className="flex gap-1">{checks.map((passed, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index < score ? (score < 3 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-slate-200'}`} />)}</div><p className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-slate-500">{score === 4 ? <Check size={11} className="text-emerald-600" /> : <Circle size={8} />} {label}</p></div>;
}
