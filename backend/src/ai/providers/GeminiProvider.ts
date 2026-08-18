import { env } from '../../config/env.js';
import { extractHeuristicIntent, validateSearchIntent } from '../intent.js';
import { wrapUntrusted } from '../promptSecurity.js';
import type { AIProvider, AiGenerateOptions, SearchIntent } from '../types.js';

export class GeminiProvider implements AIProvider {
  name = 'gemini' as const;

  async chat(options: AiGenerateOptions) {
    return complete(options);
  }

  async extractIntent(query: string, previous?: SearchIntent | null) {
    try {
      const raw = await complete({
        system: 'Extract marketplace search filters as JSON only. Keys: category, subcategory, keywords, brand, model, minPrice, maxPrice, condition, location, sort, attributes. Never invent listings. If unknown, omit the key. Prices are PKR integers.',
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
