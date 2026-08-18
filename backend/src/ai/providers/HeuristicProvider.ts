import { MARKETPLACE_POLICIES } from '../../constants/aiPolicies.js';
import { extractHeuristicIntent } from '../intent.js';
import type { AIProvider, AiGenerateOptions, SearchIntent } from '../types.js';

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
}
