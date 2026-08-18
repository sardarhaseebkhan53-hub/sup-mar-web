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

/** Phase 16 — the validated, user-visible shape of an interpreted query. */
export type SearchIntentView = SearchIntent & { sortPreference?: SearchIntent['sort'] };

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

export type AiAnalysis = {
  summary?: string;
  labels?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidence?: number;
  raw?: string;
};

export type AiClassification = { label: string; confidence: number; alternatives?: Array<{ label: string; confidence: number }> };

export type AiExtractedAttributes = Record<string, string | number | boolean>;

/**
 * Phase 16 provider contract. QAVLIO is never coupled to one vendor: every method
 * has a deterministic local fallback so the marketplace keeps working when a
 * remote provider is unavailable, unconfigured, or disabled by an administrator.
 */
export interface AIProvider {
  name: AiProviderName;
  chat(options: AiGenerateOptions): Promise<string>;
  extractIntent(query: string, previous?: SearchIntent | null): Promise<SearchIntent>;
  generateText(prompt: string, system?: string): Promise<string>;
  analyzeText(text: string, instruction?: string): Promise<AiAnalysis>;
  generateEmbeddings(inputs: string[]): Promise<number[][]>;
  classify(text: string, labels: string[]): Promise<AiClassification>;
  extractAttributes(text: string, allowedKeys?: string[]): Promise<AiExtractedAttributes>;
  embeddingModel?: string;
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
  reason?: string;
  score?: number;
};

export type AiAction = {
  type: 'search' | 'open_listing' | 'support' | 'login' | 'sell' | 'apply_filter' | 'open_help' | 'browse' | 'compare';
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
  correction?: { original: string; suggestion: string } | null;
  unverified?: boolean;
};

export type AiUsage = {
  feature: string;
  provider: AiProviderName | string;
  model?: string;
  success: boolean;
  durationMs: number;
  inputChars?: number;
  outputChars?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
};
