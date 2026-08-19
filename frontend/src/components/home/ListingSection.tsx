import { useTranslation } from '../../i18n';
import type { Listing, ListingCardVariant } from '../../types/marketplace';
import ListingCard from '../marketplace/ListingCard';
import SectionHeading from '../ui/SectionHeading';

interface ListingSectionProps {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  listings: Listing[];
  variant?: ListingCardVariant;
  promoted?: boolean;
}

export default function ListingSection({ id, eyebrow, title, description, listings, variant, promoted = false }: ListingSectionProps) {
  const { t } = useTranslation();
  return <section id={id} className={promoted ? 'border-y border-violet-100 bg-violet-50/70 py-12 sm:py-16' : 'pb-12 sm:pb-16'}>
    <div className="container-shell">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} actionLabel={t('home.viewAll')} actionTo={promoted ? '/marketplace?promoted=true' : '/marketplace?featured=true'} />
      {promoted && <p className="-mt-4 mb-5 inline-flex rounded-md bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-violet-200">{t('home.sponsoredNote')}</p>}
      <div className="hide-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">{listings.map((listing) => <div key={listing.id} className="min-w-[82%] snap-start sm:min-w-0"><ListingCard listing={listing} variant={variant} /></div>)}</div>
    </div>
  </section>;
}
