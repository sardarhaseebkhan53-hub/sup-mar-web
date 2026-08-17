import type { Category } from '../types/marketplace';

// Phase 1 presentation fixtures. The category API remains authoritative when
// available; these records make the visual foundation resilient offline.
export const categories: Category[] = [
  { id: 'cat-cars', name: 'Cars', slug: 'cars', icon: 'CarFront', accent: 'violet', count: 12540, isActive: true, order: 1 },
  { id: 'cat-motorcycles', name: 'Motorcycles', slug: 'motorcycles', icon: 'Bike', accent: 'orange', count: 8320, isActive: true, order: 2 },
  { id: 'cat-mobiles', name: 'Mobiles', slug: 'mobiles', icon: 'Smartphone', accent: 'blue', count: 15670, isActive: true, order: 3 },
  { id: 'cat-electronics', name: 'Electronics', slug: 'electronics', icon: 'Tv', accent: 'cyan', count: 10240, isActive: true, order: 4 },
  { id: 'cat-computers', name: 'Computers & Laptops', shortName: 'Computers', slug: 'computers-laptops', icon: 'Laptop', accent: 'indigo', count: 6740, isActive: true, order: 5 },
  { id: 'cat-fashion', name: 'Fashion', slug: 'fashion', icon: 'Shirt', accent: 'pink', count: 9210, isActive: true, order: 6 },
  { id: 'cat-furniture', name: 'Furniture', slug: 'furniture', icon: 'Armchair', accent: 'amber', count: 5430, isActive: true, order: 7 },
  { id: 'cat-home-garden', name: 'Home & Garden', shortName: 'Home', slug: 'home-garden', icon: 'House', accent: 'emerald', count: 4640, isActive: true, order: 8 },
  { id: 'cat-property', name: 'Property', slug: 'property', icon: 'Building2', accent: 'emerald', count: 7850, isActive: true, order: 9 },
  { id: 'cat-animals', name: 'Animals', slug: 'animals', icon: 'PawPrint', accent: 'rose', count: 3140, isActive: true, order: 10 },
  { id: 'cat-jobs', name: 'Jobs', slug: 'jobs', icon: 'BriefcaseBusiness', accent: 'slate', count: 2080, isActive: true, order: 11 },
  { id: 'cat-services', name: 'Services', slug: 'services', icon: 'Wrench', accent: 'indigo', count: 4270, isActive: true, order: 12 },
  { id: 'cat-business', name: 'Business & Industrial', shortName: 'Business', slug: 'business-industrial', icon: 'Factory', accent: 'orange', count: 1880, isActive: true, order: 13 },
  { id: 'cat-books', name: 'Books & Education', shortName: 'Education', slug: 'books-education', icon: 'BookOpen', accent: 'blue', count: 3590, isActive: true, order: 14 },
  { id: 'cat-sports', name: 'Sports & Fitness', shortName: 'Sports', slug: 'sports-fitness', icon: 'Dumbbell', accent: 'cyan', count: 2960, isActive: true, order: 15 },
  { id: 'cat-kids', name: 'Kids & Baby', slug: 'kids-baby', icon: 'Baby', accent: 'amber', count: 3370, isActive: true, order: 16 },
  { id: 'cat-beauty', name: 'Beauty & Personal Care', shortName: 'Beauty', slug: 'beauty-personal-care', icon: 'Sparkles', accent: 'pink', count: 4110, isActive: true, order: 17 },
  { id: 'cat-tickets', name: 'Tickets & Events', shortName: 'Tickets', slug: 'tickets-events', icon: 'Ticket', accent: 'purple', count: 780, isActive: true, order: 18 },
  { id: 'cat-other', name: 'Other', slug: 'other', icon: 'LayoutGrid', accent: 'purple', count: 6880, isActive: true, order: 19 },
];
