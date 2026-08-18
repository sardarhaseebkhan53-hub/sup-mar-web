export type AiProviderName = 'heuristic' | 'openai' | 'gemini';

export type SearchIntent = {
  query?: string;
  category?: string;
  subcategory?: string;
  keywords?: string;
  brand?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  condition?: string[];
  location?: string;
  sort?: 'recommended' | 'newest' | 'price-asc' | 'price-desc' | 'most-viewed' | 'nearest';
  attributes?: Record<string, string | number | boolean>;
};

export type AiChatTurn = { role: 'user' | 'assistant' | 'system'; content: string };

export type AiToolName =
  | 'searchListings'
  | 'getListing'
  | 'compareListings'
  | 'getCategory'
  | 'getMarketplacePolicy'
  | 'getPaymentStatus'
  | 'createSupportTicket'
  | 'recommendListings'
  | 'getUserRecommendations';

export type AiToolCall = { name: AiToolName; arguments: Record<string, unknown> };

export type AiGenerateOptions = {
  system: string;
  messages: AiChatTurn[];
  json?: boolean;
  maxOutputTokens?: number;
};

/** Usage metrics captured when the provider reports them. Never includes prompt content. */
export type AiUsage = {
  provider: AiProviderName;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
};

export type AiTextResult = { text: string; usage: AiUsage };

export type AiClassifyResult = { label: string; confidence: number; usage?: AiUsage };

export type AiAttributeSuggestion = {
  attributes: Record<string, string>;
  confirmRequired: boolean;
  invented: false;
  note: string;
};

export interface AIProvider {
  name: AiProviderName;
  chat(options: AiGenerateOptions): Promise<string>;
  extractIntent(query: string, previous?: SearchIntent | null): Promise<SearchIntent>;
  generateText(prompt: string, system?: string): Promise<string>;
  /** Vector representation for semantic similarity. Heuristic default needs no external calls. */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  /** Map free text onto one of the supplied labels. */
  classify(text: string, labels: string[]): Promise<{ label: string; confidence: number }>;
  /** Extract structured listing attributes from seller-supplied text only. */
  extractAttributes(text: string): Promise<Record<string, string>>;
}

export type PublicAiListing = {
  publicId: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  condition?: string;
  location?: { city?: string; area?: string; province?: string };
  categorySlug?: string;
  subcategorySlug?: string;
  coverImage?: string | null;
  isPromoted?: boolean;
  seller?: { name?: string; username?: string } | null;
};

export type AiAction = {
  type: 'search' | 'open_listing' | 'support' | 'login' | 'sell' | 'apply_filter' | 'open_help' | 'browse';
  label: string;
  href?: string;
  payload?: Record<string, unknown>;
};

export type AiReply = {
  text: string;
  bullets?: string[];
  source?: string;
  listings?: PublicAiListing[];
  filters?: SearchIntent;
  suggestions?: string[];
  actions?: AiAction[];
  compare?: unknown;
  insight?: unknown;
  sellerAssist?: unknown;
  ticket?: unknown;
  unavailable?: boolean;
  fallbackSearch?: boolean;
  resultCount?: number;
};

/** A single removable/adjustable filter chip derived from AI intent — the user stays in control. */
export type AppliedAiFilter = {
  key: string;
  label: string;
  value: string;
  param: string;
  removable: boolean;
};

export type SearchCorrection = {
  original: string;
  suggestion: string;
};

export type ZeroResultSuggestions = {
  message: string;
  relatedCategories: Array<{ name: string; slug: string; href: string }>;
  similarSearches: string[];
  broaderPrice?: { label: string; href: string };
  nearbyLocations?: Array<{ label: string; href: string }>;
};
