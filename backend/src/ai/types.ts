export type AiProviderName = 'heuristic' | 'openai' | 'gemini';

export type SearchIntent = {
  category?: string;
  subcategory?: string;
  keywords?: string;
  brand?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
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

export interface AIProvider {
  name: AiProviderName;
  chat(options: AiGenerateOptions): Promise<string>;
  extractIntent(query: string, previous?: SearchIntent | null): Promise<SearchIntent>;
  generateText(prompt: string, system?: string): Promise<string>;
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
