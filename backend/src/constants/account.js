export const ACCOUNT_STATUSES = Object.freeze({
  ACTIVE: 'active',
  PENDING_VERIFICATION: 'pending_verification',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  DEACTIVATED: 'deactivated',
  DELETED: 'deleted',
});

export const ACCOUNT_STATUS_VALUES = Object.values(ACCOUNT_STATUSES);

export const VERIFICATION_STATES = Object.freeze({
  NOT_VERIFIED: 'not_verified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
});

export const VERIFICATION_STATE_VALUES = Object.values(VERIFICATION_STATES);

export const AUTH_PURPOSES = Object.freeze({
  EMAIL_VERIFICATION: 'email_verification',
  PHONE_SIGNUP: 'phone_signup',
  PHONE_LOGIN: 'phone_login',
  PHONE_VERIFICATION: 'phone_verification',
  PASSWORD_RESET_EMAIL: 'password_reset_email',
  PASSWORD_RESET_PHONE: 'password_reset_phone',
  ACCOUNT_LINK: 'account_link',
});

export const AUTH_PURPOSE_VALUES = Object.values(AUTH_PURPOSES);
