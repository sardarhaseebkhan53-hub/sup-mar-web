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
  assert.equal(response.body.meta.count, 19);
  assert.equal(response.body.data[0].slug, 'cars');
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
