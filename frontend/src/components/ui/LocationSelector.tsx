import { MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';

const locations = ['Rawalpindi', 'Islamabad', 'Lahore', 'Karachi', 'Peshawar', 'All Pakistan'];
interface LocationSelectorProps { value: string; onChange: (value: string) => void; compact?: boolean; className?: string; }
export function LocationSelector({ value, onChange, compact = false, className }: LocationSelectorProps) {
  return <label className={cn('relative flex items-center', className)}>
    <span className="sr-only">Location</span><MapPin size={compact ? 15 : 18} className="pointer-events-none absolute left-3 text-violet-600" />
    <select value={value} onChange={(event) => onChange(event.target.value)} className={cn('w-full appearance-none bg-transparent pl-9 pr-5 font-bold text-ink-800 outline-none', compact ? 'h-10 text-xs' : 'h-12 text-sm')}>
      {locations.map((location) => <option key={location}>{location}</option>)}
    </select>
  </label>;
}
