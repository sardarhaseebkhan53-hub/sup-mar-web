export type FilterDefinition = {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'number' | 'boolean';
  options?: string[];
};

const common: FilterDefinition[] = [
  { key: 'condition', label: 'Condition', type: 'multiselect', options: ['new', 'like-new', 'used', 'refurbished'] },
  { key: 'listingType', label: 'Seller type', type: 'select', options: ['individual', 'business'] },
];

export const CATEGORY_FILTERS: Record<string, FilterDefinition[]> = {
  cars: [
    { key: 'make', label: 'Make', type: 'select', options: ['Toyota', 'Honda', 'Suzuki', 'Kia', 'Hyundai'] },
    { key: 'year', label: 'Year', type: 'number' },
    { key: 'fuel', label: 'Fuel', type: 'select', options: ['Petrol', 'Diesel', 'Hybrid', 'Electric'] },
    { key: 'transmission', label: 'Transmission', type: 'select', options: ['Automatic', 'Manual'] },
  ],
  mobiles: [
    { key: 'brand', label: 'Brand', type: 'select', options: ['Apple', 'Samsung', 'Xiaomi', 'Google', 'OnePlus'] },
    { key: 'storage', label: 'Storage', type: 'select', options: ['64GB', '128GB', '256GB', '512GB'] },
  ],
  electronics: [{ key: 'brand', label: 'Brand', type: 'select', options: ['Samsung', 'Sony', 'LG', 'Canon'] }, { key: 'warranty', label: 'Warranty', type: 'boolean' }],
  property: [{ key: 'propertyType', label: 'Property type', type: 'select', options: ['House', 'Apartment', 'Plot', 'Commercial'] }, { key: 'bedrooms', label: 'Bedrooms', type: 'number' }, { key: 'purpose', label: 'Purpose', type: 'select', options: ['Sale', 'Rent'] }],
  jobs: [{ key: 'employmentType', label: 'Employment type', type: 'select', options: ['Full Time', 'Part Time', 'Freelance', 'Internship'] }, { key: 'remote', label: 'Remote', type: 'boolean' }],
  services: [{ key: 'providerType', label: 'Provider type', type: 'select', options: ['Individual', 'Business'] }],
};

export function filtersForCategory(slug?: string) {
  return [...common, ...(slug ? CATEGORY_FILTERS[slug] || [] : [])];
}

export const SUBCATEGORIES: Record<string, string[]> = {
  vehicles: ['Cars', 'Motorcycles', 'Bicycles', 'Commercial Vehicles', 'Auto Parts', 'Accessories'],
  cars: ['Toyota', 'Honda', 'Suzuki', 'Kia', 'Hyundai', 'Other'],
  motorcycles: ['Honda', 'Yamaha', 'Suzuki', 'Road Prince', 'Other'],
  mobiles: ['Mobile Phones', 'Tablets', 'Accessories', 'Smart Watches'],
  electronics: ['TVs', 'Cameras', 'Audio', 'Gaming', 'Home Appliances', 'Other Electronics'],
  'computers-laptops': ['Laptops', 'Desktop Computers', 'Monitors', 'Computer Accessories', 'Networking'],
  fashion: ["Men's Fashion", "Women's Fashion", 'Shoes', 'Bags', 'Watches', 'Accessories'],
  furniture: ['Furniture', 'Home Decor', 'Kitchen', 'Garden', 'Appliances'],
  property: ['Houses', 'Apartments', 'Plots', 'Commercial Property', 'Rent', 'Sale'],
  animals: ['Pets', 'Birds', 'Livestock', 'Accessories'],
  jobs: ['Full Time', 'Part Time', 'Freelance', 'Remote', 'Internships'],
  services: ['Freelancers', 'Home Services', 'Repair', 'Education', 'Design', 'Business Services'],
  other: ['Books', 'Sports', 'Kids & Baby', 'Tickets & Events', 'Other Items'],
};

export const slugify = (value: string) => value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
