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
    accessSecret: process.env.JWT_ACCESS_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'qavlio-development-access-secret-change-me'),
    refreshSecret: process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'qavlio-development-refresh-secret-change-me'),
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    rememberTtl: process.env.JWT_REMEMBER_TTL || '30d',
  },
  otpPepper: process.env.OTP_PEPPER || (process.env.NODE_ENV === 'production' ? '' : 'qavlio-development-otp-pepper-change-me'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  security: {
    passwordMinLength: numberFromEnv(process.env.PASSWORD_MIN_LENGTH, 10),
  },
  media: {
    provider: process.env.MEDIA_PROVIDER || '',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    avatarMaxBytes: numberFromEnv(process.env.AVATAR_MAX_BYTES, 5 * 1024 * 1024),
  },
  commerce: {
    freeListingLimit: numberFromEnv(process.env.FREE_LISTING_LIMIT, 1),
    additionalListingFee: String(process.env.ADDITIONAL_LISTING_FEE || '100'),
    currency: process.env.LISTING_FEE_CURRENCY || 'PKR',
    paymentProvider: process.env.PAYMENT_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'sandbox'),
    paymentProviderKey: process.env.PAYMENT_PROVIDER_KEY || '', paymentProviderSecret: process.env.PAYMENT_PROVIDER_SECRET || '',
    paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'qavlio-development-webhook-secret'),
    paymentEnvironment: process.env.PAYMENT_ENVIRONMENT || (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'),
  },
  auth: {
    otpExpiresMinutes: numberFromEnv(process.env.OTP_EXPIRES_MINUTES, 10),
    otpResendSeconds: numberFromEnv(process.env.OTP_RESEND_SECONDS, 60),
    otpMaxAttempts: numberFromEnv(process.env.OTP_MAX_ATTEMPTS, 5),
    loginMaxAttempts: numberFromEnv(process.env.LOGIN_MAX_ATTEMPTS, 5),
    loginLockMinutes: numberFromEnv(process.env.LOGIN_LOCK_MINUTES, 15),
  },
  ai: {
    provider: (process.env.AI_PROVIDER || 'heuristic').toLowerCase(),
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || '',
    perMinute: numberFromEnv(process.env.AI_REQUESTS_PER_MINUTE, 12),
    perDay: numberFromEnv(process.env.AI_REQUESTS_PER_DAY, 80),
    maxInputChars: numberFromEnv(process.env.AI_MAX_INPUT_CHARS, 2000),
    maxOutputTokens: numberFromEnv(process.env.AI_MAX_OUTPUT_TOKENS, 700),
  },
  email: {
    provider: (process.env.EMAIL_PROVIDER || 'console').toLowerCase(),
    apiKey: process.env.EMAIL_API_KEY || '',
    from: process.env.EMAIL_FROM || 'QAVLIO <noreply@qavlio.local>',
  },
  discovery: {
    recentlyViewedLimit: numberFromEnv(process.env.RECENTLY_VIEWED_LIMIT, 20),
    alertDailyCap: numberFromEnv(process.env.ALERT_DAILY_CAP, 20),
  },
});

export function assertProductionEnv() {
  if (env.nodeEnv !== 'production') return;
  const missing: string[] = [];
  if (!env.mongoUri) missing.push('MONGODB_URI');
  if (env.jwt.accessSecret.length < 32) missing.push('JWT_ACCESS_SECRET (min 32 characters)');
  if (env.jwt.refreshSecret.length < 32) missing.push('JWT_REFRESH_SECRET (min 32 characters)');
  if (env.otpPepper.length < 32) missing.push('OTP_PEPPER (min 32 characters)');
  if (!env.commerce.paymentProvider) missing.push('PAYMENT_PROVIDER');
  if (env.commerce.paymentWebhookSecret.length < 24) missing.push('PAYMENT_WEBHOOK_SECRET (min 24 characters)');
  if (env.media.provider === 'cloudinary' && (!env.media.cloudName || !env.media.apiKey || !env.media.apiSecret)) missing.push('Cloudinary media credentials');
  if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
}
