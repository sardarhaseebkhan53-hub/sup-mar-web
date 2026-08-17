import { Check, Circle } from 'lucide-react';

interface PasswordStrengthProps { password: string; label?: string; }
export const passwordChecks = (password: string) => [
  { label: '10+ characters', passed: password.length >= 10 }, { label: 'uppercase', passed: /[A-Z]/.test(password) },
  { label: 'lowercase', passed: /[a-z]/.test(password) }, { label: 'number', passed: /\d/.test(password) }, { label: 'special character', passed: /[^A-Za-z0-9]/.test(password) },
];
export default function PasswordStrength({ password, label = 'Use uppercase, lowercase, a number, and a special character.' }: PasswordStrengthProps) {
  const checks = passwordChecks(password); const score = checks.filter((item) => item.passed).length;
  return <div className="mt-2" aria-live="polite"><div className="flex gap-1">{checks.map((item, index) => <span key={item.label} className={`h-1 flex-1 rounded-full ${index < score ? (score < 4 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-slate-200'}`} />)}</div><p className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-slate-500">{score === checks.length ? <Check size={11} className="text-emerald-600" /> : <Circle size={8} />} {label}</p></div>;
}
