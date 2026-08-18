import { env } from '../../config/env.js';
import { extractHeuristicIntent, validateSearchIntent } from '../intent.js';
import { wrapUntrusted } from '../promptSecurity.js';
import type { AIProvider, AiGenerateOptions, SearchIntent } from '../types.js';

export class OpenAIProvider implements AIProvider {
  name = 'openai' as const;

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
  const model = env.ai.model || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.ai.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: options.maxOutputTokens || env.ai.maxOutputTokens,
      response_format: options.json ? { type: 'json_object' } : undefined,
      messages: [{ role: 'system', content: options.system }, ...options.messages.map((item) => ({ role: item.role, content: item.content }))],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}`);
  const payload: any = await response.json();
  return String(payload.choices?.[0]?.message?.content || '').trim();
}
