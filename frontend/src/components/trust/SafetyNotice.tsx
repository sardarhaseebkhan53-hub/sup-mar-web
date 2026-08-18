import { ShieldAlert } from 'lucide-react';

export default function SafetyNotice({ title, text }: { title: string; text: string }) {
  return <aside className="rounded-card border border-amber-200 bg-amber-50 p-4 text-amber-950" role="note">
    <p className="flex items-center gap-2 text-xs font-extrabold"><ShieldAlert size={16} /> {title}</p>
    <p className="mt-1 text-xs leading-5">{text}</p>
  </aside>;
}
