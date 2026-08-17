import { env } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { ACCOUNT_STATUSES, VERIFICATION_STATES } from '../src/constants/account.js';
import { USER_ROLES } from '../src/constants/roles.js';
import { User } from '../src/models/User.js';
import { assertStrongPassword, hashPassword } from '../src/services/passwordService.js';
import { normalizeEmail } from '../src/utils/identity.js';

const email = normalizeEmail(process.env.ADMIN_EMAIL);
const password = process.env.ADMIN_PASSWORD || '';
const name = String(process.env.ADMIN_NAME || 'QAVLIO Administrator').trim();
assertStrongPassword(password);
if (!env.mongoUri) throw new Error('MONGODB_URI is required for admin bootstrap.');
await connectDatabase();
try {
  const existing = await User.findOne({ email }).select('+passwordHash');
  if (existing) throw new Error('An account already exists with ADMIN_EMAIL; use the audited role-management workflow instead.');
  await User.create({
    name, username: `admin.${Date.now().toString().slice(-6)}`, email, passwordHash: await hashPassword(password),
    roles: [USER_ROLES.SUPER_ADMIN], status: ACCOUNT_STATUSES.ACTIVE,
    verification: { email: { status: VERIFICATION_STATES.VERIFIED, verifiedAt: new Date() } },
    security: { tokenVersion: 0, failedLoginCount: 0, twoFactorEnabled: false },
  });
  console.info(`Admin bootstrap completed for ${email}. Enable step-up authentication before production access.`);
} finally {
  await disconnectDatabase();
}
