import CategoryCard from '../components/marketplace/CategoryCard';
import SearchBar from '../components/layout/SearchBar';
import { useCategories } from '../hooks/useCategories';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Seo } from '../seo/Seo';
import type { Category } from '../types/marketplace';

export default function CategoriesPage() {
  const categories = useCategories() as Category[];
  useDocumentTitle('Categories');
  return <div className="container-shell py-8 sm:py-12"><Seo title="Browse Categories" description="Explore every QAVLIO marketplace category — cars, mobile phones, electronics, furniture, property and more." canonicalPath="/categories" /><header className="max-w-3xl"><p className="eyebrow">Browse QAVLIO</p><h1 className="mt-2 text-h1 text-ink-950">Explore all categories</h1><p className="mt-3 text-body-lg text-slate-600">From everyday essentials to specialist services, start with the category that fits what you need.</p></header><div className="mt-7 max-w-4xl"><SearchBar variant="hero" /></div><section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" aria-label="All marketplace categories">{categories.map((category) => <CategoryCard key={category.id} category={category} />)}</section></div>;
}
