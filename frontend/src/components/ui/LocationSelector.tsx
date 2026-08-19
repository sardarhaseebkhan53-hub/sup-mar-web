import { MapPin } from 'lucide-react';
import { useMarketplaceLocation } from '../../hooks/useMarketplaceLocation';
import { useTranslation } from '../../i18n';
import { cn } from '../../utils/cn';

interface LocationSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  compact?: boolean;
  className?: string;
  allowClear?: boolean;
}

export function LocationSelector({ value, onChange, compact = false, className, allowClear = true }: LocationSelectorProps) {
  const location = useMarketplaceLocation();
  const { t } = useTranslation();
  const current = value ?? location.label;
  const options = ['All Pakistan', ...location.cities.map((city) => city.name)];
  if (current && !options.includes(current)) options.splice(1, 0, current);
  return (
    <div className={cn('relative flex min-w-0 items-center', className)}>
      <span className="sr-only">{t('common.location')}</span>
      <MapPin size={compact ? 15 : 18} className="pointer-events-none absolute start-3 text-violet-600" />
      <select
        value={current || 'All Pakistan'}
        onChange={(event) => { const next = event.target.value; onChange?.(next); location.setCity(next); }}
        className={cn('w-full appearance-none bg-transparent ps-9 pe-5 font-bold text-ink-800 outline-none', compact ? 'h-10 text-xs' : 'h-12 text-sm')}
        aria-label={t('common.location')}
      >
        {options.map((item) => <option key={item}>{item}</option>)}
      </select>
      <div className="absolute end-0 top-full z-20 hidden w-max pt-1 group-focus-within:block" />
      {allowClear && (
        <div className="sr-only">
          <button type="button" onClick={() => { onChange?.('All Pakistan'); location.clear(); }}>Clear location</button>
          <button type="button" onClick={location.useApproximate}>Use current location</button>
        </div>
      )}
    </div>
  );
}
