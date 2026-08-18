/**
 * Deterministic, dependency-free text embedding used by the local heuristic
 * provider and as the fallback whenever a remote embedding provider is not
 * configured. It is a hashed bag-of-bigrams projection: stable across restarts,
 * cheap to compute, and good enough for "more like this" retrieval.
 *
 * No provider secret is ever required or stored to produce these vectors.
 */
export const LOCAL_EMBEDDING_DIMENSIONS = 128;
export const LOCAL_EMBEDDING_MODEL = 'qavlio-local-hash-v1';

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has', 'are', 'was', 'you', 'your', 'its', 'but', 'not', 'all', 'can', 'out', 'get', 'new', 'one', 'per']);

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result);
}

export function tokenize(text: string) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+.\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^[-.]+|[-.]+$/g, ''))
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function localEmbedding(text: string, dimensions = LOCAL_EMBEDDING_DIMENSIONS) {
  const vector = new Array(dimensions).fill(0);
  const tokens = tokenize(text);
  if (!tokens.length) return vector;
  tokens.forEach((token, index) => {
    vector[hash(token) % dimensions] += 1;
    const next = tokens[index + 1];
    if (next) vector[hash(`${token}_${next}`) % dimensions] += 0.5;
  });
  return normalize(vector);
}

export function normalize(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) return vector;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a?.length || !b?.length) return 0;
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    magnitudeA += a[index] * a[index];
    magnitudeB += b[index] * b[index];
  }
  if (!magnitudeA || !magnitudeB) return 0;
  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/** Lexical overlap used to sanity-check semantic neighbours before showing them. */
export function tokenOverlap(a: string, b: string) {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  left.forEach((token) => { if (right.has(token)) shared += 1; });
  return shared / Math.min(left.size, right.size);
}
