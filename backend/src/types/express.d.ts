import type { UserRole } from '../constants/roles.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        userId: string;
        sessionId: string;
        roles: UserRole[];
        user: Record<string, unknown>;
      };
    }
  }
}

export {};
