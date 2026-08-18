import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import request from 'supertest';
import { app } from '../src/app.js';
import { AUTH_PURPOSES } from '../src/constants/account.js';
import { resetIdentityRepository } from '../src/repositories/identityRepository.js';
import { clearDevelopmentOutbox, peekDevelopmentSecret } from '../src/services/authDeliveryService.js';
import { resetDiscoveryMemory } from '../src/services/discoveryMemory.js';

const password = 'SecurePass123!';

async function register(phone: string, name: string, seller = false) {
  await request(app).post('/api/v1/auth/register').send({ method: 'phone', name, phone, password, confirmPassword: password, accountType: seller ? 'seller' : 'customer', country: 'PK', city: 'Lahore', language: 'en', termsAccepted: true }).expect(201);
  const normalized = `+92${phone.slice(1)}`;
  const code = peekDevelopmentSecret(normalized, AUTH_PURPOSES.PHONE_SIGNUP).secret;
  await request(app).post('/api/v1/auth/verify-otp').send({ phone, code, purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(200);
  const login = await request(app).post('/api/v1/auth/login').send({ identifier: normalized, password }).expect(200);
  const token = login.body.data.accessToken;
  if (seller) {
    await request(app).patch('/api/v1/users/me/seller-onboarding').set('Authorization', `Bearer ${token}`).send({ accountType: 'individual', businessName: '', displayName: name, description: 'Trusted local QAVLIO seller.', location: { country: 'PK', city: 'Lahore', area: 'DHA' }, contactPreference: 'chat', acceptSellerPolicy: true }).expect(200);
  }
  return { token, auth: { Authorization: `Bearer ${token}` }, userId: login.body.data.user.id };
}

async function publishListing(auth: Record<string, string>, title = 'Used iPhone 14 under test') {
  const created = await request(app).post('/api/v1/listings').set(auth).send({
    categorySlug: 'mobiles', subcategorySlug: 'mobile-phones', title, description: 'Carefully maintained phone with original box and charger.',
    price: 145000, currency: 'PKR', negotiable: false, condition: 'used', attributes: { brand: 'Apple' },
    media: [{ url: 'https://images.example.test/phone.webp', key: 'demo/phone', order: 0, isCover: true }],
    location: { country: 'PK', city: 'Islamabad', area: 'F-7' },
  }).expect(201);
  await request(app).post(`/api/v1/listings/${created.body.data.publicId}/publish`).set(auth).expect(200);
  return created.body.data.publicId as string;
}

beforeEach(() => {
  resetIdentityRepository();
  clearDevelopmentOutbox();
  resetDiscoveryMemory();
});

test('locations are served from the backend, not a frontend dump', async () => {
  const countries = await request(app).get('/api/v1/locations/countries').expect(200);
  assert.equal(countries.body.data[0].code, 'PK');
  const cities = await request(app).get('/api/v1/locations/cities?region=Punjab').expect(200);
  assert.ok(cities.body.data.some((item: any) => item.name === 'Rawalpindi'));
  const search = await request(app).get('/api/v1/locations/search?q=isla').expect(200);
  assert.ok(search.body.data.some((item: any) => item.name === 'Islamabad'));
});

test('favorites save, ignore duplicates, support price alerts, and stay private', async () => {
  const seller = await register('03001234001', 'Seller One', true);
  const buyer = await register('03001234002', 'Buyer One');
  const outsider = await register('03001234003', 'Buyer Two');
  const listingId = await publishListing(seller.auth);
  await request(app).post(`/api/v1/favorites/${listingId}`).expect(401);
  await request(app).post(`/api/v1/favorites/${listingId}`).set(buyer.auth).expect(201);
  await request(app).post(`/api/v1/favorites/${listingId}`).set(buyer.auth).expect(201);
  const list = await request(app).get('/api/v1/favorites').set(buyer.auth).expect(200);
  assert.equal(list.body.data.total, 1);
  assert.equal(list.body.data.listings[0].publicId, listingId);
  await request(app).patch(`/api/v1/favorites/${listingId}`).set(buyer.auth).send({ priceAlertEnabled: true }).expect(200);
  const status = await request(app).get(`/api/v1/favorites/${listingId}`).set(buyer.auth).expect(200);
  assert.equal(status.body.data.saved, true);
  assert.equal(status.body.data.priceAlertEnabled, true);
  const other = await request(app).get('/api/v1/favorites').set(outsider.auth).expect(200);
  assert.equal(other.body.data.total, 0);
  await request(app).post('/api/v1/favorites/bulk-delete').set(buyer.auth).send({ listingIds: [listingId] }).expect(200);
  const empty = await request(app).get('/api/v1/users/favorites').set(buyer.auth).expect(200);
  assert.equal(empty.body.data.total, 0);
  const merged = await request(app).post('/api/v1/favorites/merge').set(buyer.auth).send({ listingIds: [listingId, listingId] }).expect(200);
  assert.equal(merged.body.data.total, 1);
});

test('saved searches are owned, editable, and match only relevant listings', async () => {
  const seller = await register('03001234011', 'Search Seller', true);
  const buyer = await register('03001234012', 'Search Buyer');
  const outsider = await register('03001234013', 'Search Other');
  const created = await request(app).post('/api/v1/saved-searches').set(buyer.auth).send({
    name: 'iPhone under 150k', query: 'iPhone', location: 'Islamabad', maxPrice: 150000, categoryId: 'mobiles', alertEnabled: true, alertFrequency: 'instant',
  }).expect(201);
  const searchId = created.body.data.id;
  await request(app).patch(`/api/v1/saved-searches/${searchId}`).set(outsider.auth).send({ name: 'Hijack' }).expect(404);
  await request(app).patch(`/api/v1/saved-searches/${searchId}`).set(buyer.auth).send({ alertEnabled: false }).expect(200);
  await request(app).patch(`/api/v1/saved-searches/${searchId}`).set(buyer.auth).send({ alertEnabled: true, alertFrequency: 'instant' }).expect(200);
  const listingId = await publishListing(seller.auth, 'Apple iPhone 14 128GB Islamabad');
  const notifications = await request(app).get('/api/v1/notifications').set(buyer.auth).expect(200);
  assert.ok(notifications.body.data.notifications.some((item: any) => item.type === 'saved_search'));
  const again = await publishListing(seller.auth, 'Honda Civic Oriel 2020');
  const after = await request(app).get('/api/v1/notifications').set(buyer.auth).expect(200);
  assert.ok(!after.body.data.notifications.some((item: any) => item.body?.includes('Honda Civic')));
  await request(app).post(`/api/v1/saved-searches/${searchId}/test`).set(buyer.auth).expect(200);
  await request(app).delete(`/api/v1/saved-searches/${searchId}`).set(buyer.auth).expect(200);
  assert.ok(listingId && again);
});

test('price history records only real changes and sold listings stop price alerts', async () => {
  const seller = await register('03001234021', 'Price Seller', true);
  const buyer = await register('03001234022', 'Price Buyer');
  const listingId = await publishListing(seller.auth);
  await request(app).post(`/api/v1/favorites/${listingId}`).set(buyer.auth).expect(201);
  await request(app).patch(`/api/v1/favorites/${listingId}`).set(buyer.auth).send({ priceAlertEnabled: true }).expect(200);
  await request(app).patch(`/api/v1/listings/${listingId}`).set(seller.auth).send({ price: 145000 }).expect(200);
  let history = await request(app).get(`/api/v1/listings/${listingId}/price-history`).expect(200);
  assert.equal(history.body.data.history.length, 0);
  await request(app).patch(`/api/v1/listings/${listingId}`).set(seller.auth).send({ price: 139000 }).expect(200);
  history = await request(app).get(`/api/v1/listings/${listingId}/price-history`).expect(200);
  assert.equal(history.body.data.history.length, 1);
  assert.equal(history.body.data.priceDrop.amount, 6000);
  const detail = await request(app).get(`/api/v1/listings/${listingId}`).expect(200);
  assert.equal(detail.body.data.priceDrop.previousPrice, 145000);
  const notes = await request(app).get('/api/v1/notifications').set(buyer.auth).expect(200);
  assert.ok(notes.body.data.notifications.some((item: any) => item.type === 'price_alert' && item.title === 'Price dropped!'));
  await request(app).post(`/api/v1/listings/${listingId}/sold`).set(seller.auth).expect(200);
  await request(app).patch(`/api/v1/listings/${listingId}`).set(seller.auth).send({ price: 100000 }).expect(200);
  const afterSold = await request(app).get('/api/v1/notifications').set(buyer.auth).expect(200);
  assert.equal(afterSold.body.data.notifications.filter((item: any) => item.type === 'price_alert').length, 1);
  assert.ok(afterSold.body.data.notifications.some((item: any) => item.type === 'listing_status'));
});

test('follows, recently viewed limits, recent searches, and authorization hold', async () => {
  const seller = await register('03001234031', 'Follow Seller', true);
  const buyer = await register('03001234032', 'Follow Buyer');
  const outsider = await register('03001234033', 'Follow Other');
  const listingId = await publishListing(seller.auth, 'Followed seller iPhone 13');
  const publicListing = await request(app).get(`/api/v1/listings/${listingId}`).expect(200);
  const username = publicListing.body.data.seller.username;
  await request(app).post(`/api/v1/follows/${username}`).set(buyer.auth).expect(201);
  await request(app).post(`/api/v1/follows/${username}`).set(buyer.auth).expect(201);
  const mine = await request(app).get('/api/v1/following').set(buyer.auth).expect(200);
  assert.equal(mine.body.data.total, 1);
  const other = await request(app).get('/api/v1/following').set(outsider.auth).expect(200);
  assert.equal(other.body.data.total, 0);
  await request(app).delete(`/api/v1/follows/${username}`).set(outsider.auth).expect(200);
  const still = await request(app).get('/api/v1/following').set(buyer.auth).expect(200);
  assert.equal(still.body.data.total, 1);
  await request(app).post(`/api/v1/recently-viewed/${listingId}`).set(buyer.auth).expect(201);
  const viewed = await request(app).get('/api/v1/recently-viewed').set(buyer.auth).expect(200);
  assert.equal(viewed.body.data[0].publicId, listingId);
  await request(app).delete('/api/v1/recently-viewed').set(buyer.auth).expect(200);
  const cleared = await request(app).get('/api/v1/users/recently-viewed').set(buyer.auth).expect(200);
  assert.equal(cleared.body.data.length, 0);
  await request(app).post('/api/v1/recent-searches').set(buyer.auth).send({ query: 'iPhone 15' }).expect(201);
  const searches = await request(app).get('/api/v1/recent-searches').set(buyer.auth).expect(200);
  assert.equal(searches.body.data[0].query, 'iPhone 15');
  await request(app).delete('/api/v1/recent-searches').set(buyer.auth).expect(200);
  const prefs = await request(app).get('/api/v1/notification-preferences').set(buyer.auth).expect(200);
  assert.equal(prefs.body.data.priceAlerts, true);
  await request(app).patch('/api/v1/notification-preferences').set(buyer.auth).send({ priceAlerts: false, savedSearchAlerts: false }).expect(200);
  const home = await request(app).get('/api/v1/discovery/home?city=Islamabad').set(buyer.auth).expect(200);
  assert.ok(Array.isArray(home.body.data.sections));
});

test('daily saved-search alerts digest instead of per-listing spam', async () => {
  const seller = await register('03001234041', 'Digest Seller', true);
  const buyer = await register('03001234042', 'Digest Buyer');
  await request(app).post('/api/v1/saved-searches').set(buyer.auth).send({
    name: 'Phones', query: 'iPhone', location: 'Islamabad', maxPrice: 200000, categoryId: 'mobiles', alertEnabled: true, alertFrequency: 'daily',
  }).expect(201);
  await publishListing(seller.auth, 'Apple iPhone 12 daily one');
  await publishListing(seller.auth, 'Apple iPhone 12 daily two');
  const notes = await request(app).get('/api/v1/notifications').set(buyer.auth).expect(200);
  const digests = notes.body.data.notifications.filter((item: any) => item.type === 'saved_search');
  assert.equal(digests.length, 1);
  assert.match(digests[0].title, /new listing/i);
});
