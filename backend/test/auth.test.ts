import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import request from 'supertest';
import { app } from '../src/app.js';
import { ACCOUNT_STATUSES, AUTH_PURPOSES, VERIFICATION_STATES } from '../src/constants/account.js';
import { USER_ROLES } from '../src/constants/roles.js';
import { getIdentityRepository, resetIdentityRepository } from '../src/repositories/identityRepository.js';
import { clearDevelopmentOutbox, peekDevelopmentSecret } from '../src/services/authDeliveryService.js';
import { hashPassword } from '../src/services/passwordService.js';
import { authSettingsService } from '../src/services/authSettingsService.js';
import { enableOtpForTests } from './helpers/otp.js';

const strongPassword = 'SecurePass123!';
const emailRegistration = (overrides = {}) => ({ method: 'email', name: 'Areeba Khan', email: 'areeba@example.com', password: strongPassword, confirmPassword: strongPassword, accountType: 'customer', country: 'PK', city: 'Rawalpindi', language: 'en', termsAccepted: true, ...overrides });
const phoneRegistration = (overrides = {}) => ({ method: 'phone', name: 'Hamza Ali', phone: '03001234567', password: strongPassword, confirmPassword: strongPassword, accountType: 'seller', country: 'PK', city: 'Lahore', language: 'en', termsAccepted: true, ...overrides });

beforeEach(async () => {
  resetIdentityRepository();
  clearDevelopmentOutbox();
  await enableOtpForTests();
});

async function registerAndVerifyEmail(overrides = {}) {
  const body = emailRegistration(overrides);
  await request(app).post('/api/v1/auth/register').send(body).expect(201);
  const delivery = peekDevelopmentSecret(body.email, AUTH_PURPOSES.EMAIL_VERIFICATION);
  assert.ok(delivery?.secret);
  await request(app).post('/api/v1/auth/verify-email').send({ email: body.email, token: delivery.secret }).expect(200);
  return body;
}

async function login(identifier = 'areeba@example.com', password = strongPassword, agent = request.agent(app)) {
  const response = await agent.post('/api/v1/auth/login').send({ identifier, password, remember: true });
  return { response, agent, accessToken: response.body.data?.accessToken };
}

describe('email registration and verification', () => {
  test('with OTP disabled by admin, accounts are active immediately and sign in succeeds', async () => {
    await authSettingsService.update({ otpEnabled: false, otpRequiredForSignup: false, otpRequiredForLogin: false, otpRequiredForPasswordReset: false });
    const created = await request(app).post('/api/v1/auth/register').send(emailRegistration({ email: 'no-otp@example.com' })).expect(201);
    assert.equal(created.body.data.user.status, ACCOUNT_STATUSES.ACTIVE);
    assert.equal(created.body.data.user.verification.email.status, VERIFICATION_STATES.VERIFIED);
    const result = await request(app).post('/api/v1/auth/login').send({ identifier: 'no-otp@example.com', password: strongPassword });
    assert.equal(result.status, 200);
    assert.ok(result.body.data.accessToken);
  });

  test('registers, rejects duplicates, verifies email, and signs in', async () => {
    const created = await request(app).post('/api/v1/auth/register').send(emailRegistration({ phone: '03121234567' })).expect(201);
    assert.equal(created.body.data.user.status, ACCOUNT_STATUSES.PENDING_VERIFICATION);
    assert.equal(created.body.data.user.phone, '+923121234567');
    assert.equal(created.body.data.user.roles[0], USER_ROLES.CUSTOMER);

    await request(app).post('/api/v1/auth/register').send(emailRegistration()).expect(409);
    await request(app).post('/api/v1/auth/verify-email').send({ email: 'areeba@example.com', token: 'invalid-token-that-is-long-enough' }).expect(400);

    const delivery = peekDevelopmentSecret('areeba@example.com', AUTH_PURPOSES.EMAIL_VERIFICATION);
    const verified = await request(app).get('/api/v1/auth/verify-email').query({ target: 'areeba@example.com', token: delivery.secret }).expect(200);
    assert.equal(verified.body.data.user.status, ACCOUNT_STATUSES.ACTIVE);
    assert.equal(verified.body.data.user.verification.email.status, VERIFICATION_STATES.VERIFIED);
    const resendVerified = await request(app).post('/api/v1/auth/resend-verification').send({ email: 'areeba@example.com' }).expect(200);
    assert.equal(resendVerified.body.data.alreadyVerified, true);

    const result = await login();
    assert.equal(result.response.status, 200);
    assert.ok(result.accessToken);
    assert.match(result.response.headers['set-cookie'][0], /HttpOnly/);

    const profile = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${result.accessToken}`).expect(200);
    const authProfile = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${result.accessToken}`).expect(200);
    assert.equal(authProfile.body.data.email, 'areeba@example.com');
    assert.equal(profile.body.data.email, 'areeba@example.com');
    assert.equal(profile.body.data.passwordHash, undefined);
    assert.equal(profile.body.data.avatarKey, undefined);
    assert.equal(profile.body.data.security, undefined);
  });

  test('rejects weak/mismatched credentials without leaking internals', async () => {
    const weak = await request(app).post('/api/v1/auth/register').send(emailRegistration({ password: 'weak', confirmPassword: 'different' })).expect(422);
    assert.equal(weak.body.code, 'VALIDATION_ERROR');
    await request(app).post('/api/v1/auth/register').send(emailRegistration({ password: 'NoSpecial123', confirmPassword: 'NoSpecial123' })).expect(422);
    await request(app).post('/api/v1/auth/register').send(emailRegistration({ termsAccepted: undefined })).expect(422);
    await registerAndVerifyEmail();
    const wrong = await request(app).post('/api/v1/auth/login').send({ identifier: 'areeba@example.com', password: 'wrong' }).expect(401);
    assert.equal(wrong.body.code, 'INVALID_CREDENTIALS');
    assert.equal(JSON.stringify(wrong.body).includes('passwordHash'), false);
  });
});

