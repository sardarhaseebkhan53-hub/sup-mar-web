/**
 * Phase 16 — controlled marketplace vocabulary.
 *
 * Every mapping here is curated by QAVLIO, never produced by a model. AI may only
 * *select* from these values; it can never invent a category, brand, or filter key.
 */

/** Buyer wording → QAVLIO wording. Used for query expansion, never silent rewriting. */
export const SEARCH_SYNONYMS: Record<string, string[]> = {
  mobile: ['smartphone', 'phone', 'cell phone'],
  smartphone: ['mobile', 'phone'],
  bike: ['motorcycle', 'motorbike'],
  motorcycle: ['bike', 'motorbike'],
  laptop: ['notebook', 'laptop computer'],
  notebook: ['laptop'],
  pc: ['desktop', 'computer'],
  tv: ['television', 'smart tv'],
  fridge: ['refrigerator'],
  ac: ['air conditioner'],
  sofa: ['couch', 'settee'],
  car: ['vehicle', 'automobile'],
  flat: ['apartment'],
  plot: ['land'],
  cycle: ['bicycle'],
  gpu: ['graphics card'],
  console: ['gaming console'],
};

/** Common misspellings → canonical marketplace spelling. Suggested, never applied silently. */
export const SPELLING_CORRECTIONS: Record<string, string> = {
  iphon: 'iPhone',
  iphonr: 'iPhone',
  ifone: 'iPhone',
  iphne: 'iPhone',
  aiphone: 'iPhone',
  samsng: 'Samsung',
  samsang: 'Samsung',
  samung: 'Samsung',
  laptap: 'laptop',
  laptob: 'laptop',
  labtop: 'laptop',
  lapto: 'laptop',
  moblie: 'mobile',
  mobil: 'mobile',
  mobie: 'mobile',
  corrola: 'Corolla',
  corola: 'Corolla',
  corrolla: 'Corolla',
  toyta: 'Toyota',
  toyata: 'Toyota',
  hnda: 'Honda',
  hodna: 'Honda',
  sozuki: 'Suzuki',
  suzki: 'Suzuki',
  islamabd: 'Islamabad',
  islmabad: 'Islamabad',
  islamabaad: 'Islamabad',
  lahor: 'Lahore',
  lahoore: 'Lahore',
  karchi: 'Karachi',
  karachee: 'Karachi',
  rawalpndi: 'Rawalpindi',
  pindi: 'Rawalpindi',
  furnitur: 'furniture',
  furnture: 'furniture',
  sofaa: 'sofa',
  gamming: 'gaming',
  gamin: 'gaming',
  macbok: 'MacBook',
  macbuk: 'MacBook',
  xiomi: 'Xiaomi',
  xaomi: 'Xiaomi',
  huwaei: 'Huawei',
  huawie: 'Huawei',
  vivi: 'Vivo',
  opoo: 'Oppo',
  refurbised: 'refurbished',
  refurbisehd: 'refurbished',
  aparment: 'apartment',
  appartment: 'apartment',
};

/** Vocabulary used for fuzzy "did you mean" suggestions when no exact rule matches. */
export const MARKETPLACE_VOCABULARY = Object.freeze([
  'iPhone', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Huawei', 'OnePlus', 'Google Pixel', 'MacBook', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer',
  'Toyota', 'Honda', 'Suzuki', 'Kia', 'Hyundai', 'Corolla', 'Civic', 'Alto', 'Cultus', 'Yaris', 'Sportage',
  'laptop', 'mobile', 'smartphone', 'tablet', 'motorcycle', 'bicycle', 'furniture', 'sofa', 'dining table', 'wardrobe',
  'refrigerator', 'air conditioner', 'television', 'camera', 'gaming', 'desktop', 'monitor', 'headphones', 'smartwatch',
  'apartment', 'house', 'plot', 'office', 'shop',
  'Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Gujranwala', 'Sialkot', 'Hyderabad', 'Abbottabad',
]);

/**
 * Attribute keys the AI listing assistant may propose per category. Anything outside
 * this allow-list is discarded, so a model can never invent a new listing field.
 */
export const CATEGORY_ATTRIBUTE_KEYS: Record<string, string[]> = {
  mobiles: ['brand', 'model', 'storage', 'ram', 'color', 'condition'],
  'computers-laptops': ['brand', 'model', 'ram', 'storage', 'storageType', 'gpu', 'processor', 'screenSize', 'color', 'useCase'],
  electronics: ['brand', 'model', 'screenSize', 'color', 'warranty'],
  cars: ['make', 'model', 'year', 'transmission', 'fuel', 'mileage', 'color', 'engineCapacity'],
  vehicles: ['make', 'model', 'year', 'transmission', 'fuel', 'mileage', 'color'],
  motorcycles: ['make', 'model', 'year', 'engineCapacity', 'mileage', 'color'],
  furniture: ['material', 'color', 'seats', 'dimensions'],
  fashion: ['brand', 'size', 'color', 'material'],
  property: ['propertyType', 'bedrooms', 'bathrooms', 'area', 'purpose', 'furnished'],
  animals: ['breed', 'age'],
  jobs: ['employmentType', 'remote', 'experience'],
  services: ['providerType', 'experience'],
  other: ['brand', 'model', 'color', 'material'],
};

