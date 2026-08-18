import { env } from '../../config/env.js';
import { extractHeuristicIntent, validateSearchIntent } from '../intent.js';
import { wrapUntrusted } from '../promptSecurity.js';
import { HeuristicProvider } from './HeuristicProvider.js';
import type { AIProvider, AiGenerateOptions, SearchIntent } from '../types.js';

export class GeminiProvider implements AIProvider {
  name = 'gemini' as const;
  private fallback = new HeuristicProvider();

  async chat(options: AiGenerateOptions) {
    return complete(options);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const model = 'text-embedding-004';
      const vectors: number[][] = [];
      for (const text of texts) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${env.ai.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text }] } }),
        });
        if (!response.ok) throw new Error(`Gemini embeddings ${response.status}`);
        const payload: any = await response.json();
        const values = (payload.embedding?.values || []).map((value: unknown) => Number(value));
        if (!values.length) throw new Error('empty embedding');
        vectors.push(values);
      }
      if (vectors.length !== texts.length) throw new Error('embedding count mismatch');
      return vectors;
    } catch {
      return this.fallback.generateEmbeddings(texts);
    }
  }

  async classify(text: string, labels: string[]) {
    try {
      const raw = await complete({
        system: `Classify the text into exactly one label from: ${labels.join(' | ')}. Reply with JSON {"label": string, "confidence": number between 0 and 1}.`,
        messages: [{ role: 'user', content: wrapUntrusted(text) }],
        json: true,
        maxOutputTokens: 60,
      });
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return { label: String(parsed.label || ''), confidence: Number(parsed.confidence) || 0 };
    } catch {
      return this.fallback.classify(text, labels);
    }
  }

  async extractAttributes(text: string) {
    try {
      const raw = await complete({
        system: 'Extract only attributes explicitly present in the seller text. Allowed keys: brand, model, storage, ram, color, year, transmission, mileage. Reply with a JSON object. Omit anything not stated. Never guess.',
        messages: [{ role: 'user', content: wrapUntrusted(text) }],
        json: true,
        maxOutputTokens: 200,
      });
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'string' || typeof value === 'number').map(([key, value]) => [key, String(value).slice(0, 80)]));
    } catch {
      return this.fallback.extractAttributes(text);
    }
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
