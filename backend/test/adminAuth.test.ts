import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import request from 'supertest';
import { app } from '../src/app.js';
import { env } from '../src/config/env.js';
import { ACCOUNT_STATUSES, VERIFICATION_STATES } from '../src/constants/account.js';
import { USER_ROLES } from '../src/constants/roles.js';
import { getIdentityRepository, resetIdentityRepository } from '../src/repositories/identityRepository.js';
import { ensureAdminAccount } from '../src/services/adminAuthService.js';
import { authSettingsService } from '../src/services/authSettingsService.js';
import { hashPassword } from '../src/services/passwordService.js';

const adminUsername = env.admin.username;
const adminPassword = env.admin.password;
const customerPassword = 'SecurePass123!';

async function createCustomer() {
  const repository = getIdentityRepository();
  const email = `shopper-${Date.now()}-${Math.random().toString(16).slice(2)}@qavlio.test`;
  await repository.createUser({
    name: 'Marketplace Shopper',
    username: `shopper-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    email,
    passwordHash: await hashPassword(customerPassword),
    roles: [USER_ROLES.CUSTOMER],
    status: ACCOUNT_STATUSES.ACTIVE,
    verification: { email: { status: VERIFICATION_STATES.VERIFIED, verifiedAt: new Date() } },
    security: { failedLoginCount: 0, tokenVersion: 0 },
  });
  const login = await request(app).post('/api/v1/auth/login').send({ identifier: email, password: customerPassword });
  return { email, token: login.body.data.accessToken };
}

function adminLogin(payload: Record<string, unknown>) {
  return request(app).post('/api/v1/admin/auth/login').send(payload);
}

beforeEach(async () => {
  resetIdentityRepository();
  await authSettingsService.update({ otpEnabled: false, otpRequiredForSignup: false, otpRequiredForLogin: false, otpRequiredForPasswordReset: false });
  await ensureAdminAccount({ silent: true });
});

describe('administrator bootstrap', () => {
  test('creates the configured administrator exactly once', async () => {
    const second = await ensureAdminAccount({ silent: true });
    assert.equal(second.created, false);
    assert.equal(second.skipped, 'already_exists');
    const stored: any = await getIdentityRepository().findUserByUsername(adminUsername, { includePassword: true });
    assert.ok(stored, 'the development administrator should exist');
    assert.ok(stored.roles.includes(USER_ROLES.SUPER_ADMIN));
    assert.equal(stored.status, ACCOUNT_STATUSES.ACTIVE);
    assert.notEqual(stored.passwordHash, adminPassword, 'the plaintext password must never be stored');
    assert.match(stored.passwordHash, /^\$2[aby]\$/, 'the password must be stored as a bcrypt hash');
  });
});

describe('POST /api/v1/admin/auth/login', () => {
  test('signs in with username and password without any OTP step', async () => {
    const response = await adminLogin({ username: adminUsername, password: adminPassword });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.admin.username, adminUsername);
    assert.ok(response.body.data.accessToken);
    assert.equal(response.body.data.otpRequired, undefined);
    assert.equal(response.body.data.admin.passwordHash, undefined);
    const cookies = String(response.headers['set-cookie']);
    assert.match(cookies, /qavlio_admin_refresh=/);
    assert.match(cookies, /HttpOnly/);
    assert.match(cookies, /Path=\/api\/v1\/admin\/auth/);
  });

  test('never asks for OTP even when OTP is enabled for the marketplace', async () => {
    await authSettingsService.update({ otpEnabled: true, otpProvider: 'console', otpRequiredForLogin: true });
    const response = await adminLogin({ username: adminUsername, password: adminPassword });
    assert.equal(response.status, 200);
    assert.ok(response.body.data.accessToken);
    assert.equal(response.body.data.otpRequired, undefined);
    await authSettingsService.update({ otpEnabled: false, otpRequiredForLogin: false });
  });

  test('rejects an incorrect password', async () => {
    const response = await adminLogin({ username: adminUsername, password: 'WrongPassword123!' });
    assert.equal(response.status, 401);
    assert.equal(response.body.code, 'INVALID_ADMIN_CREDENTIALS');
  });

  test('rejects a marketplace customer', async () => {
    const customer = await createCustomer();
    const response = await adminLogin({ username: customer.email, password: customerPassword });
    assert.equal(response.status, 403);
    assert.equal(response.body.code, 'NOT_AN_ADMINISTRATOR');
  });

  test('never accepts a phone number or OTP payload shape', async () => {
    const response = await adminLogin({ phone: '+923001234567', code: '123456' });
    assert.equal(response.status, 422);
  });
});

describe('admin session endpoints', () => {
  test('GET /admin/auth/me returns the administrator identity and permissions', async () => {
    const login = await adminLogin({ username: adminUsername, password: adminPassword });
    const response = await request(app).get('/api/v1/admin/auth/me').set('Authorization', `Bearer ${login.body.data.accessToken}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.admin.username, adminUsername);
    assert.ok(Array.isArray(response.body.data.permissions));
    assert.equal(response.body.data.otp.enabled, false);
  });

  test('rotates and revokes the admin refresh session', async () => {
    const login = await adminLogin({ username: adminUsername, password: adminPassword });
    const cookie = login.headers['set-cookie'];
    const refreshed = await request(app).post('/api/v1/admin/auth/refresh').set('Cookie', cookie);
    assert.equal(refreshed.status, 200);
    assert.ok(refreshed.body.data.accessToken);

    const rotatedCookie = refreshed.headers['set-cookie'];
    const loggedOut = await request(app).post('/api/v1/admin/auth/logout').set('Cookie', rotatedCookie);
    assert.equal(loggedOut.status, 200);
    const afterLogout = await request(app).post('/api/v1/admin/auth/refresh').set('Cookie', rotatedCookie);
    assert.equal(afterLogout.status, 401);
  });

  test('rejects a marketplace refresh cookie on the admin refresh endpoint', async () => {
    const customer = await createCustomer();
    const login = await request(app).post('/api/v1/auth/login').send({ identifier: customer.email, password: customerPassword });
    const marketplaceCookie = String(login.headers['set-cookie']).replace('qavlio_refresh=', 'qavlio_admin_refresh=');
    const response = await request(app).post('/api/v1/admin/auth/refresh').set('Cookie', marketplaceCookie);
    assert.equal(response.status, 401);
  });
});