/** Known values used to *validate* extracted attributes against real marketplace vocabulary. */
export const ATTRIBUTE_VALUE_HINTS: Record<string, string[]> = {
  brand: ['Apple', 'Samsung', 'Xiaomi', 'Google', 'OnePlus', 'Oppo', 'Vivo', 'Huawei', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Sony', 'LG', 'Canon', 'Nikon', 'Infinix', 'Tecno', 'Realme', 'Nothing'],
  make: ['Toyota', 'Honda', 'Suzuki', 'Kia', 'Hyundai', 'Nissan', 'Daihatsu', 'MG', 'Changan'],
  transmission: ['Automatic', 'Manual'],
  fuel: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'],
  storage: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'],
  ram: ['4GB', '6GB', '8GB', '12GB', '16GB', '24GB', '32GB', '64GB'],
  storageType: ['SSD', 'HDD', 'NVMe'],
  color: ['Black', 'White', 'Silver', 'Grey', 'Blue', 'Red', 'Green', 'Gold', 'Purple', 'Titanium', 'Beige', 'Brown'],
  propertyType: ['House', 'Apartment', 'Plot', 'Commercial'],
  purpose: ['Sale', 'Rent'],
  employmentType: ['Full Time', 'Part Time', 'Freelance', 'Internship'],
  providerType: ['Individual', 'Business'],
  useCase: ['Gaming', 'Business', 'Student', 'Design'],
  material: ['Wood', 'Leather', 'Fabric', 'Metal', 'Glass', 'Plastic', 'Oak', 'Velvet'],
};

/** Category suggestion keyword map (curated, deterministic, auditable). */
export const CATEGORY_KEYWORDS: Array<{ category: string; subcategory?: string; keywords: string[] }> = [
  { category: 'mobiles', subcategory: 'mobile-phones', keywords: ['iphone', 'galaxy', 'smartphone', 'mobile phone', 'android phone', 'pixel', 'redmi', 'infinix'] },
  { category: 'mobiles', subcategory: 'tablets', keywords: ['ipad', 'tablet'] },
  { category: 'mobiles', subcategory: 'smart-watches', keywords: ['smart watch', 'smartwatch', 'apple watch'] },
  { category: 'computers-laptops', subcategory: 'laptops', keywords: ['laptop', 'macbook', 'notebook', 'thinkpad', 'ultrabook'] },
  { category: 'computers-laptops', subcategory: 'desktop-computers', keywords: ['gaming pc', 'desktop pc', 'desktop computer', 'ryzen', 'rtx', 'tower pc', 'workstation'] },
  { category: 'computers-laptops', subcategory: 'monitors', keywords: ['monitor', 'display panel'] },
  { category: 'electronics', subcategory: 'tvs', keywords: ['smart tv', 'led tv', 'television'] },
  { category: 'electronics', subcategory: 'cameras', keywords: ['dslr', 'camera', 'mirrorless'] },
  { category: 'electronics', subcategory: 'gaming', keywords: ['playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'console'] },
  { category: 'cars', keywords: ['corolla', 'civic', 'city aspire', 'yaris', 'alto', 'cultus', 'sedan', 'hatchback', 'suv', 'car'] },
  { category: 'motorcycles', keywords: ['motorcycle', 'motorbike', 'cd 70', 'cb 150', 'scooty'] },
  { category: 'furniture', keywords: ['sofa', 'dining table', 'wardrobe', 'bed set', 'chair', 'couch', 'furniture'] },
  { category: 'property', keywords: ['apartment', 'house for', 'plot', 'flat for', 'commercial shop', 'marla', 'kanal'] },
  { category: 'fashion', keywords: ['shirt', 'shoes', 'handbag', 'watch strap', 'jacket', 'dress'] },
  { category: 'animals', keywords: ['puppy', 'kitten', 'parrot', 'goat', 'cow', 'aquarium fish'] },
  { category: 'jobs', keywords: ['hiring', 'vacancy', 'job opening', 'recruitment'] },
  { category: 'services', keywords: ['repair service', 'plumber', 'electrician', 'tutor', 'movers'] },
];

/** Human-friendly labels for AI search explanation chips. */
export const FILTER_LABELS: Record<string, string> = {
  category: 'Category',
  subcategory: 'Subcategory',
  keywords: 'Keywords',
  brand: 'Brand',
  model: 'Model',
  minPrice: 'Minimum price',
  maxPrice: 'Maximum price',
  minYear: 'From year',
  maxYear: 'To year',
  condition: 'Condition',
  location: 'Location',
  sort: 'Sort',
  sortPreference: 'Sort',
};
