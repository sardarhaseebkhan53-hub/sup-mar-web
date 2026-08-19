import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AuthenticationSettings } from '../models/AuthenticationSettings.js';

const memory = new Map<string, any>();

const defaults = () => ({
  key: 'global',
  otpEnabled: false,
  otpProvider: 'none',
  otpRequiredForSignup: false,
  otpRequiredForLogin: false,
  otpRequiredForPasswordReset: false,
  otpChannel: 'sms',
  providers: {
    google: { enabled: false, configured: false, clientId: '', clientSecretMasked: '' },
    apple: { enabled: false, configured: false, clientId: '', teamId: '', keyId: '', hasPrivateKey: false },
    microsoft: { enabled: false, configured: false, clientId: '', tenantId: '', clientSecretMasked: '' },
    facebook: { enabled: false, configured: false, clientId: '', clientSecretMasked: '' },
  },
  passwordPolicy: {
    minLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  },
  accountLinkingEnabled: true,
});

function clone<T>(value: T): T {
  return value == null ? (value as T) : (JSON.parse(JSON.stringify(value)) as T);
}

export const authSettingsRepository = {
  async get(): Promise<any> {
    if (mongoose.connection.readyState === 1) {
      let record = await AuthenticationSettings.findOne({ key: 'global' }).lean();
      if (!record) {
        const created = await AuthenticationSettings.create(defaults());
        record = created.toObject();
      }
      return record;
    }
    if (!memory.has('global')) memory.set('global', defaults());
    return clone(memory.get('global'));
  },
  async update(updates: Record<string, any>, adminId?: string): Promise<any> {
    const current = await this.get();
    const next = { ...current, ...updates, key: 'global', updatedBy: adminId };
    if (mongoose.connection.readyState === 1) {
      const record = await AuthenticationSettings.findOneAndUpdate(
        { key: 'global' },
        { $set: next },
        { new: true, upsert: true },
      ).lean();
      return record;
    }
    memory.set('global', { ...next, updatedAt: new Date() });
    return clone(memory.get('global'));
  },
  /** One-time bootstrap from environment variables when the persisted record is fresh. */
  async bootstrapFromEnv(): Promise<any> {
    const current = await this.get();
    if (current && current.bootstrapped) return current;
    return this.update({
      otpEnabled: env.auth.otpEnabled,
      otpProvider: env.auth.otpProvider || 'none',
      otpChannel: env.auth.otpChannel,
      otpRequiredForSignup: env.auth.otpRequiredForSignup,
      otpRequiredForLogin: env.auth.otpRequiredForLogin,
      otpRequiredForPasswordReset: env.auth.otpRequiredForPasswordReset,
      bootstrapped: true,
    });
  },
};
