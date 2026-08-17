// Resilient development fallback only. The category API is authoritative when
// available; production taxonomy, order, state, and attributes live in MongoDB.
export const categories = [
  { id: 'cat-cars', name: 'Cars', slug: 'cars', icon: 'CarFront', accent: 'violet', isActive: true, order: 1 },
  { id: 'cat-motorcycles', name: 'Motorcycles', slug: 'motorcycles', icon: 'Bike', accent: 'orange', isActive: true, order: 2 },
  { id: 'cat-mobiles', name: 'Mobiles', slug: 'mobiles', icon: 'Smartphone', accent: 'blue', isActive: true, order: 3 },
  { id: 'cat-electronics', name: 'Electronics', slug: 'electronics', icon: 'Tv', accent: 'cyan', isActive: true, order: 4 },
  { id: 'cat-computers', name: 'Computers & Laptops', shortName: 'Computers', slug: 'computers-laptops', icon: 'Laptop', accent: 'indigo', isActive: true, order: 5 },
  { id: 'cat-fashion', name: 'Fashion', slug: 'fashion', icon: 'Shirt', accent: 'pink', isActive: true, order: 6 },
  { id: 'cat-furniture', name: 'Furniture', slug: 'furniture', icon: 'Armchair', accent: 'amber', isActive: true, order: 7 },
  { id: 'cat-home-garden', name: 'Home & Garden', shortName: 'Home', slug: 'home-garden', icon: 'House', accent: 'emerald', isActive: true, order: 8 },
  { id: 'cat-property', name: 'Property', slug: 'property', icon: 'Building2', accent: 'emerald', isActive: true, order: 9 },
  { id: 'cat-animals', name: 'Animals', slug: 'animals', icon: 'PawPrint', accent: 'rose', isActive: true, order: 10 },
  { id: 'cat-jobs', name: 'Jobs', slug: 'jobs', icon: 'BriefcaseBusiness', accent: 'slate', isActive: true, order: 11 },
  { id: 'cat-services', name: 'Services', slug: 'services', icon: 'Wrench', accent: 'indigo', isActive: true, order: 12 },
  { id: 'cat-business', name: 'Business & Industrial', shortName: 'Business', slug: 'business-industrial', icon: 'Factory', accent: 'orange', isActive: true, order: 13 },
  { id: 'cat-books', name: 'Books & Education', shortName: 'Education', slug: 'books-education', icon: 'BookOpen', accent: 'blue', isActive: true, order: 14 },
  { id: 'cat-sports', name: 'Sports & Fitness', shortName: 'Sports', slug: 'sports-fitness', icon: 'Dumbbell', accent: 'cyan', isActive: true, order: 15 },
  { id: 'cat-kids', name: 'Kids & Baby', slug: 'kids-baby', icon: 'Baby', accent: 'amber', isActive: true, order: 16 },
  { id: 'cat-beauty', name: 'Beauty & Personal Care', shortName: 'Beauty', slug: 'beauty-personal-care', icon: 'Sparkles', accent: 'pink', isActive: true, order: 17 },
  { id: 'cat-tickets', name: 'Tickets & Events', shortName: 'Tickets', slug: 'tickets-events', icon: 'Ticket', accent: 'purple', isActive: true, order: 18 },
  { id: 'cat-other', name: 'Other', slug: 'other', icon: 'LayoutGrid', accent: 'purple', isActive: true, order: 19 },
];
