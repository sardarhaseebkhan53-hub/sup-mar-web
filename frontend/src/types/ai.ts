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
    support: boolean;
  };
  providerConfigured?: boolean;
}

export interface AiSearchResult {
  intent: Record<string, unknown>;
  interpreted: string[];
  listings: AiListing[];
  total: number;
  empty: boolean;
  source?: string;
  suggestions: Array<string | { label: string; payload: Record<string, string> }>;
  fallbackSearch?: boolean;
}
