import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { beforeEach, test } from 'node:test';
import request from 'supertest';
import { app } from '../src/app.js';
import { AUTH_PURPOSES } from '../src/constants/account.js';
import { getIdentityRepository, resetIdentityRepository } from '../src/repositories/identityRepository.js';
import { createAccessToken } from '../src/services/tokenService.js';
import { clearDevelopmentOutbox, peekDevelopmentSecret } from '../src/services/authDeliveryService.js';
import { resetCreditMemory } from '../src/services/creditService.js';
import { resetQuotaMemory } from '../src/services/quotaService.js';
import { resetPromotionAnalyticsMemory } from '../src/services/promotionAnalyticsService.js';
import { sandboxWebhookForTest } from '../src/services/paymentService.js';

const password = 'SecurePass123!';
async function seller(phone: string, name: string) {
  await request(app).post('/api/v1/auth/register').send({ method: 'phone', name, phone, password, confirmPassword: password, accountType: 'seller', country: 'PK', city: 'Lahore', language: 'en', termsAccepted: true }).expect(201);
  const normalized = `+92${phone.slice(1)}`; const code = peekDevelopmentSecret(normalized, AUTH_PURPOSES.PHONE_SIGNUP).secret;
  await request(app).post('/api/v1/auth/verify-otp').send({ phone, code, purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(200);
  const login = await request(app).post('/api/v1/auth/login').send({ identifier: normalized, password }).expect(200); const token = login.body.data.accessToken;
  await request(app).patch('/api/v1/users/me/seller-onboarding').set('Authorization', `Bearer ${token}`).send({ accountType: 'individual', displayName: name, acceptSellerPolicy: true }).expect(200);
  return token;
}
async function superAdmin() {
  const repo = getIdentityRepository();
  const user: any = await repo.createUser({ name: 'Finance Admin', email: `${crypto.randomUUID()}@example.test`, passwordHash: 'not-used', roles: ['super_admin'], status: 'active', security: { tokenVersion: 0 }, verification: { email: { status: 'verified' } }, createdAt: new Date() });
  const session: any = await repo.createSession({ userId: String(user._id), tokenHash: 'test', familyId: crypto.randomUUID(), expiresAt: new Date(Date.now() + 3_600_000), lastActiveAt: new Date() });
  return createAccessToken(user, String(session._id));
}
const listing = (title: string) => ({ categorySlug: 'vehicles', subcategorySlug: 'cars', title, description: 'A complete marketplace listing for monetization security testing.', price: 1500000, currency: 'PKR', condition: 'used', attributes: {}, media: [{ url: 'https://images.example.test/monetization.webp', key: 'test/monetization', order: 0, isCover: true }], location: { country: 'PK', city: 'Lahore', area: 'DHA' } });
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeEach(() => { resetIdentityRepository(); clearDevelopmentOutbox(); resetCreditMemory(); resetQuotaMemory(); resetPromotionAnalyticsMemory(); });

test('package checkout is authoritative and duplicate confirmation grants credits once', async () => {
  const token = await seller('03005550001', 'Package Seller');
  const packages = await request(app).get('/api/v1/monetization/packages').expect(200); const starter = packages.body.data.find((item: any) => item.name === 'Starter');
  const purchase = await request(app).post(`/api/v1/monetization/packages/${starter.id}/purchase`).set(auth(token)).send({ idempotencyKey: crypto.randomUUID(), price: 1, currency: 'USD', listingCredits: 999 }).expect(422);
  assert.equal(purchase.body.code, 'VALIDATION_ERROR');
  const checkout = await request(app).post(`/api/v1/monetization/packages/${starter.id}/purchase`).set(auth(token)).send({ idempotencyKey: crypto.randomUUID() }).expect(201);
  assert.equal(checkout.body.data.payment.amount, starter.price);
  const event = await sandboxWebhookForTest(checkout.body.data.payment.id, 'paid');
  await request(app).post('/api/v1/payments/webhook').set('x-qavlio-signature', event.signature).set('Content-Type', 'application/json').send(event.raw).expect(200);
  const duplicate = await request(app).post('/api/v1/payments/webhook').set('x-qavlio-signature', event.signature).set('Content-Type', 'application/json').send(event.raw).expect(200);
  assert.equal(duplicate.body.data.duplicate, true);
  const overview = await request(app).get('/api/v1/monetization/overview').set(auth(token)).expect(200);
  assert.equal(overview.body.data.wallet.listingCredits, starter.listingCredits);
  assert.equal(overview.body.data.wallet.promotionCredits, starter.promotionCredits);
  await request(app).post('/api/v1/monetization/packages/not-a-package/purchase').set(auth(token)).send({ idempotencyKey: crypto.randomUUID() }).expect(404);
  await request(app).post('/api/v1/monetization/credits').set(auth(token)).send({ listingCredits: 1000 }).expect(404);
});

test('free allowance and listing credits are server enforced and idempotent', async () => {
  const token = await seller('03005550002', 'Credit Seller'); const headers = auth(token);
  const packages = await request(app).get('/api/v1/monetization/packages').expect(200); const starter = packages.body.data.find((item: any) => item.name === 'Starter');
  const checkout = await request(app).post(`/api/v1/monetization/packages/${starter.id}/purchase`).set(headers).send({ idempotencyKey: crypto.randomUUID() }).expect(201);
  await request(app).post(`/api/v1/payments/${checkout.body.data.payment.id}/verify`).set(headers).expect(200);
  const first = await request(app).post('/api/v1/listings').set(headers).send(listing('Quota First Free')).expect(201);
  await request(app).post(`/api/v1/listings/${first.body.data.publicId}/publish`).set(headers).expect(200);
  const second = await request(app).post('/api/v1/listings').set(headers).send(listing('Quota Second Credit')).expect(201);
  const fee = await request(app).post(`/api/v1/listings/${second.body.data.publicId}/publish`).set(headers).expect(200); assert.equal(fee.body.data.paymentRequired, true);
  await request(app).post(`/api/v1/monetization/listings/${second.body.data.publicId}/use-credit`).set(headers).send({}).expect(200);
  await request(app).post(`/api/v1/monetization/listings/${second.body.data.publicId}/use-credit`).set(headers).send({}).expect(200);
  const overview = await request(app).get('/api/v1/monetization/overview').set(headers).expect(200);
  assert.equal(overview.body.data.wallet.listingCredits, starter.listingCredits - 1);
  assert.equal(overview.body.data.quota.freeListingsUsed, 1);
  assert.equal(overview.body.data.quota.paidListingsUsed, 1);
});

test('promotion credits activate once and analytics events are deduplicated', async () => {
  const token = await seller('03005550003', 'Promotion Seller'); const headers = auth(token);
  const packages = await request(app).get('/api/v1/monetization/packages').expect(200); const growth = packages.body.data.find((item: any) => item.name === 'Growth');
  const checkout = await request(app).post(`/api/v1/monetization/packages/${growth.id}/purchase`).set(headers).send({ idempotencyKey: crypto.randomUUID() }).expect(201);
  await request(app).post(`/api/v1/payments/${checkout.body.data.payment.id}/verify`).set(headers).expect(200);
  const created = await request(app).post('/api/v1/listings').set(headers).send(listing('Promoted Analytics Vehicle')).expect(201);
  await request(app).post(`/api/v1/listings/${created.body.data.publicId}/publish`).set(headers).expect(200);
  const products = await request(app).get('/api/v1/promotions/products').expect(200); const product = products.body.data.find((item: any) => item.creditCost === 1);
  const promoted = await request(app).post(`/api/v1/listings/${created.body.data.publicId}/promotions`).set(headers).send({ productKey: product.key, idempotencyKey: crypto.randomUUID(), paymentMethod: 'credits' }).expect(201);
  assert.equal(promoted.body.data.paymentRequired, false); assert.equal(promoted.body.data.promotion.status, 'active');
  const beforeConflict = await request(app).get('/api/v1/monetization/wallet').set(headers).expect(200);
  await request(app).post(`/api/v1/listings/${created.body.data.publicId}/promotions`).set(headers).send({ productKey: product.key, idempotencyKey: crypto.randomUUID(), paymentMethod: 'credits' }).expect(409);
  const afterConflict = await request(app).get('/api/v1/monetization/wallet').set(headers).expect(200); assert.equal(afterConflict.body.data.promotionCredits, beforeConflict.body.data.promotionCredits);
  for (let index = 0; index < 2; index += 1) await request(app).post(`/api/v1/analytics/listings/${created.body.data.publicId}/events`).set(headers).send({ type: 'listing_impression', placement: 'search' }).expect(202);
  await request(app).post(`/api/v1/analytics/listings/${created.body.data.publicId}/events`).set(headers).send({ type: 'listing_click', placement: 'search' }).expect(202);
  const analytics = await request(app).get('/api/v1/monetization/promotions/analytics').set(headers).expect(200);
  assert.equal(analytics.body.data.summary.impressions, 1); assert.equal(analytics.body.data.summary.clicks, 1);
});

test('refund requests require finance authorization and complete through audited states', async () => {
  const token = await seller('03005550004', 'Refund Seller'); const headers = auth(token); const adminToken = await superAdmin();
  const packages = await request(app).get('/api/v1/monetization/packages').expect(200); const starter = packages.body.data.find((item: any) => item.name === 'Starter');
  const checkout = await request(app).post(`/api/v1/monetization/packages/${starter.id}/purchase`).set(headers).send({ idempotencyKey: crypto.randomUUID() }).expect(201);
  const paymentId = checkout.body.data.payment.id;
  await request(app).post(`/api/v1/payments/${paymentId}/verify`).set(headers).expect(200);
  const requested = await request(app).post(`/api/v1/monetization/refunds/${paymentId}`).set(headers).send({ reason: 'The package was purchased by mistake and remains unused.' }).expect(201);
  await request(app).patch(`/api/v1/admin/refunds/${requested.body.data.id}`).set(headers).send({ status: 'Completed', note: 'Unauthorized attempt' }).expect(403);
  await request(app).patch(`/api/v1/admin/refunds/${requested.body.data.id}`).set(auth(adminToken)).send({ status: 'Processing', note: 'Package entitlements are unused.' }).expect(200);
  await request(app).patch(`/api/v1/admin/refunds/${requested.body.data.id}`).set(auth(adminToken)).send({ status: 'Completed', note: 'Provider refund approved.' }).expect(200);
  const wallet = await request(app).get('/api/v1/monetization/wallet').set(headers).expect(200);
  assert.equal(wallet.body.data.listingCredits, 0);
  const detail = await request(app).get(`/api/v1/seller/payments/${paymentId}`).set(headers).expect(200);
  assert.equal(detail.body.data.payment.status, 'refunded');
  assert.equal(detail.body.data.invoice.paymentStatus, 'Refunded');
});