describe('admin authorization', () => {
  test('an authenticated marketplace customer cannot reach admin endpoints', async () => {
    const customer = await createCustomer();
    for (const path of ['/api/v1/admin/dashboard', '/api/v1/admin/users', '/api/v1/admin/auth-settings', '/api/v1/admin/auth/me']) {
      const response = await request(app).get(path).set('Authorization', `Bearer ${customer.token}`);
      assert.equal(response.status, 403, `${path} must reject a marketplace customer`);
    }
  });

  test('anonymous requests to admin endpoints are unauthorized', async () => {
    const response = await request(app).get('/api/v1/admin/dashboard');
    assert.equal(response.status, 401);
  });

  test('an administrator session can read admin endpoints', async () => {
    const login = await adminLogin({ username: adminUsername, password: adminPassword });
    const token = login.body.data.accessToken;
    const dashboard = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`);
    assert.equal(dashboard.status, 200);
    const settings = await request(app).get('/api/v1/admin/auth-settings').set('Authorization', `Bearer ${token}`);
    assert.equal(settings.status, 200);
    assert.equal(settings.body.data.otpEnabled, false);
  });

  test('the admin OTP toggle is enforced by the backend for marketplace login', async () => {
    const login = await adminLogin({ username: adminUsername, password: adminPassword });
    const token = login.body.data.accessToken;
    const customer = await createCustomer();

    await request(app).patch('/api/v1/admin/auth-settings').set('Authorization', `Bearer ${token}`)
      .send({ otpEnabled: true, otpProvider: 'console', otpRequiredForLogin: true }).expect(200);
    const withOtp = await request(app).post('/api/v1/auth/login').send({ identifier: customer.email, password: customerPassword });
    assert.equal(withOtp.body.data.otpRequired, true);

    await request(app).patch('/api/v1/admin/auth-settings').set('Authorization', `Bearer ${token}`)
      .send({ otpEnabled: false, otpRequiredForLogin: false }).expect(200);
    const withoutOtp = await request(app).post('/api/v1/auth/login').send({ identifier: customer.email, password: customerPassword });
    assert.equal(withoutOtp.body.data.otpRequired, undefined);
    assert.ok(withoutOtp.body.data.accessToken);
  });
});
