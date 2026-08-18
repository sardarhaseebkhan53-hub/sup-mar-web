import { env } from '../config/env.js';
import { getAiProvider } from './providerFactory.js';
import { HeuristicProvider } from './providers/HeuristicProvider.js';
import type { AIProvider, AiClassifyResult, AiTextResult, AiUsage, SearchIntent } from './types.js';

/**
 * AIService — the single server-side entry point every QAVLIO feature uses to reach AI.
 * Providers stay replaceable (heuristic / openai / gemini) and API keys never leave the backend.
 */
export class AIService {
  private provider: AIProvider;

  constructor(provider?: AIProvider | string) {
    this.provider = typeof provider === 'string' ? getAiProvider(provider) : provider || getAiProvider();
  }

  get name() {
    return this.provider.name;
  }

  async generateText(prompt: string, system?: string): Promise<AiTextResult> {
    const text = await this.provider.generateText(prompt, system);
    return { text, usage: usageOf(this.provider) };
  }

  async analyzeText(text: string, instructions = 'Summarize the key facts. Never invent details.'): Promise<AiTextResult> {
    return this.generateText(`Instructions: ${instructions}\n\nText:\n${text}`, 'You analyze QAVLIO content. Use only facts present in the supplied text. If a fact is missing, say it is not stated.');
  }

  async classify(text: string, labels: string[]): Promise<AiClassifyResult> {
    const safeLabels = labels.filter((label) => typeof label === 'string' && label.length > 0).slice(0, 40);
    if (!safeLabels.length) return { label: '', confidence: 0 };
    const result = await this.provider.classify(text, safeLabels);
    if (!safeLabels.includes(result.label)) return { label: safeLabels[0], confidence: 0 };
    return { ...result, confidence: clamp01(result.confidence), usage: usageOf(this.provider) };
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const safe = texts.map((text) => String(text || '').slice(0, 4000)).filter(Boolean);
    if (!safe.length) return [];
    return this.provider.generateEmbeddings(safe);
  }

  async extractAttributes(text: string): Promise<Record<string, string>> {
    const raw = String(text || '').slice(0, 2000);
    if (!raw.trim()) return {};
    return this.provider.extractAttributes(raw);
  }

  async extractIntent(query: string, previous?: SearchIntent | null): Promise<SearchIntent> {
    return this.provider.extractIntent(query, previous);
  }
}

function usageOf(provider: AIProvider): AiUsage {
  return { provider: provider.name, model: provider.name === 'heuristic' ? 'local' : env.ai.model || undefined };
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

let singleton: AIService | null = null;

/** Shared AIService instance. The heuristic provider needs no credentials and is always safe. */
export function getAIService(preferred?: string): AIService {
  if (preferred) return new AIService(preferred);
  if (!singleton) singleton = new AIService();
  return singleton;
}

export function getLocalAIService(): AIService {
  return new AIService(new HeuristicProvider());
}