describe('phone OTP verification', () => {
  test('normalizes Pakistan numbers, handles incorrect OTP, and activates seller', async () => {
    const created = await request(app).post('/api/v1/auth/register').send(phoneRegistration()).expect(201);
    assert.equal(created.body.data.verification.normalizedTarget, '+923001234567');
    assert.ok(created.body.data.user.roles.includes(USER_ROLES.SELLER));
    const duplicate = await request(app).post('/api/v1/auth/register').send(phoneRegistration()).expect(409);
    assert.equal(duplicate.body.code, 'PHONE_EXISTS');

    const wrong = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '03001234567', code: '000000', purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(400);
    assert.equal(wrong.body.code, 'OTP_INVALID');

    const delivery = peekDevelopmentSecret('+923001234567', AUTH_PURPOSES.PHONE_SIGNUP);
    const verified = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '03001234567', code: delivery.secret, purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(200);
    assert.equal(verified.body.data.user.verification.phone.status, VERIFICATION_STATES.VERIFIED);
    assert.equal(verified.body.data.user.status, ACCOUNT_STATUSES.ACTIVE);
  });

  test('rejects expired OTP and enforces resend cooldown', async () => {
    await request(app).post('/api/v1/auth/register').send(phoneRegistration()).expect(201);
    const repository = getIdentityRepository();
    const challenge = await repository.findLatestChallenge('+923001234567', AUTH_PURPOSES.PHONE_SIGNUP);
    const secret = peekDevelopmentSecret('+923001234567', AUTH_PURPOSES.PHONE_SIGNUP).secret;
    await repository.updateChallenge(challenge._id, { expiresAt: new Date(Date.now() - 1000) });
    const expired = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '03001234567', code: secret, purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(410);
    assert.equal(expired.body.code, 'OTP_EXPIRED');

    await request(app).post('/api/v1/auth/register').send(phoneRegistration({ phone: '03009998888', name: 'Second User' })).expect(201);
    const cooldown = await request(app).post('/api/v1/auth/resend-otp').send({ target: '+923009998888', purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(429);
    assert.equal(cooldown.body.code, 'OTP_RATE_LIMITED');
  });

  test('temporarily locks OTP after the maximum incorrect attempts', async () => {
    await request(app).post('/api/v1/auth/register').send(phoneRegistration()).expect(201);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await request(app).post('/api/v1/auth/verify-otp').send({ phone: '03001234567', code: '000000', purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(400);
    }
    const locked = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '03001234567', code: '000000', purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(423);
    assert.equal(locked.body.code, 'OTP_ATTEMPTS_EXCEEDED');
    const correct = peekDevelopmentSecret('+923001234567', AUTH_PURPOSES.PHONE_SIGNUP).secret;
    const stillLocked = await request(app).post('/api/v1/auth/verify-otp').send({ phone: '03001234567', code: correct, purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(423);
    assert.equal(stillLocked.body.code, 'OTP_LOCKED');
  });
});

describe('password recovery and sessions', () => {
  test('rejects an untrusted browser origin on cookie-authenticated routes', async () => {
    const response = await request(app).post('/api/v1/auth/refresh').set('Origin', 'https://attacker.example').expect(403);
    assert.equal(response.body.code, 'ORIGIN_NOT_ALLOWED');
  });

  test('resets password once and invalidates existing sessions', async () => {
    await registerAndVerifyEmail();
    const signedIn = await login();
    await request(app).post('/api/v1/auth/forgot-password').send({ identifier: 'areeba@example.com' }).expect(200);
    const resetDelivery = peekDevelopmentSecret('areeba@example.com', AUTH_PURPOSES.PASSWORD_RESET_EMAIL);
    await request(app).post('/api/v1/auth/reset-password').send({ identifier: 'areeba@example.com', tokenOrCode: resetDelivery.secret, password: 'NewSecurePass456!', confirmPassword: 'NewSecurePass456!' }).expect(200);

    await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${signedIn.accessToken}`).expect(401);
    await request(app).post('/api/v1/auth/reset-password').send({ identifier: 'areeba@example.com', tokenOrCode: resetDelivery.secret, password: 'AnotherPass789!', confirmPassword: 'AnotherPass789!' }).expect(400);
    await request(app).post('/api/v1/auth/login').send({ identifier: 'areeba@example.com', password: 'NewSecurePass456!' }).expect(200);
  });

  test('rejects an expired password reset token', async () => {
    await registerAndVerifyEmail();
    await request(app).post('/api/v1/auth/forgot-password').send({ identifier: 'areeba@example.com' }).expect(200);
    const repository = getIdentityRepository();
    const challenge = await repository.findLatestChallenge('areeba@example.com', AUTH_PURPOSES.PASSWORD_RESET_EMAIL);
    const token = peekDevelopmentSecret('areeba@example.com', AUTH_PURPOSES.PASSWORD_RESET_EMAIL).secret;
    await repository.updateChallenge(challenge._id, { expiresAt: new Date(Date.now() - 1000) });
    const response = await request(app).post('/api/v1/auth/reset-password').send({ identifier: 'areeba@example.com', tokenOrCode: token, password: 'NewSecurePass456!', confirmPassword: 'NewSecurePass456!' }).expect(410);
    assert.equal(response.body.code, 'OTP_EXPIRED');
  });

  test('lists, revokes, refreshes, and logs out all devices', async () => {
    await registerAndVerifyEmail();
    const first = await login();
    const second = await login('areeba@example.com', strongPassword, request.agent(app));
    const sessions = await request(app).get('/api/v1/users/sessions').set('Authorization', `Bearer ${first.accessToken}`).expect(200);
    assert.equal(sessions.body.data.length, 2);

    const other = sessions.body.data.find((session) => !session.current);
    await request(app).delete(`/api/v1/users/sessions/${other.id}`).set('Authorization', `Bearer ${first.accessToken}`).expect(200);
    await second.agent.post('/api/v1/auth/refresh').expect(401);

    const refreshed = await first.agent.post('/api/v1/auth/refresh').expect(200);
    assert.ok(refreshed.body.data.accessToken);
    await request(app).delete('/api/v1/users/sessions/all').set('Authorization', `Bearer ${refreshed.body.data.accessToken}`).expect(200);
    await first.agent.post('/api/v1/auth/refresh').expect(401);
  });

  test('logout revokes the refresh session', async () => {
    await registerAndVerifyEmail();
    const signedIn = await login();
    await signedIn.agent.post('/api/v1/auth/logout').expect(200);
    await signedIn.agent.post('/api/v1/auth/refresh').expect(401);
  });
});

describe('profile, seller onboarding, and account linking', () => {
  test('updates the profile and activates seller tools without granting trust badges', async () => {
    await registerAndVerifyEmail();
    const signedIn = await login();
    const profile = await request(app).patch('/api/v1/users/me').set('Authorization', `Bearer ${signedIn.accessToken}`).send({ username: 'areeba.market', about: 'Local buyer and seller', language: 'ur', location: { city: 'Islamabad', area: 'F-10' } }).expect(200);
    assert.equal(profile.body.data.username, 'areeba.market');
    assert.equal(profile.body.data.location.city, 'Islamabad');

    const seller = await request(app).patch('/api/v1/users/me/seller-onboarding').set('Authorization', `Bearer ${signedIn.accessToken}`).send({ accountType: 'individual', businessName: '', acceptSellerPolicy: true }).expect(200);
    assert.ok(seller.body.data.roles.includes(USER_ROLES.SELLER));
    assert.equal(seller.body.data.seller.status, 'active');
    assert.notEqual(seller.body.data.verification.trustedSeller?.status, VERIFICATION_STATES.VERIFIED);
    const sellerProfile = await request(app).get('/api/v1/sellers/profile').set('Authorization', `Bearer ${signedIn.accessToken}`).expect(200);
    assert.equal(sellerProfile.body.data.displayName, 'Areeba Khan');
    assert.equal(sellerProfile.body.data.email, undefined);
    assert.equal(sellerProfile.body.data.phone, undefined);
    const updatedSeller = await request(app).patch('/api/v1/sellers/profile').set('Authorization', `Bearer ${signedIn.accessToken}`).send({ description: 'Careful local seller', contactPreference: 'chat_and_call' }).expect(200);
    assert.equal(updatedSeller.body.data.contactPreference, 'chat_and_call');
    const profileAlias = await request(app).get('/api/v1/users/profile').set('Authorization', `Bearer ${signedIn.accessToken}`).expect(200);
    assert.equal(profileAlias.body.data.username, 'areeba.market');
    const mediaUnavailable = await request(app).post('/api/v1/users/avatar/upload-intent').set('Authorization', `Bearer ${signedIn.accessToken}`).send({ fileName: 'avatar.webp', fileType: 'image/webp', fileSize: 1024 }).expect(503);
    assert.equal(mediaUnavailable.body.code, 'MEDIA_PROVIDER_UNAVAILABLE');
  });

  test('requires re-authentication, OTP, warning confirmation, and review for account linking', async () => {
    await registerAndVerifyEmail();
    await request(app).post('/api/v1/auth/register').send(phoneRegistration()).expect(201);
    const phoneCode = peekDevelopmentSecret('+923001234567', AUTH_PURPOSES.PHONE_SIGNUP).secret;
    await request(app).post('/api/v1/auth/verify-otp').send({ phone: '03001234567', code: phoneCode, purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(200);
    const signedIn = await login();

    const initiated = await request(app).post('/api/v1/account-links/initiate').set('Authorization', `Bearer ${signedIn.accessToken}`).send({ phone: '03001234567', password: strongPassword }).expect(201);
    assert.equal(initiated.body.data.warning.includes('never merged automatically'), true);
    const linkCode = peekDevelopmentSecret('+923001234567', AUTH_PURPOSES.ACCOUNT_LINK).secret;
    const confirmed = await request(app).post('/api/v1/account-links/confirm').set('Authorization', `Bearer ${signedIn.accessToken}`).send({ linkRequestId: initiated.body.data.linkRequestId, code: linkCode, confirmation: 'LINK ACCOUNTS' }).expect(200);
    assert.equal(confirmed.body.data.status, 'ready_for_review');
  });

  test('soft-deactivates an account only after password and explicit confirmation', async () => {
    await registerAndVerifyEmail();
    const signedIn = await login();
    await request(app).delete('/api/v1/users/me').set('Authorization', `Bearer ${signedIn.accessToken}`).send({ password: 'wrong', confirmation: 'DELETE' }).expect(401);
    const deleted = await request(app).delete('/api/v1/users/me').set('Authorization', `Bearer ${signedIn.accessToken}`).send({ password: strongPassword, confirmation: 'DELETE' }).expect(200);
    assert.match(deleted.body.data.message, /deactivated/i);
    const loginResponse = await request(app).post('/api/v1/auth/login').send({ identifier: 'areeba@example.com', password: strongPassword }).expect(403);
    assert.equal(loginResponse.body.code, 'ACCOUNT_DEACTIVATED');
  });

  test('permanently soft-deletes and anonymizes an account through the explicit account endpoint', async () => {
    await registerAndVerifyEmail();
    const signedIn = await login();
    await request(app).delete('/api/v1/users/account').set('Authorization', `Bearer ${signedIn.accessToken}`).send({ password: strongPassword, confirmation: 'DELETE' }).expect(422);
    const result = await request(app).delete('/api/v1/users/account').set('Authorization', `Bearer ${signedIn.accessToken}`).send({ password: strongPassword, confirmation: 'DELETE ACCOUNT' }).expect(200);
    assert.match(result.body.data.message, /deleted/i);
    const repository = getIdentityRepository();
    const records = await repository.listUsers({ status: ACCOUNT_STATUSES.DELETED });
    assert.equal(records.length, 1);
    assert.match(records[0].email, /deleted\.qavlio\.invalid$/);
  });
});

describe('account status and admin authorization', () => {
  test('blocks unverified, suspended, and banned accounts', async () => {
    await request(app).post('/api/v1/auth/register').send(emailRegistration()).expect(201);
    await request(app).post('/api/v1/auth/login').send({ identifier: 'areeba@example.com', password: strongPassword }).expect(403);
    const delivery = peekDevelopmentSecret('areeba@example.com', AUTH_PURPOSES.EMAIL_VERIFICATION);
    await request(app).post('/api/v1/auth/verify-email').send({ email: 'areeba@example.com', token: delivery.secret }).expect(200);
    const repository = getIdentityRepository();
    const user = await repository.findUserByEmail('areeba@example.com');
    await repository.updateUser(user._id, { status: ACCOUNT_STATUSES.SUSPENDED });
    const suspended = await request(app).post('/api/v1/auth/login').send({ identifier: 'areeba@example.com', password: strongPassword }).expect(403);
    assert.equal(suspended.body.code, 'ACCOUNT_SUSPENDED');
    await repository.updateUser(user._id, { status: ACCOUNT_STATUSES.BANNED });
    const banned = await request(app).post('/api/v1/auth/login').send({ identifier: 'areeba@example.com', password: strongPassword }).expect(403);
    assert.equal(banned.body.code, 'ACCOUNT_BANNED');
  });

  test('enforces server-side admin role and confirmation', async () => {
    await registerAndVerifyEmail();
    const customer = await login();
    await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${customer.accessToken}`).expect(403);

    const repository = getIdentityRepository();
    await repository.createUser({
      name: 'QAVLIO Admin', username: 'admin', email: 'admin@qavlio.pk', passwordHash: await hashPassword(strongPassword),
      roles: [USER_ROLES.ADMIN], status: ACCOUNT_STATUSES.ACTIVE,
      verification: { email: { status: VERIFICATION_STATES.VERIFIED, verifiedAt: new Date() } },
      security: { failedLoginCount: 0, tokenVersion: 0 }, preferences: { language: 'en', notifications: {} }, location: { country: 'PK', city: 'Rawalpindi' },
    });
    const adminLogin = await login('admin@qavlio.pk');
    const users = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${adminLogin.accessToken}`).expect(200);
    assert.equal(users.body.data.length, 2);
    const customerUser = users.body.data.find((record) => record.email === 'areeba@example.com');

    const privilegedEscalation = await request(app).patch(`/api/v1/admin/users/${customerUser.id}/roles`).set('Authorization', `Bearer ${adminLogin.accessToken}`).send({ roles: ['customer', 'super_admin'], confirmation: 'CHANGE ROLES' }).expect(403);
    assert.equal(privilegedEscalation.body.code, 'SUPER_ADMIN_REQUIRED');

    const missingConfirmation = await request(app).patch(`/api/v1/admin/users/${customerUser.id}/status`).set('Authorization', `Bearer ${adminLogin.accessToken}`).send({ status: 'suspended', reason: 'Security review', confirmation: 'NO' }).expect(422);
    assert.equal(missingConfirmation.body.code, 'CONFIRMATION_REQUIRED');
    const suspended = await request(app).patch(`/api/v1/admin/users/${customerUser.id}/status`).set('Authorization', `Bearer ${adminLogin.accessToken}`).send({ status: 'suspended', reason: 'Security review', confirmation: 'SUSPENDED' }).expect(200);
    assert.equal(suspended.body.data.status, ACCOUNT_STATUSES.SUSPENDED);
  });
});
