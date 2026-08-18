import { env } from '../config/env.js';
import { GeminiProvider } from './providers/GeminiProvider.js';
import { HeuristicProvider } from './providers/HeuristicProvider.js';
import { OpenAIProvider } from './providers/OpenAIProvider.js';
import type { AIProvider, AiProviderName } from './types.js';

const heuristic = new HeuristicProvider();

export function getAiProvider(preferred?: string): AIProvider {
  const name = ((preferred || env.ai.provider || 'heuristic') as string).toLowerCase() as AiProviderName;
  if (!env.ai.apiKey || name === 'heuristic') return heuristic;
  if (name === 'openai') return new OpenAIProvider();
  if (name === 'gemini') return new GeminiProvider();
  return heuristic;
}

export function getHeuristicProvider() {
  return heuristic;
}
