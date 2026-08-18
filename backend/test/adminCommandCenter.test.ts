import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { beforeEach, test } from 'node:test';
import request from 'supertest';
import { app } from '../src/app.js';
import { getIdentityRepository, resetIdentityRepository } from '../src/repositories/identityRepository.js';
import { createAccessToken } from '../src/services/tokenService.js';
import { resetAdminActivityMemory } from '../src/services/adminActivityService.js';
import { __resetSupportMemory } from '../src/services/supportTicketService.js';
import { resetAnnouncementMemory } from '../src/services/adminAnnouncementService.js';
import { resetSearchAnalyticsMemory } from '../src/services/searchAnalyticsService.js';

async function identity(roles: string[], name = roles[0]) {
  const repo = getIdentityRepository();
  const user: any = await repo.createUser({ name, email: `${crypto.randomUUID()}@example.test`, passwordHash: 'not-used', roles, status: 'active', security: { tokenVersion: 0 }, verification: { email: { status: 'verified' } }, createdAt: new Date(), lastLoginAt: new Date() });
  const session: any = await repo.createSession({ userId: String(user._id), tokenHash: 'test', familyId: crypto.randomUUID(), expiresAt: new Date(Date.now() + 3_600_000), lastActiveAt: new Date() });
  return { id: String(user._id), token: createAccessToken(user, String(session._id)) };
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
beforeEach(() => { resetIdentityRepository(); resetAdminActivityMemory(); __resetSupportMemory(); resetAnnouncementMemory(); resetSearchAnalyticsMemory(); });

test('command center enforces customer, moderator, support, finance and admin permission boundaries', async () => {
  const customer = await identity(['customer']), moderator = await identity(['moderator']), support = await identity(['support']), finance = await identity(['finance']), admin = await identity(['admin']), superAdmin = await identity(['super_admin']);
  await request(app).get('/api/v1/admin/orders').expect(401);
  await request(app).get('/api/v1/admin/dashboard').set(auth(customer.token)).expect(403);
  await request(app).get('/api/v1/admin/trust-safety').set(auth(moderator.token)).expect(200);
  await request(app).get('/api/v1/admin/orders').set(auth(moderator.token)).expect(403);
  await request(app).get('/api/v1/admin/support').set(auth(support.token)).expect(200);
  const supportUserView=await request(app).get(`/api/v1/admin/users/${customer.id}`).set(auth(support.token)).expect(200);assert.equal(supportUserView.body.data.payments,undefined);assert.equal(supportUserView.body.data.orders,undefined);
  await request(app).get('/api/v1/admin/payments').set(auth(support.token)).expect(403);
  await request(app).get('/api/v1/admin/orders').set(auth(finance.token)).expect(200);
  await request(app).get('/api/v1/admin/payments').set(auth(finance.token)).expect(200);
  const financeSearch=await request(app).get('/api/v1/admin/search?q=user').set(auth(finance.token)).expect(200);assert.deepEqual(financeSearch.body.data.users,[]);
  const moderatorAnalytics=await request(app).get('/api/v1/admin/analytics/command-center').set(auth(moderator.token)).expect(200);assert.equal(moderatorAnalytics.body.data.revenue,undefined);
  await request(app).get('/api/v1/admin/users').set(auth(finance.token)).expect(403);
  await request(app).get('/api/v1/admin/ai').set(auth(finance.token)).expect(403);
  await request(app).get('/api/v1/admin/ai').set(auth(admin.token)).expect(200);
  await request(app).patch(`/api/v1/admin/users/${customer.id}/roles`).set(auth(admin.token)).send({ roles: ['customer','finance'], confirmation: 'CHANGE ROLES' }).expect(403);
  await request(app).patch(`/api/v1/admin/users/${customer.id}/roles`).set(auth(superAdmin.token)).send({ roles: ['customer','finance'], confirmation: 'CHANGE ROLES' }).expect(200);
});

test('orders, global search, safe payment data, analytics and CSV exports use real records', async () => {
  const admin = await identity(['super_admin'], 'Command Admin'), seller = await identity(['seller'], 'Order Seller');
  const packages = await request(app).get('/api/v1/monetization/packages').expect(200); const starter = packages.body.data[0];
  const purchase = await request(app).post(`/api/v1/monetization/packages/${starter.id}/purchase`).set(auth(seller.token)).send({ idempotencyKey: crypto.randomUUID() }).expect(201);
  const orderId = purchase.body.data.order.id;
  const list = await request(app).get('/api/v1/admin/orders?type=PACKAGE').set(auth(admin.token)).expect(200);
  assert.ok(list.body.data.orders.some((item: any) => item.id === orderId));
  const detail = await request(app).get(`/api/v1/admin/orders/${orderId}`).set(auth(admin.token)).expect(200);
  assert.equal(detail.body.data.order.type, 'PACKAGE'); assert.equal(detail.body.data.user.id, seller.id);
  const payment = await request(app).get(`/api/v1/admin/payments/${purchase.body.data.payment.id}`).set(auth(admin.token)).expect(200);
  assert.equal(payment.body.data.payment.orderId, orderId); assert.equal(payment.body.data.payment.providerPaymentId, undefined);
  const search = await request(app).get(`/api/v1/admin/search?q=${encodeURIComponent(detail.body.data.order.reference)}`).set(auth(admin.token)).expect(200);
  assert.ok(search.body.data.orders.length);
  const analytics = await request(app).get('/api/v1/admin/analytics/command-center?days=30').set(auth(admin.token)).expect(200);
  assert.ok(analytics.body.data.orders.total >= 1); assert.equal(typeof analytics.body.data.revenue.totalRevenue, 'number');
  const csv = await request(app).get('/api/v1/admin/exports/orders').set(auth(admin.token)).expect(200);
  assert.match(csv.headers['content-type'], /text\/csv/); assert.match(csv.text, /Order/); assert.doesNotMatch(csv.text, /PAYMENT_PROVIDER_SECRET|providerPaymentId/);
});

test('support tickets, internal notes, announcements and immutable audit logs are controlled', async () => {
  const user = await identity(['customer'], 'Support User'), support = await identity(['support'], 'Support Agent'), admin = await identity(['super_admin'], 'Announcement Admin');
  const ticket = await request(app).post('/api/v1/admin/support').set(auth(support.token)).send({ userId: user.id, subject: 'Account access question', category: 'account', description: 'The customer needs help understanding an account restriction.', priority: 'high' }).expect(201);
  await request(app).patch(`/api/v1/admin/support/${ticket.body.data.id}`).set(auth(support.token)).send({ status: 'In Progress', assignedTo: support.id }).expect(200);
  await request(app).post(`/api/v1/admin/support/${ticket.body.data.id}/replies`).set(auth(support.token)).send({ body: 'Internal investigation reference only.', internal: true }).expect(201);
  const detail = await request(app).get(`/api/v1/admin/support/${ticket.body.data.id}`).set(auth(support.token)).expect(200);
  assert.equal(detail.body.data.messages[0].internal, true);
  const publicTickets = await request(app).get('/api/v1/ai/support/tickets').set(auth(user.token)).expect(200);
  assert.doesNotMatch(JSON.stringify(publicTickets.body), /Internal investigation reference only/);
  const startAt = new Date(Date.now() - 1000).toISOString(), endAt = new Date(Date.now() + 86400000).toISOString();
  const announcement = await request(app).post('/api/v1/admin/announcements').set(auth(admin.token)).send({ title: '<b>Maintenance notice</b>', message: '<script>alert(1)</script>QAVLIO will be briefly unavailable.', type: 'Maintenance', audience: 'all', status: 'Active', startAt, endAt }).expect(201);
  assert.doesNotMatch(announcement.body.data.title, /[<>]/); assert.doesNotMatch(announcement.body.data.message, /[<>]/);
  await request(app).post('/api/v1/admin/announcements').set(auth(support.token)).send({ title: 'Not allowed', message: 'Support cannot broadcast this.', type: 'Info', audience: 'all', status: 'Active', startAt, endAt }).expect(403);
  const logs = await request(app).get('/api/v1/admin/audit-logs').set(auth(admin.token)).expect(200);
  assert.ok(logs.body.data.activities.some((item: any) => item.action === 'ADMIN_CREATED_ANNOUNCEMENT'));
  await request(app).delete(`/api/v1/admin/audit-logs/${logs.body.data.activities[0].id}`).set(auth(admin.token)).expect(404);
});
