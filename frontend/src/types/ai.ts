export interface AiListing {
  publicId: string;
  slug: string;
  title: string;
  price: number;
  currency?: string;
  condition?: string;
  location?: { city?: string; area?: string };
  categorySlug?: string;
  coverImage?: string | null;
  isPromoted?: boolean;
  seller?: { name?: string; username?: string } | null;
}

export interface AiAction {
  type: string;
  label: string;
  href?: string;
  payload?: Record<string, unknown>;
}

export interface AiReply {
  text: string;
  bullets?: string[];
  source?: string;
  listings?: AiListing[];
  filters?: Record<string, unknown>;
  suggestions?: string[];
  actions?: AiAction[];
  compare?: unknown;
  insight?: unknown;
  sellerAssist?: unknown;
  ticket?: unknown;
  unavailable?: boolean;
  fallbackSearch?: boolean;
  resultCount?: number;
}

export interface AiChatResponse {
  conversationId: string;
  reply: AiReply;
}

export interface AiSettingsPublic {
  enabled: boolean;
  features: {
    assistant: boolean;
    search: boolean;
    recommendations: boolean;
    listingAssistant: boolean;
    priceInsights?: boolean;
    support: boolean;
    moderation?: boolean;
  };
  providerConfigured?: boolean;
}

export interface AppliedAiFilter {
  key: string;
  label: string;
  value: string;
  param: string;
  removable: boolean;
}

export interface SearchCorrection {
  original: string;
  suggestion: string;
}

export interface ZeroResultSuggestions {
  message: string;
  relatedCategories: Array<{ name: string; slug: string; href: string }>;
  similarSearches: string[];
  broaderPrice?: { label: string; href: string };
  nearbyLocations?: Array<{ label: string; href: string }>;
}

export interface AiSearchResult {
  intent: Record<string, unknown>;
  query?: string;
  interpreted: string[];
  /** Transparent AI filter explanation (§54): "Showing N listings matching: …" */
  explanation?: string[];
  appliedFilters?: AppliedAiFilter[];
  correction?: SearchCorrection | null;
  synonymExpansions?: Array<{ alias: string; canonical: string }>;
  listings: AiListing[];
  total: number;
  empty: boolean;
  source?: string;
  message?: string;
  suggestions: Array<string | { label: string; payload: Record<string, string> }>;
  fallbackSearch?: boolean;
  zeroResult?: ZeroResultSuggestions;
  cached?: boolean;
}

export interface RecommendationSectionData {
  id: string;
  title: string;
  subtitle: string;
  personalized: boolean;
  basis?: string;
  listings: AiListing[];
}

export interface RecommendationSectionsResponse {
  sections: RecommendationSectionData[];
  personalized: boolean;
  coldStart: boolean;
}

export interface CompareRow {
  field: string;
  values: Array<string | number>;
}

export interface CompareResponse {
  listings: Array<{
    publicId: string;
    title: string;
    price: number;
    condition?: string;
    city?: string;
    area?: string;
    category?: string;
    attributes?: Record<string, string | number | boolean>;
    description?: string;
  }>;
  comparison: CompareRow[];
  completeness?: Array<{ publicId: string; listedFields: number }>;
  aiSummary?: string[];
  note?: string;
  source?: string;
}

export interface AiAttributeSuggestionData {
  attributes: Record<string, string>;
  confirmRequired: boolean;
  note: string;
}

export interface AiPriceInsightData {
  available: boolean;
  comparables: number;
  min?: number;
  max?: number;
  median?: number;
  typicalRange?: { lower: number; upper: number };
  stance?: string;
  source: string;
  note?: string;
  disclaimer?: string;
}

export interface AiQualityData {
  score: number;
  max: number;
  breakdown: Array<{ key: string; label: string; score: number; max: number; note: string }>;
  suggestions: string[];
  disclaimer: string;
}
