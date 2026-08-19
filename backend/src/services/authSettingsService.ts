import { env } from '../config/env.js';
import { authSettingsRepository } from '../repositories/authSettingsRepository.js';
import { socialAuthCapabilities, getSocialAuthAdapter } from './socialAuthService.js';

const SOCIAL_ENV_MAP: Record<string, { id: string; secret: string; extra?: string[] }> = {
  google: { id: 'GOOGLE_CLIENT_ID', secret: 'GOOGLE_CLIENT_SECRET' },
  apple: { id: 'APPLE_CLIENT_ID', secret: 'APPLE_PRIVATE_KEY', extra: ['APPLE_TEAM_ID', 'APPLE_KEY_ID'] },
  microsoft: { id: 'MICROSOFT_CLIENT_ID', secret: 'MICROSOFT_CLIENT_SECRET', extra: ['MICROSOFT_TENANT_ID'] },
  facebook: { id: 'FACEBOOK_APP_ID', secret: 'FACEBOOK_APP_SECRET' },
};

function maskSecret(secret: string): string {
  if (!secret) return '';
  if (secret.length <= 4) return '****';
  return `${secret.slice(0, 2)}${'*'.repeat(Math.max(4, secret.length - 4))}${secret.slice(-2)}`;
}

export function detectProviderConfiguration() {
  const config: Record<string, { enabled: boolean; configured: boolean; clientId: string; clientSecretMasked: string; extras: Record<string, string> }> = {};
  for (const [provider, envKeys] of Object.entries(SOCIAL_ENV_MAP)) {
    const id = (process.env[envKeys.id] || '').trim();
    const secret = (process.env[envKeys.secret] || '').trim();
    const extras: Record<string, string> = {};
    if (envKeys.extra) for (const k of envKeys.extra) extras[k] = (process.env[k] || '').trim();
    const configured = Boolean(id) && Boolean(secret);
    config[provider] = { enabled: configured, configured, clientId: id, clientSecretMasked: maskSecret(secret), extras };
  }
  return config;
}

export const authSettingsService = {
  async get() {
    const record = await authSettingsRepository.get();
    const live = detectProviderConfiguration();
    // Always overlay live env detection so providers reflect configuration in real time
    record.providers = record.providers || {};
    for (const [provider, info] of Object.entries(live)) {
      record.providers[provider] = {
        ...(record.providers[provider] || {}),
        configured: info.configured,
        clientId: info.clientId || (record.providers[provider]?.clientId || ''),
        clientSecretMasked: info.configured ? maskSecret(process.env[SOCIAL_ENV_MAP[provider].secret] || '') : (record.providers[provider]?.clientSecretMasked || ''),
        ...(info.extras || {}),
        enabled: info.configured ? (record.providers[provider]?.enabled ?? false) : false,
      };
    }
    return record;
  },
  async update(updates: Record<string, any>, adminId?: string) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'providers' && typeof value === 'object') {
        sanitized.providers = value;
      } else {
        sanitized[key] = value;
      }
    }
    return authSettingsRepository.update(sanitized, adminId);
  },
  async isOtpRequired(purpose: 'signup' | 'login' | 'password_reset') {
    const settings = await this.get();
    if (!settings.otpEnabled) return false;
    if (purpose === 'signup') return Boolean(settings.otpRequiredForSignup);
    if (purpose === 'login') return Boolean(settings.otpRequiredForLogin);
    if (purpose === 'password_reset') return Boolean(settings.otpRequiredForPasswordReset);
    return false;
  },
  async otpStatus() {
    const settings = await this.get();
    return {
      enabled: Boolean(settings.otpEnabled),
      provider: settings.otpProvider || 'none',
      configured: Boolean(settings.otpProvider) && settings.otpProvider !== 'none',
      channel: settings.otpChannel || 'sms',
      scopes: {
        signup: Boolean(settings.otpRequiredForSignup),
        login: Boolean(settings.otpRequiredForLogin),
        passwordReset: Boolean(settings.otpRequiredForPasswordReset),
      },
    };
  },
  detectSocialProviders() {
    return socialAuthCapabilities().map((item) => {
      const adapter = getSocialAuthAdapter(item.provider);
      const live = detectProviderConfiguration()[item.provider];
      return {
        provider: item.provider,
        configured: live?.configured ?? false,
        enabled: live?.enabled ?? false,
        protocol: item.protocol,
        clientId: live?.clientId ? `${live.clientId.slice(0, 6)}…` : '',
        adapter: adapter ? 'available' : 'unavailable',
      };
    });
  },
};

export { env as authEnv };
