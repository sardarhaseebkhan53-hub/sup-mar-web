import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { app } from '../src/app.js';

test('GET /health reports API status', async () => {
  const response = await request(app).get('/health').expect(200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.service, 'qavlio-api');
  assert.ok(response.headers['x-request-id']);
});

test('GET /api/v1/categories returns ordered defaults without MongoDB', async () => {
  const response = await request(app).get('/api/v1/categories').expect(200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.meta.count, 11);
  assert.equal(response.body.data[0].slug, 'vehicles');
});

test('GET /api/v1/search validates, filters, sorts, and paginates demo listings', async () => {
  const response = await request(app).get('/api/v1/search?q=iphone&category=mobiles&location=Islamabad&minPrice=50000&maxPrice=300000&sort=price-asc&page=1&limit=24').expect(200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.pagination.total, 1);
  assert.equal(response.body.data.listings[0].publicId, 'QV-100285');
  assert.ok(Array.isArray(response.body.data.filters));
});

test('GET /api/v1/search rejects invalid limits and query operators', async () => {
  await request(app).get('/api/v1/search?limit=101').expect(422);
  await request(app).get('/api/v1/search?category[$ne]=cars').expect(422);
});

test('GET /api/v1/categories/:slug exposes category discovery data', async () => {
  const category = await request(app).get('/api/v1/categories/cars').expect(200);
  assert.equal(category.body.data.slug, 'cars');
  const children = await request(app).get('/api/v1/categories/cars/subcategories').expect(200);
  assert.equal(children.body.data[0].slug, 'toyota');
});

test('GET /api/v1/config/public returns configurable listing policy defaults', async () => {
  const response = await request(app).get('/api/v1/config/public').expect(200);
  assert.equal(response.body.data.listingPolicy.freeListingLimit, 1);
  assert.deepEqual(response.body.data.listingPolicy.additionalListingFee, { amount: '100', currency: 'PKR' });
  assert.equal(response.body.data.brand.name, 'QAVLIO');
});

test('unknown ad slot returns a validation response', async () => {
  const response = await request(app).get('/api/v1/ads/slots/UNKNOWN').expect(422);
  assert.equal(response.body.code, 'VALIDATION_ERROR');
});

test('unknown route returns consistent JSON error', async () => {
  const response = await request(app).get('/missing').expect(404);
  assert.equal(response.body.code, 'NOT_FOUND');
});
