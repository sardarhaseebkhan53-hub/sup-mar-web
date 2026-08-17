// Development bootstrap only. Once MongoDB is connected, the active taxonomy is read
// from Category records and can be managed without a frontend release.
export const DEFAULT_CATEGORIES = Object.freeze([
  { name: 'Cars', slug: 'cars', icon: 'CarFront', order: 1 },
  { name: 'Motorcycles', slug: 'motorcycles', icon: 'Bike', order: 2 },
  { name: 'Mobiles', slug: 'mobiles', icon: 'Smartphone', order: 3 },
  { name: 'Electronics', slug: 'electronics', icon: 'Tv', order: 4 },
  { name: 'Computers & Laptops', slug: 'computers-laptops', icon: 'Laptop', order: 5 },
  { name: 'Fashion', slug: 'fashion', icon: 'Shirt', order: 6 },
  { name: 'Furniture', slug: 'furniture', icon: 'Armchair', order: 7 },
  { name: 'Home & Garden', slug: 'home-garden', icon: 'House', order: 8 },
  { name: 'Property', slug: 'property', icon: 'Building2', order: 9 },
  { name: 'Animals', slug: 'animals', icon: 'PawPrint', order: 10 },
  { name: 'Jobs', slug: 'jobs', icon: 'BriefcaseBusiness', order: 11 },
  { name: 'Services', slug: 'services', icon: 'Wrench', order: 12 },
  { name: 'Business & Industrial', slug: 'business-industrial', icon: 'Factory', order: 13 },
  { name: 'Books & Education', slug: 'books-education', icon: 'BookOpen', order: 14 },
  { name: 'Sports & Fitness', slug: 'sports-fitness', icon: 'Dumbbell', order: 15 },
  { name: 'Kids & Baby', slug: 'kids-baby', icon: 'Baby', order: 16 },
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', icon: 'Sparkles', order: 17 },
  { name: 'Tickets & Events', slug: 'tickets-events', icon: 'Ticket', order: 18 },
  { name: 'Other', slug: 'other', icon: 'LayoutGrid', order: 19 },
].map((category) => ({ ...category, isActive: true })));
