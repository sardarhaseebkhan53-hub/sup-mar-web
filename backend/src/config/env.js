import 'dotenv/config';

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: numberFromEnv(process.env.PORT, 5000),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  mongoUri: process.env.MONGODB_URI || '',
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dealhub-development-access-secret-change-me'),
    refreshSecret: process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dealhub-development-refresh-secret-change-me'),
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    rememberTtl: process.env.JWT_REMEMBER_TTL || '30d',
  },
  otpPepper: process.env.OTP_PEPPER || (process.env.NODE_ENV === 'production' ? '' : 'dealhub-development-otp-pepper-change-me'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  auth: {
    otpExpiresMinutes: numberFromEnv(process.env.OTP_EXPIRES_MINUTES, 10),
    otpResendSeconds: numberFromEnv(process.env.OTP_RESEND_SECONDS, 60),
    otpMaxAttempts: numberFromEnv(process.env.OTP_MAX_ATTEMPTS, 5),
    loginMaxAttempts: numberFromEnv(process.env.LOGIN_MAX_ATTEMPTS, 5),
    loginLockMinutes: numberFromEnv(process.env.LOGIN_LOCK_MINUTES, 15),
  },
});

export function assertProductionEnv() {
  if (env.nodeEnv !== 'production') return;
  const missing = [];
  if (!env.mongoUri) missing.push('MONGODB_URI');
  if (env.jwt.accessSecret.length < 32) missing.push('JWT_ACCESS_SECRET (min 32 characters)');
  if (env.jwt.refreshSecret.length < 32) missing.push('JWT_REFRESH_SECRET (min 32 characters)');
  if (env.otpPepper.length < 32) missing.push('OTP_PEPPER (min 32 characters)');
  if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
}
