import { env } from '../config/env.js';
import { recordAiUsage } from '../services/aiUsageService.js';
import { getAiProvider, getHeuristicProvider } from './providerFactory.js';
import type { AIProvider, AiAnalysis, AiClassification, AiExtractedAttributes, AiGenerateOptions, AiProviderName, SearchIntent } from './types.js';

export type AiCallContext = {
  feature: string;
  userId?: string | null;
  sessionKey?: string | null;
  provider?: string;
  model?: string;
  maxResponseChars?: number;
};

/**
 * Phase 16 AIService.
 *
 * Single server-side entry point for every AI capability. It:
 *  - resolves the configured provider (never trusting client input for model choice)
 *  - enforces a maximum response size (cost control)
 *  - records usage/latency/success for the admin AI dashboard
 *  - falls back to the deterministic local provider on any provider failure
 *
 * API keys are read from server environment only and never returned to callers.
 */
export class AIService {
  private provider: AIProvider;
  private fallback: AIProvider;

  constructor(preferredProvider?: string) {
    this.provider = getAiProvider(preferredProvider);
    this.fallback = getHeuristicProvider();
  }

  get providerName(): AiProviderName { return this.provider.name; }
  get modelName() { return env.ai.model || ''; }
  get embeddingModel() { return this.provider.embeddingModel || 'qavlio-local-hash-v1'; }

  private async run<T>(context: AiCallContext, input: string, operation: (provider: AIProvider) => Promise<T>, fallbackOperation: (provider: AIProvider) => Promise<T>): Promise<{ value: T; degraded: boolean }> {
    const started = Date.now();
    try {
      const value = await operation(this.provider);
      await this.track(context, input, value, started, true);
      return { value, degraded: false };
    } catch (error) {
      const value = await fallbackOperation(this.fallback).catch(() => null as unknown as T);
      await this.track(context, input, value, started, false, error);
      return { value, degraded: true };
    }
  }

  private async track(context: AiCallContext, input: string, output: unknown, started: number, success: boolean, error?: unknown) {
    const outputChars = typeof output === 'string' ? output.length : output ? JSON.stringify(output).length : 0;
    const inputChars = input.length;
    await recordAiUsage({
      feature: context.feature,
      provider: this.provider.name,
      model: context.model || this.modelName,
      success,
      durationMs: Date.now() - started,
      inputChars,
      outputChars,
      // Approximate token accounting (~4 chars/token) so admins get cost signal
      // even with providers that do not return usage metadata.
      promptTokens: Math.ceil(inputChars / 4),
      completionTokens: Math.ceil(outputChars / 4),
      userId: context.userId || null,
      errorCode: error ? String((error as Error)?.message || 'AI_PROVIDER_ERROR').slice(0, 120) : undefined,
    });
  }

  private cap(text: string, context: AiCallContext) {
    const limit = Math.min(context.maxResponseChars || env.ai.maxResponseChars, env.ai.maxResponseChars);
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  }

  async generateText(prompt: string, context: AiCallContext, system?: string) {
    const result = await this.run(context, prompt, (provider) => provider.generateText(prompt, system), (provider) => provider.generateText(prompt, system));
    return { text: this.cap(String(result.value || ''), context), degraded: result.degraded };
  }

  async chat(options: AiGenerateOptions, context: AiCallContext) {
    const input = options.messages.map((item) => item.content).join('\n');
    const result = await this.run(context, input, (provider) => provider.chat(options), (provider) => provider.chat(options));
    return { text: this.cap(String(result.value || ''), context), degraded: result.degraded };
  }

  async extractIntent(query: string, previous: SearchIntent | null | undefined, context: AiCallContext) {
    const result = await this.run(context, query, (provider) => provider.extractIntent(query, previous), (provider) => provider.extractIntent(query, previous));
    return { intent: (result.value || {}) as SearchIntent, degraded: result.degraded };
  }

  async analyzeText(text: string, context: AiCallContext, instruction?: string) {
    const result = await this.run(context, text, (provider) => provider.analyzeText(text, instruction), (provider) => provider.analyzeText(text, instruction));
    return { analysis: (result.value || {}) as AiAnalysis, degraded: result.degraded };
  }

  async generateEmbeddings(inputs: string[], context: AiCallContext) {
    const result = await this.run(context, inputs.join(' ').slice(0, 4000), (provider) => provider.generateEmbeddings(inputs), (provider) => provider.generateEmbeddings(inputs));
    return { vectors: (result.value || []) as number[][], degraded: result.degraded, model: result.degraded ? this.fallback.embeddingModel || 'qavlio-local-hash-v1' : this.embeddingModel };
  }

  async classify(text: string, labels: string[], context: AiCallContext) {
    const result = await this.run(context, text, (provider) => provider.classify(text, labels), (provider) => provider.classify(text, labels));
    return { classification: (result.value || { label: '', confidence: 0 }) as AiClassification, degraded: result.degraded };
  }

  async extractAttributes(text: string, allowedKeys: string[], context: AiCallContext) {
    const result = await this.run(context, text, (provider) => provider.extractAttributes(text, allowedKeys), (provider) => provider.extractAttributes(text, allowedKeys));
    return { attributes: (result.value || {}) as AiExtractedAttributes, degraded: result.degraded };
  }
}

let cached: { key: string; service: AIService } | null = null;

/** Reuse one AIService per provider selection; providers are stateless and cheap. */
export function getAiService(preferredProvider?: string) {
  const key = String(preferredProvider || env.ai.provider || 'heuristic');
  if (!cached || cached.key !== key) cached = { key, service: new AIService(preferredProvider) };
  return cached.service;
}

export function __resetAiServiceCache() { cached = null; }
