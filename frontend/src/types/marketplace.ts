export type ListingCardVariant = 'default' | 'featured' | 'compact' | 'horizontal' | 'sponsored' | 'sold';

export interface SellerPreview {
  name: string;
  initials: string;
  rating: number;
  memberSince: string;
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  price: number;
  previousPrice?: number;
  currency: 'PKR';
  image: string;
  imageSrcSet: string;
  imageAlt: string;
  location: string;
  postedAt: string;
  category: string;
  condition: string;
  featured: boolean;
  sponsored: boolean;
  promotionLabel?: 'Sponsored' | 'Promoted' | 'Featured' | 'Urgent';
  promotionPlacement?: string;
  urgent?: boolean;
  verified: boolean;
  sold?: boolean;
  seller: SellerPreview;
  description?: string;
  discoveryTags: Array<'nearby' | 'new' | 'popular' | 'price-drop' | 'trending' | 'recommended'>;
}

export type CategoryAccent = 'violet' | 'orange' | 'blue' | 'cyan' | 'emerald' | 'amber' | 'pink' | 'indigo' | 'rose' | 'slate' | 'purple';

export interface Category {
  id: string;
  name: string;
  shortName?: string;
  slug: string;
  icon: string;
  accent: CategoryAccent;
  count?: number;
  isActive: boolean;
  order: number;
}
