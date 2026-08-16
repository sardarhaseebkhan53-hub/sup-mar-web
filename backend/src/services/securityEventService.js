import { getIdentityRepository } from '../repositories/identityRepository.js';
import { requestSecurityContext } from '../utils/security.js';

export async function recordSecurityEvent(req, { userId = null, actorId = null, type, outcome = 'info', severity = 'low', metadata = {} }) {
  const context = requestSecurityContext(req);
  return getIdentityRepository().createSecurityEvent({
    userId: userId ? String(userId) : null,
    actorId: actorId ? String(actorId) : null,
    type,
    outcome,
    severity,
    requestId: context.requestId,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    metadata,
  });
}
