import { env } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { ensureAdminAccount } from '../src/services/adminAuthService.js';

/**
 * On-demand administrator bootstrap.
 *
 * Uses the same idempotent routine the API runs at startup: the admin is created only
 * when it does not already exist, and the password is always stored as a bcrypt hash.
 */
if (!env.admin.username || !env.admin.password) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD are required for administrator bootstrap.');
}
if (!env.mongoUri) throw new Error('MONGODB_URI is required for admin bootstrap.');

await connectDatabase();
try {
  const result = await ensureAdminAccount();
  if (result.created) {
    console.info(`Administrator "${env.admin.username}" created. Sign in at /admin/login and rotate the password immediately.`);
  } else if (result.skipped === 'already_exists') {
    console.info(`Administrator "${env.admin.username}" already exists; nothing to do.`);
  } else {
    console.warn(`Administrator bootstrap skipped: ${result.skipped}`);
  }
} finally {
  await disconnectDatabase();
}
