import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { beforeEach, test } from 'node:test';
import request from 'supertest';
import { app } from '../src/app.js';
import { AUTH_PURPOSES } from '../src/constants/account.js';
import { resetIdentityRepository } from '../src/repositories/identityRepository.js';
import { resetSellerProfileRepository } from '../src/repositories/sellerProfileRepository.js';
import { clearDevelopmentOutbox, peekDevelopmentSecret } from '../src/services/authDeliveryService.js';
import { __resetReviewMemory } from '../src/services/reviewService.js';
import { __resetBlockMemory } from '../src/services/blockService.js';
import { __resetUserReportMemory } from '../src/services/userReportService.js';
import { __resetRiskMemory } from '../src/services/riskAssessmentService.js';

const password = 'SecurePass123!';

async function seller(phone: string, name: string) {
  await request(app).post('/api/v1/auth/register').send({ method: 'phone', name, phone, password, confirmPassword: password, accountType: 'seller', country: 'PK', city: 'Lahore', language: 'en', termsAccepted: true }).expect(201);
  const normalized = `+92${phone.slice(1)}`;
  const code = peekDevelopmentSecret(normalized, AUTH_PURPOSES.PHONE_SIGNUP).secret;
  await request(app).post('/api/v1/auth/verify-otp').send({ phone, code, purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(200);
  const login = await request(app).post('/api/v1/auth/login').send({ identifier: normalized, password }).expect(200);
  const token = login.body.data.accessToken;
  await request(app).patch('/api/v1/users/me/seller-onboarding').set('Authorization', `Bearer ${token}`).send({ accountType: 'individual', businessName: '', displayName: name, description: 'Trusted local QAVLIO seller.', location: { country: 'PK', city: 'Lahore', area: 'DHA' }, contactPreference: 'chat', acceptSellerPolicy: true }).expect(200);
  return { token, user: login.body.data.user };
}

async function listing(token: string, title = 'Honda Civic 2018 Automatic') {
  const created = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${token}`).send({
    categorySlug: 'vehicles', subcategorySlug: 'cars', title, description: 'Carefully maintained vehicle with complete documents.',
    price: 2750000, currency: 'PKR', negotiable: true, condition: 'used', attributes: {},
    media: [{ url: 'https://images.example.test/car.webp', key: `demo/${title}`, order: 0, isCover: true }],
    location: { country: 'PK', city: 'Lahore', area: 'DHA' },
  }).expect(201);
  await request(app).post(`/api/v1/listings/${created.body.data.publicId}/publish`).set('Authorization', `Bearer ${token}`).expect(200);
  return created.body.data.publicId;
}

beforeEach(() => {
  resetIdentityRepository();
  resetSellerProfileRepository();
  clearDevelopmentOutbox();
  __resetReviewMemory();
  __resetBlockMemory();
  __resetUserReportMemory();
  __resetRiskMemory();
});

test('eligible reviewer can create, edit, and delete a review; ratings stay server-side', async () => {
  const owner = await seller('03001234001', 'Trust Seller');
  const buyer = await seller('03001234002', 'Trust Buyer');
  const id = await listing(owner.token);
  const publicSeller = (await request(app).get(`/api/v1/listings/${id}`).expect(200)).body.data.seller;
  await request(app).post(`/api/v1/sellers/${publicSeller.username}/reviews`).set('Authorization', `Bearer ${buyer.token}`).send({ listingId: id, rating: 5, title: 'Great', comment: 'As described.' }).expect(403);
  const conversation = await request(app).post(`/api/v1/listings/${id}/conversation`).set('Authorization', `Bearer ${buyer.token}`).expect(201);
  await request(app).post(`/api/v1/conversations/${conversation.body.data.id}/messages`).set('Authorization', `Bearer ${buyer.token}`).send({ text: 'Is this still available?', attachments: [], clientId: crypto.randomUUID() }).expect(201);
  const created = await request(app).post(`/api/v1/sellers/${publicSeller.username}/reviews`).set('Authorization', `Bearer ${buyer.token}`).send({ listingId: id, rating: 5, title: 'Great car', comment: 'As described on QAVLIO.' }).expect(201);
  assert.equal(created.body.data.rating, 5);
  await request(app).post(`/api/v1/sellers/${publicSeller.username}/reviews`).set('Authorization', `Bearer ${buyer.token}`).send({ listingId: id, rating: 4, title: 'Again', comment: 'Duplicate' }).expect(409);
  const patched = await request(app).patch(`/api/v1/reviews/${created.body.data.id}`).set('Authorization', `Bearer ${buyer.token}`).send({ rating: 4, comment: 'Updated after a second look.' }).expect(200);
  assert.equal(patched.body.data.rating, 4);
  const listed = await request(app).get(`/api/v1/sellers/${publicSeller.username}/reviews`).expect(200);
  assert.equal(listed.body.data.summary.count, 1);
  assert.equal(listed.body.data.summary.average, 4);
  await request(app).delete(`/api/v1/reviews/${created.body.data.id}`).set('Authorization', `Bearer ${buyer.token}`).expect(200);
  const after = await request(app).get(`/api/v1/sellers/${publicSeller.username}/reviews`).expect(200);
  assert.equal(after.body.data.summary.count, 0);
});

test('self-review and reviews without an interaction are rejected', async () => {
  const owner = await seller('03001234003', 'Own Seller');
  const stranger = await seller('03001234004', 'Stranger');
  const id = await listing(owner.token);
  const publicSeller = (await request(app).get(`/api/v1/listings/${id}`).expect(200)).body.data.seller;
  await request(app).post(`/api/v1/sellers/${publicSeller.username}/reviews`).set('Authorization', `Bearer ${owner.token}`).send({ listingId: id, rating: 5, title: 'Me', comment: 'I am great' }).expect(403);
  await request(app).post(`/api/v1/sellers/${publicSeller.username}/reviews`).set('Authorization', `Bearer ${stranger.token}`).send({ listingId: id, rating: 1, title: 'No', comment: 'Never talked' }).expect(403);
});

test('seller can respond only to their own reviews and users can mark helpful once', async () => {
  const owner = await seller('03001234005', 'Reply Seller');
  const buyer = await seller('03001234006', 'Reply Buyer');
  const other = await seller('03001234007', 'Other Seller');
  const id = await listing(owner.token);
  const publicSeller = (await request(app).get(`/api/v1/listings/${id}`).expect(200)).body.data.seller;
  const conversation = await request(app).post(`/api/v1/listings/${id}/conversation`).set('Authorization', `Bearer ${buyer.token}`).expect(201);
  await request(app).post(`/api/v1/conversations/${conversation.body.data.id}/messages`).set('Authorization', `Bearer ${buyer.token}`).send({ text: 'Hello', attachments: [], clientId: crypto.randomUUID() }).expect(201);
  const review = await request(app).post(`/api/v1/sellers/${publicSeller.username}/reviews`).set('Authorization', `Bearer ${buyer.token}`).send({ listingId: id, rating: 5, title: 'Solid', comment: 'Would buy again.' }).expect(201);
  await request(app).post(`/api/v1/reviews/${review.body.data.id}/response`).set('Authorization', `Bearer ${other.token}`).send({ text: 'Not my review' }).expect(403);
  const response = await request(app).post(`/api/v1/reviews/${review.body.data.id}/response`).set('Authorization', `Bearer ${owner.token}`).send({ text: 'Thank you for your feedback.' }).expect(200);
  assert.match(response.body.data.text, /Thank you/);
  await request(app).post(`/api/v1/reviews/${review.body.data.id}/helpful`).set('Authorization', `Bearer ${other.token}`).expect(200);
  const again = await request(app).post(`/api/v1/reviews/${review.body.data.id}/helpful`).set('Authorization', `Bearer ${other.token}`).expect(200);
  assert.equal(again.body.data.helpfulCount, 1);
});

test('review reports and seller reports are private to the reporter and admin', async () => {
  const owner = await seller('03001234008', 'Report Seller');
  const buyer = await seller('03001234009', 'Report Buyer');
  const id = await listing(owner.token);
  const publicSeller = (await request(app).get(`/api/v1/listings/${id}`).expect(200)).body.data.seller;
  const conversation = await request(app).post(`/api/v1/listings/${id}/conversation`).set('Authorization', `Bearer ${buyer.token}`).expect(201);
  await request(app).post(`/api/v1/conversations/${conversation.body.data.id}/messages`).set('Authorization', `Bearer ${buyer.token}`).send({ text: 'Hi', attachments: [], clientId: crypto.randomUUID() }).expect(201);
  const review = await request(app).post(`/api/v1/sellers/${publicSeller.username}/reviews`).set('Authorization', `Bearer ${buyer.token}`).send({ listingId: id, rating: 2, title: 'Okay', comment: 'Fine.' }).expect(201);
  await request(app).post(`/api/v1/reviews/${review.body.data.id}/report`).set('Authorization', `Bearer ${owner.token}`).send({ reason: 'spam', description: 'Looks copied.' }).expect(201);
  await request(app).post(`/api/v1/reviews/${review.body.data.id}/report`).set('Authorization', `Bearer ${owner.token}`).send({ reason: 'spam' }).expect(409);
  const sellerReport = await request(app).post(`/api/v1/users/${publicSeller.username}/report`).set('Authorization', `Bearer ${buyer.token}`).send({ reason: 'suspicious', description: 'Asked for JazzCash off platform.' }).expect(201);
  assert.ok(sellerReport.body.data.id);
  await request(app).get('/api/v1/admin/reviews').set('Authorization', `Bearer ${buyer.token}`).expect(403);
});

test('user block prevents new messages and can be reversed', async () => {
  const owner = await seller('03001234010', 'Block Seller');
  const buyer = await seller('03001234011', 'Block Buyer');
  const id = await listing(owner.token);
  const conversation = await request(app).post(`/api/v1/listings/${id}/conversation`).set('Authorization', `Bearer ${buyer.token}`).expect(201);
  const sellerId = conversation.body.data.sellerId;
  await request(app).post(`/api/v1/conversations/${conversation.body.data.id}/messages`).set('Authorization', `Bearer ${buyer.token}`).send({ text: 'Hello', attachments: [], clientId: crypto.randomUUID() }).expect(201);
  await request(app).post(`/api/v1/users/${sellerId}/block`).set('Authorization', `Bearer ${buyer.token}`).expect(200);
  await request(app).post(`/api/v1/conversations/${conversation.body.data.id}/messages`).set('Authorization', `Bearer ${buyer.token}`).send({ text: 'Still there?', attachments: [], clientId: crypto.randomUUID() }).expect(403);
  await request(app).delete(`/api/v1/users/${sellerId}/block`).set('Authorization', `Bearer ${buyer.token}`).expect(200);
  await request(app).post(`/api/v1/conversations/${conversation.body.data.id}/messages`).set('Authorization', `Bearer ${buyer.token}`).send({ text: 'Unblocked', attachments: [], clientId: crypto.randomUUID() }).expect(201);
});

test('safety center and trust profile stay honest about verification', async () => {
  const owner = await seller('03001234012', 'Badge Seller');
  const id = await listing(owner.token, 'Toyota Corolla Altis');
  const publicSeller = (await request(app).get(`/api/v1/listings/${id}`).expect(200)).body.data.seller;
  const trust = await request(app).get(`/api/v1/sellers/${publicSeller.username}/trust`).expect(200);
  assert.equal(trust.body.data.verified, false);
  assert.equal(trust.body.data.verificationStatus, 'Unverified');
  assert.ok(!trust.body.data.badges.some((item: any) => item.key === 'verified'));
  const safety = await request(app).get('/api/v1/safety').expect(200);
  assert.equal(safety.body.data.overview.title, 'Trade with confidence.');
  const buying = await request(app).get('/api/v1/safety/buying').expect(200);
  assert.match(buying.body.data.title, /Buying Safely/);
});

test('risk assessment flags off-platform payment language without exposing a public score', async () => {
  const owner = await seller('03001234013', 'Risk Seller');
  const created = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${owner.token}`).send({
    categorySlug: 'vehicles', subcategorySlug: 'cars', title: 'Cheap Civic deal',
    description: 'Pay with JazzCash first then I will ship the documents tomorrow morning.',
    price: 120000, currency: 'PKR', negotiable: true, condition: 'used', attributes: {},
    media: [{ url: 'https://images.example.test/risk.webp', key: 'demo/risk', order: 0, isCover: true }],
    location: { country: 'PK', city: 'Lahore', area: 'DHA' },
  }).expect(201);
  await request(app).post(`/api/v1/listings/${created.body.data.publicId}/publish`).set('Authorization', `Bearer ${owner.token}`).expect(200);
  const detail = await request(app).get(`/api/v1/listings/${created.body.data.publicId}`).expect(200);
  assert.equal(detail.body.data.safetyNotice.title, 'Safety notice');
  assert.ok(!JSON.stringify(detail.body.data).includes('riskScore'));
  assert.equal(detail.body.data.verifiedListing, false);
});
