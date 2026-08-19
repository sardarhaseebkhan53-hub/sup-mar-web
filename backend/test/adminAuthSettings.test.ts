import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import request from 'supertest';
import { app } from '../src/app.js';
import { ACCOUNT_STATUSES, VERIFICATION_STATES } from '../src/constants/account.js';
import { USER_ROLES } from '../src/constants/roles.js';
import { getIdentityRepository, resetIdentityRepository } from '../src/repositories/identityRepository.js';
import { authSettingsService } from '../src/services/authSettingsService.js';
import { hashPassword } from '../src/services/passwordService.js';

const password = 'SecurePass123!';

async function admin() {
  const repo = getIdentityRepository();
  const user: any = await repo.createUser({
    name: 'Auth Admin',
    email: `admin-${Date.now()}@qavlio.test`,
    username: `auth-admin-${Date.now()}`,
    passwordHash: await hashPassword(password),
    roles: [USER_ROLES.ADMIN],
    status: ACCOUNT_STATUSES.ACTIVE,
    verification: { email: { status: VERIFICATION_STATES.VERIFIED, verifiedAt: new Date() } },
    security: { failedLoginCount: 0, tokenVersion: 0 },
    preferences: { language: 'en', notifications: {} },
    location: { country: 'PK', city: 'Rawalpindi' },
  });
  const login = await request(app).post('/api/v1/auth/login').send({ identifier: user.email, password, remember: true });
  return { token: login.body.data.accessToken };
}

beforeEach(async () => {
  resetIdentityRepository();
  await authSettingsService.update({
    otpEnabled: false,
    otpRequiredForSignup: false,
    otpRequiredForLogin: false,
    otpRequiredForPasswordReset: false,
  });
});

describe('admin authentication settings', () => {
  test('anonymous user cannot read auth settings', async () => {
    await request(app).get('/api/v1/admin/auth-settings').expect(401);
  });

  test('admin can read default OFF state', async () => {
    const { token } = await admin();
    const response = await request(app).get('/api/v1/admin/auth-settings').set('Authorization', `Bearer ${token}`).expect(200);
    assert.equal(response.body.data.otpEnabled, false);
    // The default OTP provider is configurable via OTP_PROVIDER env; we just
    // assert that it is either "none" (truly disabled) or a real provider
    // value. What matters is that no scope flags are on.
    assert.match(response.body.data.otpProvider, /^(none|console|twilio|msg91|sms_pk|email)$/);
    assert.equal(response.body.data.otpRequiredForSignup, false);
    assert.equal(response.body.data.otpRequiredForLogin, false);
    assert.equal(response.body.data.otpRequiredForPasswordReset, false);
  });

  test('admin can flip OTP ON, then OFF again', async () => {
    const { token } = await admin();
    await request(app).patch('/api/v1/admin/auth-settings').set('Authorization', `Bearer ${token}`).send({ otpEnabled: true, otpProvider: 'console', otpRequiredForSignup: true, otpRequiredForLogin: true, otpRequiredForPasswordReset: true }).expect(200);
    const on = await request(app).get('/api/v1/admin/auth-settings').set('Authorization', `Bearer ${token}`).expect(200);
    assert.equal(on.body.data.otpEnabled, true);
    assert.equal(on.body.data.otpProvider, 'console');
    assert.equal(on.body.data.otpRequiredForSignup, true);

    await request(app).patch('/api/v1/admin/auth-settings').set('Authorization', `Bearer ${token}`).send({ otpEnabled: false, otpRequiredForSignup: false, otpRequiredForLogin: false, otpRequiredForPasswordReset: false }).expect(200);
    const off = await request(app).get('/api/v1/admin/auth-settings').set('Authorization', `Bearer ${token}`).expect(200);
    assert.equal(off.body.data.otpEnabled, false);
  });

  test('public capabilities reflect current OTP setting', async () => {
    const { token } = await admin();
    await request(app).patch('/api/v1/admin/auth-settings').set('Authorization', `Bearer ${token}`).send({ otpEnabled: false }).expect(200);
    const off = await request(app).get('/api/v1/auth/capabilities').expect(200);
    assert.equal(off.body.data.otp.enabled, false);

    await request(app).patch('/api/v1/admin/auth-settings').set('Authorization', `Bearer ${token}`).send({ otpEnabled: true, otpProvider: 'console', otpRequiredForLogin: true }).expect(200);
    const on = await request(app).get('/api/v1/auth/capabilities').expect(200);
    assert.equal(on.body.data.otp.enabled, true);
    assert.equal(on.body.data.otp.scopes.login, true);
  });

  test('password policy updates are validated', async () => {
    const { token } = await admin();
    const response = await request(app).patch('/api/v1/admin/auth-settings').set('Authorization', `Bearer ${token}`).send({ passwordPolicy: { minLength: 3 } }).expect(422);
    assert.equal(response.body.code, 'VALIDATION_ERROR');
  });

  test('non-admin users are forbidden from updating', async () => {
    const repo = getIdentityRepository();
    const customer: any = await repo.createUser({
      name: 'Customer', email: 'cust@example.test', username: 'cust', passwordHash: await hashPassword(password),
      roles: [USER_ROLES.CUSTOMER], status: ACCOUNT_STATUSES.ACTIVE,
      verification: { email: { status: VERIFICATION_STATES.VERIFIED, verifiedAt: new Date() } },
      security: { failedLoginCount: 0, tokenVersion: 0 },
      preferences: { language: 'en', notifications: {} },
      location: { country: 'PK', city: 'Rawalpindi' },
    });
    const login = await request(app).post('/api/v1/auth/login').send({ identifier: customer.email, password, remember: true });
    const customerToken = login.body.data.accessToken;
    await request(app).patch('/api/v1/admin/auth-settings').set('Authorization', `Bearer ${customerToken}`).send({ otpEnabled: true }).expect(403);
  });
});
