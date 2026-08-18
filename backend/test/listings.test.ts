import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import request from 'supertest';
import { app } from '../src/app.js';
import { AUTH_PURPOSES } from '../src/constants/account.js';
import { resetIdentityRepository } from '../src/repositories/identityRepository.js';
import { clearDevelopmentOutbox, peekDevelopmentSecret } from '../src/services/authDeliveryService.js';
const password = 'SecurePass123!';
async function seller(phone: string, name: string) {
  await request(app).post('/api/v1/auth/register').send({ method: 'phone', name, phone, password, confirmPassword: password, accountType: 'seller', country: 'PK', city: 'Lahore', language: 'en', termsAccepted: true }).expect(201);
  const normalized = `+92${phone.slice(1)}`; const code = peekDevelopmentSecret(normalized, AUTH_PURPOSES.PHONE_SIGNUP).secret;
  await request(app).post('/api/v1/auth/verify-otp').send({ phone, code, purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(200);
  const login = await request(app).post('/api/v1/auth/login').send({ identifier: normalized, password }).expect(200); const token = login.body.data.accessToken;
  await request(app).patch('/api/v1/users/me/seller-onboarding').set('Authorization', `Bearer ${token}`).send({ accountType: 'individual', businessName: '', displayName: name, description: 'Trusted local QAVLIO seller.', location: { country: 'PK', city: 'Lahore', area: 'DHA' }, contactPreference: 'chat', acceptSellerPolicy: true }).expect(200); return token;
}
beforeEach(() => { resetIdentityRepository(); clearDevelopmentOutbox(); });
test('seller creates, owns, publishes, pauses, resumes, sells and removes a listing', async () => {
  const token = await seller('03001234567', 'Seller One'); const auth = { Authorization: `Bearer ${token}` };
  const created = await request(app).post('/api/v1/listings').set(auth).send({ categorySlug: 'vehicles', subcategorySlug: 'cars', title: 'Toyota Corolla 2022', description: 'Carefully maintained vehicle with complete documents.', price: 6200000, currency: 'PKR', negotiable: true, condition: 'used', attributes: {}, media: [{ url: 'https://images.example.test/car.webp', key: 'demo/car', order: 0, isCover: true }], location: { country: 'PK', city: 'Lahore', area: 'DHA' } }).expect(201);
  const id = created.body.data.publicId; assert.equal(created.body.data.status, 'draft');
  await request(app).post(`/api/v1/listings/${id}/publish`).set(auth).expect(200);
  const detail = await request(app).get(`/api/v1/listings/toyota-corolla-2022-${id.toLowerCase()}`).set(auth).expect(200); assert.equal(detail.body.data.isOwner, true); assert.equal(detail.body.data.seller.displayName, 'Seller One');
  const publicSeller = await request(app).get(`/api/v1/sellers/${detail.body.data.seller.username}`).expect(200); assert.equal(publicSeller.body.data.displayName, 'Seller One');
  const search = await request(app).get('/api/v1/search?q=Toyota%20Corolla%202022').expect(200); assert.ok(search.body.data.listings.some((item) => item.publicId === id));
  await request(app).post(`/api/v1/listings/${id}/pause`).set(auth).expect(200); const paused = await request(app).get(`/api/v1/listings/${id}`).expect(200); assert.equal(paused.body.data.status, 'paused'); await request(app).post(`/api/v1/listings/${id}/resume`).set(auth).expect(200);
  const other = await seller('03009998888', 'Seller Two'); const otherAuth = { Authorization: `Bearer ${other}` };
  await request(app).get(`/api/v1/listings/${id}/favorite`).set(otherAuth).expect(200); await request(app).post(`/api/v1/listings/${id}/favorite`).set(otherAuth).expect(201); await request(app).post(`/api/v1/listings/${id}/favorite`).set(otherAuth).expect(201);
  const favorites = await request(app).get('/api/v1/users/favorites').set(otherAuth).expect(200); assert.equal(favorites.body.data.total, 1); await request(app).delete(`/api/v1/listings/${id}/favorite`).set(otherAuth).expect(200);
  await request(app).post(`/api/v1/listings/${id}/report`).set(otherAuth).send({ reason: 'incorrect', description: 'The model year appears incorrect.' }).expect(201); await request(app).post(`/api/v1/listings/${id}/report`).set(otherAuth).send({ reason: 'incorrect' }).expect(409);
  const conversation = await request(app).post(`/api/v1/listings/${id}/conversation`).set(otherAuth).expect(201); assert.equal(conversation.body.data.ready, true);
  await request(app).patch(`/api/v1/listings/${id}`).set('Authorization', `Bearer ${other}`).send({ title: 'Stolen title' }).expect(404); await request(app).delete(`/api/v1/listings/${id}`).set('Authorization', `Bearer ${other}`).expect(404);
  await request(app).post(`/api/v1/listings/${id}/sold`).set(auth).expect(200); const sold = await request(app).get(`/api/v1/listings/${id}`).expect(200); assert.equal(sold.body.data.status, 'sold'); await request(app).delete(`/api/v1/listings/${id}`).set(auth).expect(200); await request(app).get(`/api/v1/listings/${id}`).expect(410);
});
test('listing endpoints reject guests and incomplete publishing', async () => {
  await request(app).post('/api/v1/listings').send({ title: 'Guest listing' }).expect(401);
  await request(app).post('/api/v1/listings/QV-100285/favorite').expect(401); await request(app).post('/api/v1/listings/QV-100285/report').send({ reason: 'scam' }).expect(401);
  const token = await seller('03001112222', 'Draft Seller'); const auth = { Authorization: `Bearer ${token}` }; const draft = await request(app).post('/api/v1/listings').set(auth).send({ title: 'Incomplete draft' }).expect(201); await request(app).post(`/api/v1/listings/${draft.body.data.publicId}/publish`).set(auth).expect(422);
});
