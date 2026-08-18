import { env } from '../../config/env.js';
import { LOCAL_EMBEDDING_DIMENSIONS, normalize } from '../embeddings.js';
import { extractHeuristicIntent, validateSearchIntent } from '../intent.js';
import { wrapUntrusted } from '../promptSecurity.js';
import type { AIProvider, AiAnalysis, AiClassification, AiExtractedAttributes, AiGenerateOptions, SearchIntent } from '../types.js';
import { HeuristicProvider } from './HeuristicProvider.js';

const local = new HeuristicProvider();

export class GeminiProvider implements AIProvider {
  name = 'gemini' as const;
  embeddingModel = env.ai.embeddingModel || 'text-embedding-004';

  async chat(options: AiGenerateOptions) {
    return complete(options);
  }

  async extractIntent(query: string, previous?: SearchIntent | null) {
    try {
      const raw = await complete({
        system: 'Extract marketplace search filters as JSON only. Keys: category, subcategory, keywords, brand, model, minPrice, maxPrice, minYear, maxYear, condition, location, sort, attributes. Never invent listings. If unknown, omit the key. Prices are PKR integers.',
        messages: [{ role: 'user', content: wrapUntrusted(query) + (previous ? `\nPrevious filters: ${JSON.stringify(previous)}` : '') }],
        json: true,
        maxOutputTokens: 300,
      });
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return validateSearchIntent({ ...previous, ...parsed });
    } catch {
      return extractHeuristicIntent(query, previous);
    }
  }

  async generateText(prompt: string, system = 'You are QAVLIO Assistant. Be brief. Use only supplied facts. Never invent specifications, prices, or listings.') {
    return complete({ system, messages: [{ role: 'user', content: wrapUntrusted(prompt) }], maxOutputTokens: env.ai.maxOutputTokens });
  }

  async analyzeText(text: string, instruction = 'Summarise the supplied marketplace text.'): Promise<AiAnalysis> {
    try {
      const raw = await complete({
        system: `${instruction} Reply with JSON only: {"summary":string,"labels":string[],"sentiment":"positive"|"neutral"|"negative","confidence":number}. Use only the supplied text. Never invent facts.`,
        messages: [{ role: 'user', content: wrapUntrusted(text) }],
        json: true,
        maxOutputTokens: 300,
      });
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return {
        summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 600) : '',
        labels: Array.isArray(parsed.labels) ? parsed.labels.map(String).slice(0, 10) : [],
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
        confidence: Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, Number(parsed.confidence))) : 0.5,
      };
    } catch {
      return local.analyzeText(text);
    }
  }

  async generateEmbeddings(inputs: string[]) {
    if (!env.ai.apiKey || !inputs.length) return local.generateEmbeddings(inputs);
    try {
      const vectors = await Promise.all(inputs.map(async (input) => {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.embeddingModel}:embedContent?key=${env.ai.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: `models/${this.embeddingModel}`, content: { parts: [{ text: input.slice(0, 6000) }] }, outputDimensionality: LOCAL_EMBEDDING_DIMENSIONS }),
        });
        if (!response.ok) throw new Error(`Gemini embeddings ${response.status}`);
        const payload: any = await response.json();
        return normalize((payload.embedding?.values || []).map(Number));
      }));
      if (vectors.some((vector) => !vector.length)) throw new Error('Empty embedding');
      return vectors;
    } catch {
      return local.generateEmbeddings(inputs);
    }
  }

  async classify(text: string, labels: string[]): Promise<AiClassification> {
    try {
      const raw = await complete({
        system: `Classify the text into exactly one of these labels: ${labels.join(', ')}. Reply with JSON only: {"label":string,"confidence":number}.`,
        messages: [{ role: 'user', content: wrapUntrusted(text) }],
        json: true,
        maxOutputTokens: 120,
      });
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
      const label = labels.includes(parsed.label) ? parsed.label : null;
      if (!label) return local.classify(text, labels);
      return { label, confidence: Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, Number(parsed.confidence))) : 0.5 };
    } catch {
      return local.classify(text, labels);
    }
  }

  async extractAttributes(text: string, allowedKeys?: string[]): Promise<AiExtractedAttributes> {
    try {
      const raw = await complete({
        system: `Extract product attributes from the seller's own words. Allowed keys: ${(allowedKeys || []).join(', ') || 'brand, model, storage, ram, color, year'}. Reply with JSON only. Omit any key you cannot read directly from the text. NEVER guess or infer specifications.`,
        messages: [{ role: 'user', content: wrapUntrusted(text) }],
        json: true,
        maxOutputTokens: 250,
      });
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
      const allowed = new Set(allowedKeys || []);
      const result: AiExtractedAttributes = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (allowed.size && !allowed.has(key)) continue;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') result[key] = value;
      }
      return result;
    } catch {
      return local.extractAttributes(text, allowedKeys);
    }
  }
}

async function complete(options: AiGenerateOptions) {
  if (!env.ai.apiKey) throw new Error('AI_API_KEY missing');
  const model = env.ai.model || 'gemini-2.0-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.ai.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.system }] },
      contents: options.messages.filter((item) => item.role !== 'system').map((item) => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.content }],
      })),
      generationConfig: { temperature: 0.2, maxOutputTokens: options.maxOutputTokens || env.ai.maxOutputTokens, responseMimeType: options.json ? 'application/json' : 'text/plain' },
    }),
  });
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const payload: any = await response.json();
  return String(payload.candidates?.[0]?.content?.parts?.map((part: any) => part.text).join('') || '').trim();
}
