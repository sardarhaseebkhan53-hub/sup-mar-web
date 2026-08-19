import mongoose from 'mongoose';

const authenticationSettingsSchema = new mongoose.Schema<any>(
  {
    key: { type: String, required: true, unique: true, trim: true, default: 'global' },
    otpEnabled: { type: Boolean, default: false },
    otpProvider: { type: String, enum: ['console', 'twilio', 'msg91', 'sms_pk', 'email', 'none'], default: 'none' },
    otpRequiredForSignup: { type: Boolean, default: false },
    otpRequiredForLogin: { type: Boolean, default: false },
    otpRequiredForPasswordReset: { type: Boolean, default: false },
    otpChannel: { type: String, enum: ['sms', 'email', 'both'], default: 'sms' },
    providers: {
      google: {
        enabled: { type: Boolean, default: false },
        configured: { type: Boolean, default: false },
        clientId: { type: String, default: '' },
        clientSecretMasked: { type: String, default: '' },
      },
      apple: {
        enabled: { type: Boolean, default: false },
        configured: { type: Boolean, default: false },
        clientId: { type: String, default: '' },
        teamId: { type: String, default: '' },
        keyId: { type: String, default: '' },
        hasPrivateKey: { type: Boolean, default: false },
      },
      microsoft: {
        enabled: { type: Boolean, default: false },
        configured: { type: Boolean, default: false },
        clientId: { type: String, default: '' },
        tenantId: { type: String, default: '' },
        clientSecretMasked: { type: String, default: '' },
      },
      facebook: {
        enabled: { type: Boolean, default: false },
        configured: { type: Boolean, default: false },
        clientId: { type: String, default: '' },
        clientSecretMasked: { type: String, default: '' },
      },
    },
    passwordPolicy: {
      minLength: { type: Number, default: 10 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumber: { type: Boolean, default: true },
      requireSpecial: { type: Boolean, default: true },
    },
    accountLinkingEnabled: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const AuthenticationSettings: mongoose.Model<any> =
  (mongoose.models.AuthenticationSettings as mongoose.Model<any>) ||
  mongoose.model<any>('AuthenticationSettings', authenticationSettingsSchema);
