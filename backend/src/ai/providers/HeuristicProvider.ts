import { MARKETPLACE_POLICIES } from '../../constants/aiPolicies.js';
import { ATTRIBUTE_VALUE_HINTS, CATEGORY_ATTRIBUTE_KEYS } from '../../constants/marketplaceLexicon.js';
import { LOCAL_EMBEDDING_MODEL, localEmbedding, tokenize } from '../embeddings.js';
import { extractHeuristicIntent } from '../intent.js';
import type { AIProvider, AiAnalysis, AiClassification, AiExtractedAttributes, AiGenerateOptions, SearchIntent } from '../types.js';

const POSITIVE = ['excellent', 'great', 'perfect', 'clean', 'mint', 'new', 'genuine', 'warranty', 'maintained'];
const NEGATIVE = ['damaged', 'broken', 'faulty', 'scratched', 'repair', 'cracked', 'dented', 'issue', 'fault'];

/**
 * Deterministic local provider. It requires no API key, never leaves the server,
 * and guarantees QAVLIO's AI surfaces keep working when no remote provider is
 * configured or when a provider call fails.
 */
export class HeuristicProvider implements AIProvider {
  name = 'heuristic' as const;
  embeddingModel = LOCAL_EMBEDDING_MODEL;

  async chat(options: AiGenerateOptions) {
    const last = [...options.messages].reverse().find((item) => item.role === 'user')?.content || '';
    return last.slice(0, 800);
  }

  async extractIntent(query: string, previous?: SearchIntent | null) {
    return extractHeuristicIntent(query, previous);
  }

  async generateText(prompt: string, system = '') {
    const text = `${system}\n${prompt}`.toLowerCase();
    if (text.includes('title')) return '';
    if (text.includes('policy')) return MARKETPLACE_POLICIES.role;
    return '';
  }

  async analyzeText(text: string): Promise<AiAnalysis> {
    const tokens = tokenize(text);
    const positive = tokens.filter((token) => POSITIVE.includes(token)).length;
    const negative = tokens.filter((token) => NEGATIVE.includes(token)).length;
    return {
      summary: '',
      labels: [...new Set(tokens.filter((token) => token.length > 3))].slice(0, 8),
      sentiment: positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral',
      confidence: tokens.length ? Math.min(1, (positive + negative) / Math.max(4, tokens.length)) : 0,
    };
  }

  async generateEmbeddings(inputs: string[]) {
    return inputs.map((input) => localEmbedding(input));
  }

  async classify(text: string, labels: string[]): Promise<AiClassification> {
    const tokens = new Set(tokenize(text));
    const scored = labels.map((label) => {
      const parts = tokenize(label.replace(/[-_]/g, ' '));
      const hits = parts.filter((part) => tokens.has(part)).length;
      return { label, confidence: parts.length ? hits / parts.length : 0 };
    }).sort((a, b) => b.confidence - a.confidence);
    return { label: scored[0]?.label || labels[0] || '', confidence: scored[0]?.confidence || 0, alternatives: scored.slice(1, 4) };
  }

  async extractAttributes(text: string, allowedKeys?: string[]): Promise<AiExtractedAttributes> {
    const allowed = new Set(allowedKeys?.length ? allowedKeys : Object.values(CATEGORY_ATTRIBUTE_KEYS).flat());
    const found: AiExtractedAttributes = {};
    const lower = String(text || '').toLowerCase();

    for (const [key, values] of Object.entries(ATTRIBUTE_VALUE_HINTS)) {
      if (!allowed.has(key)) continue;
      const match = values.find((value) => new RegExp(`\\b${value.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower));
      if (match) found[key] = match;
    }

    if (allowed.has('storage')) {
      const storage = lower.match(/\b(32|64|128|256|512)\s*gb\b/) || lower.match(/\b(1|2)\s*tb\b/);
      if (storage) found.storage = /tb/.test(storage[0]) ? `${storage[1]}TB` : `${storage[1]}GB`;
    }
    if (allowed.has('ram')) {
      const ram = lower.match(/\b(4|6|8|12|16|24|32|64)\s*gb\s*(?:of\s*)?ram\b/);
      if (ram) found.ram = `${ram[1]}GB`;
    }
    if (allowed.has('year')) {
      const year = lower.match(/\b(19[89]\d|20[0-4]\d)\b/);
      if (year) found.year = Number(year[1]);
    }
    if (allowed.has('mileage')) {
      const mileage = lower.match(/\b([\d,]{3,9})\s*(?:km|kms|kilometers)\b/);
      if (mileage) found.mileage = Number(mileage[1].replace(/,/g, ''));
    }
    if (allowed.has('engineCapacity')) {
      const cc = lower.match(/\b(\d{2,4})\s*cc\b/);
      if (cc) found.engineCapacity = `${cc[1]}cc`;
    }
    if (allowed.has('bedrooms')) {
      const bedrooms = lower.match(/\b(\d{1,2})\s*(?:bed|bedroom|bhk)\b/);
      if (bedrooms) found.bedrooms = Number(bedrooms[1]);
    }
    if (allowed.has('screenSize')) {
      const size = lower.match(/\b(\d{2}(?:\.\d)?)\s*(?:inch|")\b/);
      if (size) found.screenSize = `${size[1]} inch`;
    }
    if (allowed.has('model')) {
      const CANONICAL_CASE = (value: string) => value
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .replace(/\bIphone\b/g, 'iPhone')
        .replace(/\bMacbook\b/g, 'MacBook')
        .replace(/\bThinkpad\b/g, 'ThinkPad');
      // The qualifier after a model name must not be another model name, otherwise
      // "iphone\niPhone 13" collapses into the nonsense model "iPhone iPhone".
      const MODEL_NAMES = '(?:iphone|galaxy|pixel|macbook|thinkpad|pavilion|corolla|civic|city|yaris|alto)';
      // ...and it must not swallow a capacity/spec token like "16gb" or "256tb",
      // which belongs in `ram`/`storage`, not in the model name.
      const pattern = new RegExp(`\\b${MODEL_NAMES}[ \t]*((?!${MODEL_NAMES}\\b)(?!\\d+\\s*(?:gb|tb|mb)\\b)[a-z0-9]{1,10}(?:[ \t]*(?:pro|max|plus|ultra|air|altis|aspire))*)?`, 'g');
      // Prefer the most specific mention ("iPhone 13" over a bare "iphone" in the title).
      const best = [...lower.matchAll(pattern)].map((match) => match[0].replace(/\s+/g, ' ').trim()).sort((a, b) => b.length - a.length)[0];
      if (best) found.model = CANONICAL_CASE(best);
    }
    return found;
  }
}
