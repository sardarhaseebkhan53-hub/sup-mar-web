import crypto from 'node:crypto';
import { MARKETPLACE_POLICIES } from '../../constants/aiPolicies.js';
import { extractHeuristicIntent } from '../intent.js';
import type { AIProvider, AiGenerateOptions, SearchIntent } from '../types.js';

export const HEURISTIC_EMBEDDING_DIMENSIONS = 256;

/**
 * Deterministic local provider — zero external calls, zero credentials.
 * Its hashed bag-of-tokens embedding is enough for similar-item ranking and keeps
 * QAVLIO functional (and testable) when no external AI provider is configured.
 */
export class HeuristicProvider implements AIProvider {
  name = 'heuristic' as const;

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

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map((text) => hashEmbedding(text));
  }

  async classify(text: string, labels: string[]) {
    const lower = ` ${text.toLowerCase()} `;
    let best = { label: labels[0] || '', confidence: 0 };
    for (const label of labels) {
      const needle = label.toLowerCase();
      if (lower.includes(needle)) {
        const confidence = Math.min(1, 0.6 + needle.split(/\s+/).length * 0.15);
        if (confidence > best.confidence) best = { label, confidence };
      }
    }
    return best;
  }

  async extractAttributes(text: string) {
    return heuristicAttributeExtraction(text);
  }
}

/** Stable, normalized bag-of-tokens vector. Same text always maps to the same vector. */
export function hashEmbedding(text: string): number[] {
  const vector = new Array<number>(HEURISTIC_EMBEDDING_DIMENSIONS).fill(0);
  const tokens = String(text || '').toLowerCase().split(/[^a-z0-9+]+/).filter((token) => token.length > 1 && token.length < 24);
  for (const token of tokens) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const digest = crypto.createHash('sha1').update(attempt === 0 ? token : `${token}#`).digest();
      const slot = digest.readUInt16BE(0) % HEURISTIC_EMBEDDING_DIMENSIONS;
      vector[slot] += attempt === 0 ? 1 : 0.5;
    }
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return vector;
  return vector.map((value) => value / norm);
}

const BRANDS = ['samsung', 'apple', 'iphone', 'xiaomi', 'oppo', 'vivo', 'infinix', 'tecno', 'huawei', 'oneplus', 'toyota', 'honda', 'suzuki', 'hyundai', 'kia', 'mg', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'apple macbook', 'sony', 'lg', 'haier', 'gree', 'pehladry'];
const MODELS = /\b(galaxy\s?[sna-z]?\d*\w*|iphone\s?\d{1,2}\s?(pro(?:\s?max)?|plus|mini)?|corolla|civic|city|alta?s|swift|cultus|mehran|fortuner|revo|cb\s?\d{3}[a-z]?|ybr|cg\s?\d{3}|macbook(?:\s?(?:air|pro))?|thinkpad|pavilion| Rog strix)\b/i;
const COLORS = ['black', 'white', 'blue', 'red', 'green', 'gold', 'silver', 'gray', 'grey', 'titanium', 'graphite', 'pink', 'purple'];

export function heuristicAttributeExtraction(text: string): Record<string, string> {
  const lower = String(text || '').toLowerCase();
  const found: Record<string, string> = {};

  const brand = BRANDS.find((name) => new RegExp(`\\b${name.split(' ')[0]}\\b`, 'i').test(lower));
  if (brand) found.brand = brand.charAt(0).toUpperCase() + brand.slice(1);
  if (/\biphone\b/i.test(lower)) found.brand = 'Apple';

  const model = lower.match(MODELS);
  if (model) found.model = model[1].replace(/\s+/g, ' ').trim().replace(/\b\w/g, (char) => char.toUpperCase());

  const storage = lower.match(/\b(\d{2,4})\s?(?:gb|tb)\b/);
  if (storage) found.storage = `${storage[1]}${storage[0].toLowerCase().endsWith('tb') ? 'TB' : 'GB'}`;

  const ram = lower.match(/\b(\d{1,3})\s?gb\s?(?:ram|memory)\b/) || (/\b(\d{1,3})\s?gb\b/.test(lower) && /\bram\b/.test(lower) ? lower.match(/\b(\d{1,3})\s?gb\b/) : null);
  if (ram) found.ram = `${ram[1]}GB`;

  const color = COLORS.find((shade) => new RegExp(`\\b${shade}\\b`, 'i').test(lower));
  if (color) found.color = color.charAt(0).toUpperCase() + color.slice(1);

  const year = lower.match(/\b(19[89]\d|20[0-3]\d)\b/);
  if (year) found.year = year[1];

  if (/\bautomatic\b/.test(lower)) found.transmission = 'Automatic';
  if (/\bmanual\b/.test(lower)) found.transmission = 'Manual';

  const mileage = lower.match(/\b(\d{2,3})(?:,000|000|k)\s?km\b/);
  if (mileage) found.mileage = `${mileage[1]},000 km`;

  for (const [key, value] of Object.entries(found)) {
    if (!value) delete found[key];
  }
  return found;
}
