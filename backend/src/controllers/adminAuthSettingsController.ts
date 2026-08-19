import { authSettingsService } from '../services/authSettingsService.js';
import { logAdminActivity } from '../services/adminActivityService.js';
import { AppError } from '../utils/AppError.js';

const allowedOtpProviders = new Set(['none', 'console', 'twilio', 'msg91', 'sms_pk', 'email']);
const allowedChannels = new Set(['sms', 'email', 'both']);

function asBool(value: any, fallback: any) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

export async function getAuthSettings(_req: any, res: any) {
  const settings = await authSettingsService.get();
  const social = authSettingsService.detectSocialProviders();
  res.json({ success: true, data: { ...settings, socialProviders: social } });
}

export async function updateAuthSettings(req: any, res: any) {
  const updates: Record<string, any> = {};
  const body = req.body || {};

  if (typeof body.otpEnabled === 'boolean' || body.otpEnabled === 'true' || body.otpEnabled === 'false') {
    updates.otpEnabled = asBool(body.otpEnabled, false);
  }
  if (body.otpProvider) {
    if (!allowedOtpProviders.has(body.otpProvider)) throw new AppError(422, 'Unsupported OTP provider', 'INVALID_OTP_PROVIDER');
    updates.otpProvider = body.otpProvider;
  }
  if (typeof body.otpChannel === 'string') {
    if (!allowedChannels.has(body.otpChannel)) throw new AppError(422, 'Unsupported OTP channel', 'INVALID_OTP_CHANNEL');
    updates.otpChannel = body.otpChannel;
  }
  for (const key of ['otpRequiredForSignup', 'otpRequiredForLogin', 'otpRequiredForPasswordReset', 'accountLinkingEnabled']) {
    if (key in body) updates[key] = asBool(body[key], false);
  }
  if (body.passwordPolicy && typeof body.passwordPolicy === 'object') {
    updates.passwordPolicy = {
      minLength: Number(body.passwordPolicy.minLength) || 10,
      requireUppercase: asBool(body.passwordPolicy.requireUppercase, true),
      requireLowercase: asBool(body.passwordPolicy.requireLowercase, true),
      requireNumber: asBool(body.passwordPolicy.requireNumber, true),
      requireSpecial: asBool(body.passwordPolicy.requireSpecial, true),
    };
  }
  if (body.providers && typeof body.providers === 'object') {
    const current = await authSettingsService.get();
    const providers = current.providers || {};
    for (const [name, value] of Object.entries(body.providers)) {
      if (!providers[name]) continue;
      const incoming = value as Record<string, any>;
      providers[name] = {
        ...providers[name],
        enabled: asBool((incoming as any).enabled, providers[name].enabled),
      };
    }
    updates.providers = providers;
  }

  // Guard rails: warning if OTP is being enabled without a configured provider.
  if (updates.otpEnabled === true) {
    const current = await authSettingsService.get();
    const provider = updates.otpProvider || current.otpProvider || 'none';
    if (provider === 'none' || !provider) {
      // Allow but log so admins can configure provider.
      req.headers['x-qavlio-warning'] = 'OTP is enabled but no provider is configured. Codes will not be delivered.';
    }
  }

  const updated = await authSettingsService.update(updates, req.auth?.userId);
  await logAdminActivity(req.auth?.userId, 'ADMIN_UPDATED_AUTH_SETTINGS', 'authentication', 'global', { updates }, req);
  res.json({ success: true, data: updated, message: 'Authentication settings updated' });
}
