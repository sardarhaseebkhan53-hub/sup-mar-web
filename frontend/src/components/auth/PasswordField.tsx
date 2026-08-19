import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> { label: string; error?: string; }
export default function PasswordField({ label, error, className, id, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false); const inputId = id || props.name;
  return <label className="block" htmlFor={inputId}><span className="mb-2 block text-xs font-extrabold">{label}</span><span className="relative block"><LockKeyhole size={17} className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" /><input id={inputId} type={visible ? 'text' : 'password'} className={cn('input-base px-11', error && 'border-rose-500', className)} aria-invalid={Boolean(error)} {...props} /><button type="button" onClick={() => setVisible((value) => !value)} className="absolute end-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></span>{error && <span className="mt-1 block text-[10px] text-rose-600" role="alert">{error}</span>}</label>;
}
