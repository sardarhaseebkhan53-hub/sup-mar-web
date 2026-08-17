import { useCategories } from '../../hooks/useCategories';
import type { Category } from '../../types/marketplace';
import CategoryCard from '../marketplace/CategoryCard';
import SectionHeading from '../ui/SectionHeading';

const previewSlugs = ['cars', 'motorcycles', 'mobiles', 'electronics', 'property', 'fashion', 'furniture', 'jobs', 'services', 'animals', 'sports-fitness', 'other'];

export default function CategoryExplorer() {
  const categories = useCategories() as Category[];
  const preview = previewSlugs.map((slug) => categories.find((category) => category.slug === slug)).filter((category): category is Category => Boolean(category)).map((category) => category.slug === 'other' ? { ...category, shortName: 'More' } : category);
  return <section className="container-shell section-space" aria-labelledby="category-explorer-title">
    <div id="category-explorer-title"><SectionHeading eyebrow="Browse by category" title="What are you looking for?" description="Start with a category, then narrow things down by location, price, and what matters to you." actionLabel="All categories" actionTo="/categories" /></div>
    <div className="hide-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 md:grid-cols-6 xl:grid-cols-12">{preview.map((category) => <div key={category.id} className="min-w-[142px] snap-start sm:min-w-0"><CategoryCard category={category} /></div>)}</div>
  </section>;
}
