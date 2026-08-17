import { getIdentityRepository } from '../repositories/identityRepository.js';
import { requestSecurityContext } from '../utils/security.js';

interface SecurityEventInput {
  userId?: string | null;
  actorId?: string | null;
  type: string;
  outcome?: 'success' | 'failure' | 'info';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export async function recordSecurityEvent(req, { userId = null, actorId = null, type, outcome = 'info', severity = 'low', metadata = {} }: SecurityEventInput) {
  const context = requestSecurityContext(req);
  return getIdentityRepository().createSecurityEvent({
    userId: userId ? String(userId) : null, actorId: actorId ? String(actorId) : null, type, outcome, severity,
    requestId: context.requestId, ipHash: context.ipHash, userAgent: context.userAgent, metadata,
  });
}
