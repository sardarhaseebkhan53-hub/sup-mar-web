export type AlertFrequency = 'instant' | 'daily' | 'weekly';

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  categoryId: string;
  location: string;
  minPrice: number | null;
  maxPrice: number | null;
  condition: string;
  sort: string;
  alertEnabled: boolean;
  alertFrequency: AlertFrequency;
  lastMatchedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocationCity {
  slug: string;
  name: string;
  region: string;
  country: string;
  countryName: string;
}

export interface PriceDrop {
  amount: number;
  previousPrice: number;
  currentPrice: number;
  createdAt?: string;
}

export interface RecentSearchItem {
  id: string;
  query: string;
  filters: Record<string, unknown>;
  searchedAt: string;
}
