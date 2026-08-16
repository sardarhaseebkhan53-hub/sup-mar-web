export const DEFAULT_CATEGORIES = Object.freeze([
  { name: 'Cars', slug: 'cars', icon: 'CarFront', order: 1 },
  { name: 'Motorcycles', slug: 'motorcycles', icon: 'Bike', order: 2 },
  { name: 'Mobile Phones', slug: 'mobile-phones', icon: 'Smartphone', order: 3 },
  { name: 'Electronics', slug: 'electronics', icon: 'Laptop', order: 4 },
  { name: 'Property', slug: 'property', icon: 'Building2', order: 5 },
  { name: 'Furniture', slug: 'furniture', icon: 'Armchair', order: 6 },
  { name: 'Fashion', slug: 'fashion', icon: 'Shirt', order: 7 },
  { name: 'Services', slug: 'services', icon: 'Wrench', order: 8 },
  { name: 'Animals & Pets', slug: 'pets', icon: 'PawPrint', order: 9 },
  { name: 'Jobs', slug: 'jobs', icon: 'BriefcaseBusiness', order: 10 },
  { name: 'Other', slug: 'other', icon: 'LayoutGrid', order: 11 },
].map((category) => ({ ...category, isActive: true })));
