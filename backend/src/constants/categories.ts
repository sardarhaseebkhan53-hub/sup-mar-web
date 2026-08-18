// Offline development taxonomy mirrors database records. In connected environments
// MongoDB remains authoritative and Admin can reorder, disable, or extend this tree.
export const DEFAULT_CATEGORIES = Object.freeze([
  { name: 'Vehicles', slug: 'vehicles', icon: 'CarFront', order: 1, description: 'Cars, motorcycles, bicycles, parts and commercial vehicles.' },
  { name: 'Mobiles & Tablets', slug: 'mobiles', icon: 'Smartphone', order: 2, description: 'Phones, tablets, watches and mobile accessories.' },
  { name: 'Electronics', slug: 'electronics', icon: 'Tv', order: 3, description: 'TVs, cameras, audio, gaming and home appliances.' },
  { name: 'Computers', slug: 'computers-laptops', icon: 'Laptop', order: 4, description: 'Laptops, desktops, displays, accessories and networking.' },
  { name: 'Fashion', slug: 'fashion', icon: 'Shirt', order: 5, description: 'Fashion, footwear, watches, bags and accessories.' },
  { name: 'Home & Furniture', slug: 'furniture', icon: 'Armchair', order: 6, description: 'Furniture, decor, kitchen, garden and appliances.' },
  { name: 'Property', slug: 'property', icon: 'Building2', order: 7, description: 'Homes, apartments, plots and commercial property.' },
  { name: 'Animals', slug: 'animals', icon: 'PawPrint', order: 8, description: 'Pets, birds, livestock and animal accessories.' },
  { name: 'Jobs', slug: 'jobs', icon: 'BriefcaseBusiness', order: 9, description: 'Full-time, part-time, freelance, remote and internships.' },
  { name: 'Services', slug: 'services', icon: 'Wrench', order: 10, description: 'Local professionals, repair, education, design and business services.' },
  { name: 'Other', slug: 'other', icon: 'LayoutGrid', order: 11, description: 'Books, sports, kids, tickets and everything else.' },
].map((category) => ({ ...category, parentId: null, isActive: true })));
