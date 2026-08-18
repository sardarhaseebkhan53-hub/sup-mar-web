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
  score?: number;
  reason?: string;
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
    support: boolean;
    moderation?: boolean;
    priceInsights?: boolean;
    semanticSearch?: boolean;
  };
  providerConfigured?: boolean;
}

/** A filter the AI extracted from natural language, shown to the user before it applies. */
export interface AiAppliedFilter {
  key: string;
  label: string;
  value: string;
  removable?: boolean;
}

/** Suggest-only spelling correction. QAVLIO never silently rewrites a query. */
export interface AiSearchCorrection {
  original: string;
  suggestion: string;
  applied: false;
}

export interface AiZeroResultRecovery {
  message: string;
  note?: string;
  relatedCategories?: Array<{ slug: string; name: string }>;
  broaderPrice?: { minPrice?: number; maxPrice?: number; label: string } | null;
  nearbyLocations?: string[];
  suggestedSearches?: string[];
}

export interface AiSearchResult {
  query?: string;
  intent: Record<string, unknown>;
  interpreted: string[];
  appliedFilters?: AiAppliedFilter[];
  searchParams?: Record<string, string>;
  listings: AiListing[];
  total: number;
  empty: boolean;
  source?: string;
  suggestions: Array<string | { label: string; payload: Record<string, string> }>;
  fallbackSearch?: boolean;
  semanticApplied?: boolean;
  relaxedFilters?: string[];
  correction?: AiSearchCorrection | null;
  explanation?: string;
  recovery?: AiZeroResultRecovery | null;
}

export interface AiRecommendationSection {
  id: string;
  title: string;
  basis: string;
  personalized: boolean;
  listings: AiListing[];
}

export interface AiRecommendationFeed {
  sections: AiRecommendationSection[];
  personalized: boolean;
  coldStart: boolean;
}

/* ------------------------------------------------------- seller assistance */

export type AiSuggestionState = 'idle' | 'applied' | 'dismissed';

export interface AiTitleSuggestion {
  action: 'title';
  suggestion: string;
  suggestions: string[];
  original: string;
  label: string;
  note: string;
  requiresApproval: boolean;
}

export interface AiDescriptionSuggestion {
  action: 'description';
  suggestion: string;
  original: string;
  missing: string[];
  questions: string[];
  label: string;
  note: string;
  requiresApproval: boolean;
}

export interface AiAttributeSuggestionItem {
  key: string;
  label: string;
  value: string | number | boolean;
  grounded: boolean;
  alreadySet: boolean;
  source: string;
}

export interface AiAttributeSuggestion {
  action: 'attributes';
  attributes: AiAttributeSuggestionItem[];
  missing: string[];
  label: string;
  note: string;
  requiresApproval: boolean;
}

export interface AiCategorySuggestion {
  action: 'category';
  category: { name: string; slug: string };
  subcategory: { name: string; slug: string } | null;
  path: string[];
  confidence: number;
  alternatives: Array<{ name: string; slug: string }>;
  confirmRequired: boolean;
  label: string;
  note: string;
}

export interface AiPriceInsightResult {
  action: 'price-insight';
  available: boolean;
  sampleSize: number;
  currency?: string;
  min?: number;
  max?: number;
  low?: number;
  high?: number;
  median?: number;
  yourPrice?: number | null;
  position?: 'below' | 'within' | 'above' | null;
  label: string;
  message: string;
  positionMessage?: string | null;
  note: string;
}

export interface AiQualityResult {
  action: 'quality';
  score: number;
  grade: string;
  breakdown: Array<{ id: string; label: string; earned: number; weight: number }>;
  improvements: string[];
  disclaimer: string;
}

export interface AiComparisonResult {
  listings: Array<Record<string, unknown>>;
  comparison: Array<{ field: string; label: string; values: string[] }>;
  observations: string[];
  maxItems: number;
  note: string;
  source: string;
}
