import AiAssistantPanel from './AiAssistantPanel';

/**
 * AIAssistant — the QAVLIO shopping assistant surface (§14).
 * Premium, fast, friendly, and grounded in live marketplace data — never a copy of any
 * other assistant's UI. Renders the dock variant by default; pass `variant="page"` on /ai-assistant.
 */
export default function AIAssistant({ variant = 'dock' }: { variant?: 'dock' | 'page' }) {
  return <AiAssistantPanel variant={variant} />;
}
