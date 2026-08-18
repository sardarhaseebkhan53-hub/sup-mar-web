import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { ACCOUNT_STATUS_VALUES, ACCOUNT_STATUSES, VERIFICATION_STATE_VALUES, VERIFICATION_STATES } from '../constants/account.js';
import { ROLE_VALUES, USER_ROLES } from '../constants/roles.js';

const verificationItemSchema = new mongoose.Schema<any>({
  status: { type: String, enum: VERIFICATION_STATE_VALUES, default: VERIFICATION_STATES.NOT_VERIFIED },
  verifiedAt: Date,
  expiresAt: Date,
  rejectedAt: Date,
  reason: { type: String, maxlength: 300 },
}, { _id: false });

const userSchema = new mongoose.Schema<any>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  username: { type: String, trim: true, lowercase: true, maxlength: 40 },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  passwordHash: { type: String, required: true, select: false },
  roles: { type: [String], enum: ROLE_VALUES, default: [USER_ROLES.CUSTOMER] },
  status: { type: String, enum: ACCOUNT_STATUS_VALUES, default: ACCOUNT_STATUSES.PENDING_VERIFICATION, index: true },
  avatar: { type: String, default: null },
  avatarKey: { type: String, default: null },
  about: { type: String, maxlength: 1000, default: '' },
  locale: { type: String, enum: ['en', 'ur'], default: 'en' },
  location: {
    country: { type: String, default: 'PK' },
    province: { type: String, default: '' },
    city: { type: String, default: '' },
    area: { type: String, default: '' },
    point: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], default: undefined } },
  },
  verification: {
    email: { type: verificationItemSchema, default: () => ({}) },
    phone: { type: verificationItemSchema, default: () => ({}) },
    identity: { type: verificationItemSchema, default: () => ({}) },
    business: { type: verificationItemSchema, default: () => ({}) },
    trustedSeller: { type: verificationItemSchema, default: () => ({}) },
  },
  seller: {
    status: { type: String, enum: ['not_started', 'onboarding', 'active', 'paused'], default: 'not_started' },
    accountType: { type: String, enum: ['individual', 'business'], default: 'individual' },
    businessName: { type: String, maxlength: 120, default: '' },
    responseRate: { type: Number, min: 0, max: 100 },
  },
  preferences: {
    language: { type: String, enum: ['en', 'ur'], default: 'en' },
    privacy: {
      profileVisibility: { type: String, enum: ['public', 'registered', 'private'], default: 'public' },
      contactPreference: { type: String, enum: ['chat', 'chat_and_call', 'call'], default: 'chat' },
    },
    notifications: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      sms: { type: Boolean, default: true },
      security: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      messages: { type: Boolean, default: true },
      listingUpdates: { type: Boolean, default: true },
      account: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      announcements: { type: Boolean, default: true },
      savedSearchAlerts: { type: Boolean, default: true },
      priceAlerts: { type: Boolean, default: true },
      sellerUpdates: { type: Boolean, default: true },
      listingAvailability: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
    },
  },
  security: {
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: Date,
    tokenVersion: { type: Number, default: 0 },
    passwordChangedAt: Date,
    twoFactorEnabled: { type: Boolean, default: false },
  },
  lastLoginAt: Date,
  deactivatedAt: Date,
  deletedAt: Date,
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, value) => {
      delete value.passwordHash;
      delete value.avatarKey;
      delete value.security;
      return value;
    },
  },
});

userSchema.index({ username: 1 }, { unique: true, partialFilterExpression: { username: { $type: 'string' } } });
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'location.point': '2dsphere' }, { sparse: true });
userSchema.methods.verifyPassword = function verifyPassword(candidate) { return bcrypt.compare(candidate, this.passwordHash); };
userSchema.statics.hashPassword = (password, rounds = 12) => bcrypt.hash(password, rounds);

export const User: mongoose.Model<any> = (mongoose.models.User as mongoose.Model<any>) || mongoose.model<any>('User', userSchema);
