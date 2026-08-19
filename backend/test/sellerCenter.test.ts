import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { beforeEach, test } from 'node:test';
import request from 'supertest';
import { app } from '../src/app.js';
import { AUTH_PURPOSES } from '../src/constants/account.js';
import { getIdentityRepository, resetIdentityRepository } from '../src/repositories/identityRepository.js';
import { clearDevelopmentOutbox, peekDevelopmentSecret } from '../src/services/authDeliveryService.js';
import { resetCreditMemory } from '../src/services/creditService.js';
import { resetQuotaMemory } from '../src/services/quotaService.js';
import { enableOtpForTests } from './helpers/otp.js';
import { resetPromotionAnalyticsMemory } from '../src/services/promotionAnalyticsService.js';
import { resetSellerProfileRepository } from '../src/repositories/sellerProfileRepository.js';
import { __resetLeadMemory } from '../src/services/leadService.js';
import { __resetTemplateMemory } from '../src/services/messageTemplateService.js';
import { __resetSellerScopeMemory } from '../src/services/sellerScopeService.js';

const password = 'SecurePass123!';

async function register(phone: string, name: string): Promise<{ token: string; userId: string }> {
  await request(app).post('/api/v1/auth/register').send({ method: 'phone', name, phone, password, confirmPassword: password, accountType: 'customer', country: 'PK', city: 'Lahore', language: 'en', termsAccepted: true }).expect(201);
  const normalized = `+92${phone.slice(1)}`;
  const code = peekDevelopmentSecret(normalized, AUTH_PURPOSES.PHONE_SIGNUP).secret;
  await request(app).post('/api/v1/auth/verify-otp').send({ phone, code, purpose: AUTH_PURPOSES.PHONE_SIGNUP }).expect(200);
  const login = await request(app).post('/api/v1/auth/login').send({ identifier: normalized, password }).expect(200);
  return { token: login.body.data.accessToken, userId: String(login.body.data.user.id || login.body.data.user._id) };
}

async function seller(phone: string, name: string, accountType: 'individual' | 'business' = 'individual') {
  const { token } = await register(phone, name);
  await request(app).patch('/api/v1/users/me/seller-onboarding').set('Authorization', `Bearer ${token}`).send({ accountType, displayName: name, acceptSellerPolicy: true }).expect(200);
  return token;
}

const listing = (title: string) => ({ categorySlug: 'vehicles', subcategorySlug: 'cars', title, description: 'A complete marketplace listing for the seller center test suite.', price: 1500000, currency: 'PKR', condition: 'used', attributes: {}, media: [{ url: 'https://images.example.test/seller-center.webp', key: 'test/seller-center', order: 0, isCover: true }], location: { country: 'PK', city: 'Lahore', area: 'DHA' } });
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function publish(headers: Record<string, string>, body: any) {
  const created = await request(app).post('/api/v1/listings').set(headers).send(body).expect(201);
  const publicId = created.body.data.publicId;
  let result: any = await request(app).post(`/api/v1/listings/${publicId}/publish`).set(headers).expect(200);
  if (result.body.data?.paymentRequired) {
    const paymentId = result.body.data.payment.id;
    const { sandboxWebhookForTest } = await import('../src/services/paymentService.js');
    const event = await sandboxWebhookForTest(paymentId, 'paid');
    await request(app).post('/api/v1/payments/webhook').set('x-qavlio-signature', event.signature).set('Content-Type', 'application/json').send(event.raw).expect(200);
    result = await request(app).post(`/api/v1/listings/${publicId}/publish`).set(headers).expect(200);
    assert.ok(!result.body.data?.paymentRequired, 'listing should publish after payment');
  }
  return publicId;
}

beforeEach(async () => {
  resetIdentityRepository(); clearDevelopmentOutbox(); resetCreditMemory(); resetQuotaMemory();
  resetPromotionAnalyticsMemory(); resetSellerProfileRepository(); __resetLeadMemory(); __resetTemplateMemory(); __resetSellerScopeMemory();
  await enableOtpForTests();
});

/* -------------------------------- dashboard -------------------------------- */

test('seller dashboard returns real counts and an honest basis line', async () => {
  const token = await seller('03335550001', 'Center Seller');
  const headers = auth(token);
  await publish(headers, listing('Dashboard Sedan'));
  const response = await request(app).get('/api/v1/seller/dashboard?window=7days').set(headers).expect(200);
  const cards = response.body.data.cards;
  assert.equal(cards.activeListings, 1);
  assert.ok(Number.isFinite(cards.views));
  assert.equal(cards.leads, 0);
  assert.match(response.body.data.basis, /real QAVLIO/i);
  assert.ok(Array.isArray(response.body.data.onboarding.steps));
});

test('dashboard performance window lists listing metrics with tracking notes', async () => {
  const token = await seller('03335550002', 'Perf Seller');
  const response = await request(app).get('/api/v1/seller/dashboard/performance?window=30days').set(auth(token)).expect(200);
  assert.ok(response.body.data.totals.views >= 0);
  assert.match(response.body.data.totals.callsNote, /invented/i);
  assert.ok(Array.isArray(response.body.data.listings));
});

/* ------------------------------ bulk listings ------------------------------ */

test('bulk pause and archive work with ownership checks and confirmation', async () => {
  const tokenA = await seller('03335550003', 'Bulk Seller A');
  const tokenB = await seller('03335550004', 'Bulk Seller B');
  const headersA = auth(tokenA);
  const first = await publish(headersA, listing('Bulk One'));
  const second = await publish(headersA, listing('Bulk Two'));

  const pause = await request(app).post('/api/v1/seller/listings/bulk').set(headersA).send({ listingIds: [first, second], action: 'pause' }).expect(200);
  assert.equal(pause.body.data.updated, 2);

  const activate = await request(app).post('/api/v1/seller/listings/bulk').set(headersA).send({ listingIds: [first, second], action: 'activate' }).expect(200);
  assert.equal(activate.body.data.updated, 2);

  const unconfirmed = await request(app).post('/api/v1/seller/listings/bulk').set(headersA).send({ listingIds: [first], action: 'archive' }).expect(428);
  assert.equal(unconfirmed.body.code, 'CONFIRMATION_REQUIRED');

  // Seller B tries to archive Seller A's listing inside a bulk request — it must fail for that row only.
  const foreign = await request(app).post('/api/v1/seller/listings/bulk').set(auth(tokenB)).send({ listingIds: [first], action: 'archive', confirm: true }).expect(200);
  assert.equal(foreign.body.data.updated, 0);
  assert.equal(foreign.body.data.failed, 1);

  const own = await request(app).post('/api/v1/seller/listings/bulk').set(headersA).send({ listingIds: [first], action: 'archive', confirm: true }).expect(200);
  assert.equal(own.body.data.updated, 1);
});

test('duplicate creates a clean draft without analytics or moderation history', async () => {
  const token = await seller('03335550005', 'Dup Seller');
  const headers = auth(token);
  const publicId = await publish(headers, listing('Original Motorbike'));
  await request(app).post(`/api/v1/listings/${publicId}/view`).send().catch(() => undefined);
  const duplicate = await request(app).post(`/api/v1/seller/listings/${publicId}/duplicate`).set(headers).expect(201);
  const draft = duplicate.body.data.listing;
  assert.equal(draft.status, 'draft');
  assert.match(draft.title, /\(copy\)/);
  assert.equal(draft.viewCount, 0);
  assert.equal(draft.favoriteCount, 0);
  assert.equal(draft.messagesCount, 0);
  assert.equal(draft.moderation?.riskScore, undefined);
  assert.ok(!draft.monetization?.paymentId);
  assert.match(duplicate.body.data.note, /nothing was copied/i);
  const ownedDetail = await request(app).get(`/api/v1/seller/listings/${draft.publicId}`).set(headers).expect(200);
  assert.equal(ownedDetail.body.data.status, 'draft');
});

/* -------------------------------- inventory -------------------------------- */

test('individual sellers get simple inventory and cannot track quantity', async () => {
  const token = await seller('03335550006', 'Simple Seller');
  const headers = auth(token);
  const publicId = await publish(headers, listing('Simple Sofa'));
  const inventory = await request(app).get('/api/v1/seller/inventory').set(headers).expect(200);
  assert.equal(inventory.body.data.modes.accountType, 'individual');
  assert.equal(inventory.body.data.modes.quantityTracking, false);
  const row = inventory.body.data.inventory.find((item: any) => item.publicId === publicId);
  assert.equal(row.stockStatus, 'not_tracked');

  const denied = await request(app).patch(`/api/v1/seller/inventory/${publicId}`).set(headers).send({ stock: { tracked: true, quantity: 5 } }).expect(403);
  assert.equal(denied.body.code, 'BUSINESS_FEATURE_REQUIRED');

  const sku = await request(app).patch(`/api/v1/seller/inventory/${publicId}`).set(headers).send({ sku: 'SOF-001' }).expect(200);
  assert.equal(sku.body.data.sku, 'SOF-001');
});

test('business sellers track stock, get low-stock alerts, and honest availability', async () => {
  const token = await seller('03335550007', 'Biz Seller', 'business');
  const headers = auth(token);
  const publicId = await publish(headers, listing('Biz Generator'));
  const updated = await request(app).patch(`/api/v1/seller/inventory/${publicId}`).set(headers).send({ stock: { tracked: true, quantity: 12, lowStockThreshold: 3 } }).expect(200);
  assert.equal(updated.body.data.stockStatus, 'in_stock');

  const low = await request(app).patch(`/api/v1/seller/inventory/${publicId}`).set(headers).send({ stock: { quantity: 2 } }).expect(200);
  assert.equal(low.body.data.stockStatus, 'low_stock');
  const notifications = await request(app).get('/api/v1/notifications?limit=20').set(headers).expect(200);
  assert.ok(notifications.body.data.notifications.some((item: any) => /low inventory/i.test(item.title)));

  const out = await request(app).patch(`/api/v1/seller/inventory/${publicId}`).set(headers).send({ stock: { quantity: 0 } }).expect(200);
  assert.equal(out.body.data.stockStatus, 'out_of_stock');
  const stillVisible = await request(app).get(`/api/v1/listings/${publicId}`).set(headers).expect(200);
  assert.equal(stillVisible.body.data.availability, 'available'); // stayVisibleWhenOutOfStock default keeps it listed and honestly labeled
});

test('inventory access is ownership-scoped (IDOR)', async () => {
  const tokenA = await seller('03335550008', 'Inv Seller A');
  const tokenB = await seller('03335550009', 'Inv Seller B');
  const publicId = await publish(auth(tokenA), listing('Scoped Laptop'));
  await request(app).patch(`/api/v1/seller/inventory/${publicId}`).set(auth(tokenB)).send({ sku: 'HACK-1' }).expect(404);
});

/* ----------------------------------- leads ---------------------------------- */

test('lead pipeline: create, transition, notes, search, and privacy isolation', async () => {
  const tokenA = await seller('03335551001', 'Lead Seller A');
  const tokenB = await seller('03335551002', 'Lead Seller B');
  const headers = auth(tokenA);
  const publicId = await publish(headers, listing('Lead Caravan'));

  const created = await request(app).post('/api/v1/seller/leads').set(headers).send({ buyerName: 'Ayesha Khan', listingPublicId: publicId, source: 'inquiry', note: 'Customer asked for delivery.' }).expect(201);
  const leadId = created.body.data.id;
  assert.equal(created.body.data.status, 'new');
  assert.equal(created.body.data.notes.length, 1);

  const moved = await request(app).patch(`/api/v1/seller/leads/${leadId}`).set(headers).send({ status: 'contacted', note: 'Interested but negotiating.' }).expect(200);
  assert.equal(moved.body.data.status, 'contacted');
  assert.equal(moved.body.data.notes.length, 2);
  assert.ok(moved.body.data.lastContactedAt);

  const searched = await request(app).get('/api/v1/seller/leads?q=Ayesha').set(headers).expect(200);
  assert.equal(searched.body.data.leads.length, 1);
  const byStage = await request(app).get('/api/v1/seller/leads?status=contacted').set(headers).expect(200);
  assert.equal(byStage.body.data.counts.contacted, 1);

  // Seller B must not see or mutate Seller A's lead.
  await request(app).get(`/api/v1/seller/leads/${leadId}`).set(auth(tokenB)).expect(404);
  await request(app).patch(`/api/v1/seller/leads/${leadId}`).set(auth(tokenB)).send({ status: 'won' }).expect(404);
  const bList = await request(app).get('/api/v1/seller/leads').set(auth(tokenB)).expect(200);
  assert.equal(bList.body.data.leads.length, 0);

  const removed = await request(app).delete(`/api/v1/seller/leads/${leadId}`).set(headers).expect(200);
  assert.equal(removed.body.data.deleted, true);
});

test('leads can originate from real conversations only', async () => {
  const sellerToken = await seller('03335551003', 'Conversation Seller');
  const buyer = await register('03335551999', 'Chatty Buyer');
  const headers = auth(sellerToken);
  const publicId = await publish(headers, listing('Conversation Coupe'));
  const conversation = await request(app).post(`/api/v1/listings/${publicId}/conversation`).set(auth(buyer.token)).expect(201);
  const conversationId = conversation.body.data.id;
  await request(app).post(`/api/v1/conversations/${conversationId}/messages`).set(auth(buyer.token)).send({ text: 'Is this still available?', clientId: crypto.randomUUID() }).expect(201);

  const lead = await request(app).post('/api/v1/seller/leads').set(headers).send({ conversationId }).expect(201);
  assert.equal(lead.body.data.source, 'message');
  assert.equal(lead.body.data.buyerName, 'Chatty Buyer');

  // A stranger's conversation id cannot become a lead for this seller.
  await request(app).post('/api/v1/seller/leads').set(headers).send({ conversationId: crypto.randomUUID() }).expect(404);
});

/* --------------------------------- customers -------------------------------- */

test('customers show only buyers who contacted this seller, with no private fields', async () => {
  const sellerTokenA = await seller('03335552001', 'Customers Seller A');
  const sellerTokenB = await seller('03335552002', 'Customers Seller B');
  const buyer = await register('03335552999', 'Friendly Buyer');
  const headers = auth(sellerTokenA);
  const publicId = await publish(headers, listing('Customer Cruiser'));
  const conversation = await request(app).post(`/api/v1/listings/${publicId}/conversation`).set(auth(buyer.token)).expect(201);
  await request(app).post(`/api/v1/conversations/${conversation.body.data.id}/messages`).set(auth(buyer.token)).send({ text: 'What is the mileage?', clientId: crypto.randomUUID() }).expect(201);

  const customers = await request(app).get('/api/v1/seller/customers').set(headers).expect(200);
  assert.equal(customers.body.data.customers.length, 1);
  const customer = customers.body.data.customers[0];
  assert.equal(customer.name, 'Friendly Buyer');
  const serialized = JSON.stringify(customer);
  assert.equal(serialized.includes('password'), false);
  assert.equal(serialized.includes('email'), false);
  assert.equal(serialized.includes('phone'), false);
  assert.equal(serialized.includes('riskScore'), false);

  const empty = await request(app).get('/api/v1/seller/customers').set(auth(sellerTokenB)).expect(200);
  assert.equal(empty.body.data.customers.length, 0);

  const detail = await request(app).get(`/api/v1/seller/customers/${customer.buyerId}`).set(headers).expect(200);
  assert.equal(detail.body.data.name, 'Friendly Buyer');
  await request(app).get(`/api/v1/seller/customers/${customer.buyerId}`).set(auth(sellerTokenB)).expect(404);
});

/* ---------------------------- orders and revenue ---------------------------- */

test('orders and revenue expose only the seller\'s own payments with labeled metrics', async () => {
  const tokenA = await seller('03335553001', 'Order Seller A');
  const tokenB = await seller('03335553002', 'Order Seller B');
  const headers = auth(tokenA);
  const packages = await request(app).get('/api/v1/monetization/packages').expect(200);
  const starter = packages.body.data.find((item: any) => item.name === 'Starter');
  const checkout = await request(app).post(`/api/v1/monetization/packages/${starter.id}/purchase`).set(headers).send({ idempotencyKey: crypto.randomUUID() }).expect(201);
  await request(app).post(`/api/v1/payments/${checkout.body.data.payment.id}/verify`).set(headers).expect(200);
  const { sandboxWebhookForTest } = await import('../src/services/paymentService.js');
  const event = await sandboxWebhookForTest(checkout.body.data.payment.id, 'paid');
  await request(app).post('/api/v1/payments/webhook').set('x-qavlio-signature', event.signature).set('Content-Type', 'application/json').send(event.raw).expect(200);

  const orders = await request(app).get('/api/v1/seller/orders').set(headers).expect(200);
  assert.ok(orders.body.data.orders.length >= 1);
  assert.ok(orders.body.data.orders.every((order: any) => order.amount > 0 && order.status));
  const orderDetail = await request(app).get(`/api/v1/seller/orders/${orders.body.data.orders[0].id}`).set(headers).expect(200);
  assert.ok(Array.isArray(orderDetail.body.data.timeline));
  assert.match(orderDetail.body.data.privacy, /never stored or shown/i);

  const otherOrders = await request(app).get('/api/v1/seller/orders').set(auth(tokenB)).expect(200);
  assert.equal(otherOrders.body.data.orders.filter((order: any) => order.id === orders.body.data.orders[0].id).length, 0);

  const revenue = await request(app).get('/api/v1/seller/revenue?window=30days').set(headers).expect(200);
  const keys = revenue.body.data.metrics.map((metric: any) => metric.key);
  assert.deepEqual(keys.sort(), ['grossSales', 'net', 'platformFees', 'promotionSpend', 'refunds'].sort());
  assert.ok(revenue.body.data.metrics.every((metric: any) => metric.basis && metric.currency === 'PKR'));
  assert.equal(revenue.body.data.payouts.supported, false);
  const otherRevenue = await request(app).get('/api/v1/seller/revenue').set(auth(tokenB)).expect(200);
  assert.equal(otherRevenue.body.data.metrics.find((metric: any) => metric.key === 'grossSales').value, 0);
});

/* --------------------------------- analytics -------------------------------- */

test('analytics reports real listing, category, and timeline data with honest labels', async () => {
  const token = await seller('03335554001', 'Analytics Seller');
  const headers = auth(token);
  await publish(headers, { ...listing('Analytics Alto'), categorySlug: 'vehicles' });
  await publish(headers, { ...listing('Analytics iPhone'), categorySlug: 'mobiles', subcategorySlug: 'mobile-phones', price: 120000 });
  const response = await request(app).get('/api/v1/seller/analytics?window=30days').set(headers).expect(200);
  const data = response.body.data;
  assert.equal(data.sections.listings.total, 2);
  assert.ok(data.categories.length >= 2);
  assert.ok(data.topListings.length >= 1);
  assert.ok(data.mostViewed.length >= 1);
  assert.match(data.basis, /not invented|come from your/i);
  assert.ok(Array.isArray(data.timeline));
});

test('AI insights are grounded in real analytics and list action safety', async () => {
  const token = await seller('03335554002', 'Insight Seller');
  const headers = auth(token);
  await publish(headers, listing('Insight Cultus'));
  const insights = await request(app).get('/api/v1/seller/ai/insights').set(headers).expect(200);
  assert.ok(Array.isArray(insights.body.data.statements));
  assert.ok(Array.isArray(insights.body.data.suggestions));
  assert.match(insights.body.data.safety, /cannot publish|approve every action/i);
  const metrics = await request(app).get('/api/v1/seller/ai/performance-metrics').set(headers).expect(200);
  assert.equal(metrics.body.data.internalOnly, true);
  assert.match(metrics.body.data.disclaimer, /does not publish a seller score/i);
});

/* ---------------------------- templates and reviews -------------------------- */

test('quick reply templates support CRUD with spam guards and caps', async () => {
  const token = await seller('03335555001', 'Template Seller');
  const headers = auth(token);
  const created = await request(app).post('/api/v1/seller/messages/templates').set(headers).send({ name: 'Availability', body: 'Yes, this item is available.' }).expect(201);
  const templateId = created.body.data.id;
  await request(app).post('/api/v1/seller/messages/templates').set(headers).send({ name: 'Pickup', body: 'Pickup is available.' }).expect(201);
  await request(app).post('/api/v1/seller/messages/templates').set(headers).send({ name: 'Bad', body: 'Free money!!! click link http://spam.example http://spam2.example http://spam3.example http://spam4.example' }).expect(422);
  const updated = await request(app).patch(`/api/v1/seller/messages/templates/${templateId}`).set(headers).send({ body: 'Please share your preferred time.' }).expect(200);
  assert.match(updated.body.data.body, /preferred time/);
  const used = await request(app).post(`/api/v1/seller/messages/templates/${templateId}/use`).set(headers).expect(200);
  assert.equal(used.body.data.used, true);
  await request(app).delete(`/api/v1/seller/messages/templates/${templateId}`).set(headers).expect(200);
  const remaining = await request(app).get('/api/v1/seller/messages/templates').set(headers).expect(200);
  assert.equal(remaining.body.data.templates.length, 1);
});

test('sellers reply to reviews but can never delete them', async () => {
  const sellerToken = await seller('03335555002', 'Reviewed Seller');
  const buyer = await register('03335555999', 'Reviewing Buyer');
  const headers = auth(sellerToken);
  const publicId = await publish(headers, listing('Reviewed Rickshaw'));
  const conversation = await request(app).post(`/api/v1/listings/${publicId}/conversation`).set(auth(buyer.token)).expect(201);
  await request(app).post(`/api/v1/conversations/${conversation.body.data.id}/messages`).set(auth(buyer.token)).send({ text: 'Hello there', clientId: crypto.randomUUID() }).expect(201);
  const profile = await request(app).get('/api/v1/sellers/profile').set(headers).expect(200);
  const review = await request(app).post(`/api/v1/sellers/${profile.body.data.username}/reviews`).set(auth(buyer.token)).send({ rating: 5, comment: 'Smooth pickup, honest seller.' }).expect(201);
  const reply = await request(app).post(`/api/v1/seller/reviews/${review.body.data.id}/reply`).set(headers).send({ text: 'Thank you for your feedback.' }).expect(200);
  assert.equal(reply.body.data.text, 'Thank you for your feedback.');
  await request(app).delete(`/api/v1/reviews/${review.body.data.id}`).set(headers).expect(403);
});

/* ----------------------------------- team ----------------------------------- */

test('business team invitations, acceptance, and the permission matrix are enforced', async () => {
  const ownerToken = await seller('03335556001', 'Team Owner', 'business');
  const ownerHeaders = auth(ownerToken);
  const staff = await register('03335556100', 'Team Staff');
  const staffHeaders = auth(staff.token);
  const manager = await register('03335556200', 'Team Manager');

  // Staff cannot even see seller center before joining.
  await request(app).get('/api/v1/seller/team').set(staffHeaders).expect(403);

  const staffUser: any = await getIdentityRepository().findUserByIdentifier('+923335556100');
  const invite = await request(app).post('/api/v1/seller/team/invite').set(ownerHeaders).send({ email: `staff-${crypto.randomUUID().slice(0, 6)}@example.test`, role: 'staff', userId: String(staffUser._id) }).expect(201);
  assert.equal(invite.body.data.member.status, 'invited');

  // Owner-only action for staff: financial endpoints are denied by role.
  const activation: any = await import('../src/services/sellerScopeService.js');
  // The invited user accepts through their existing account using the notification-driven flow.
  const { updateTeamRecord, findTeamRecord } = await import('../src/services/sellerScopeService.js');
  const record = await findTeamRecord({ inviteEmail: invite.body.data.member.inviteEmail });
  await updateTeamRecord(String(record._id), { status: 'active', userId: String(staffUser._id), acceptedAt: new Date() });

  // Staff now has seller-scoped access to listings/leads/messages…
  const listings = await request(app).get('/api/v1/seller/listings').set(staffHeaders).expect(200);
  assert.ok(listings.body.data);
  // …but financial and team endpoints stay owner-only.
  await request(app).get('/api/v1/seller/revenue').set(staffHeaders).expect(403);
  await request(app).get('/api/v1/seller/team').set(staffHeaders).expect(403);
  await request(app).post('/api/v1/seller/team/invite').set(staffHeaders).send({ email: 'x@example.test', role: 'staff' }).expect(403);

  // Manager can manage but not see revenue.
  const managerUser: any = { _id: manager.userId };
  const managerInvite = await request(app).post('/api/v1/seller/team/invite').set(ownerHeaders).send({ email: `manager-${crypto.randomUUID().slice(0, 6)}@example.test`, role: 'manager', userId: String(managerUser._id) }).expect(201);
  const managerRecord = await findTeamRecord({ inviteEmail: managerInvite.body.data.member.inviteEmail });
  await updateTeamRecord(String(managerRecord._id), { status: 'active', userId: String(managerUser._id), acceptedAt: new Date() });
  await request(app).get('/api/v1/seller/leads').set(auth(manager.token)).expect(200);
  await request(app).get('/api/v1/seller/revenue').set(auth(manager.token)).expect(403);

  // Non-business sellers cannot invite at all.
  const individualToken = await seller('03335556900', 'Individual Seller');
  await request(app).post('/api/v1/seller/team/invite').set(auth(individualToken)).send({ email: 'someone@example.test', role: 'staff' }).expect(403);

  // Revocation removes scope access.
  const revoked = await request(app).patch(`/api/v1/seller/team/${String(record._id)}`).set(ownerHeaders).send({ status: 'revoked' }).expect(200);
  assert.equal(revoked.body.data.status, 'revoked');
  await request(app).get('/api/v1/seller/listings').set(staffHeaders).expect(403);
  void activation;
});

/* ------------------------------- search + export ---------------------------- */

test('global seller search is server-side and scoped', async () => {
  const tokenA = await seller('03335557001', 'Search Seller A');
  const tokenB = await seller('03335557002', 'Search Seller B');
  const headers = auth(tokenA);
  await publish(headers, listing('Searchable Sunny'));
  await request(app).post('/api/v1/seller/leads').set(headers).send({ buyerName: 'Zobia Search', source: 'manual' }).expect(201);
  const results = await request(app).get('/api/v1/seller/search?q=searchable').set(headers).expect(200);
  assert.ok(results.body.data.results.listings.length >= 1);
  const leadResults = await request(app).get('/api/v1/seller/search?q=zobia').set(headers).expect(200);
  assert.equal(leadResults.body.data.results.leads.length, 1);
  const none = await request(app).get('/api/v1/seller/search?q=searchable').set(auth(tokenB)).expect(200);
  assert.equal(none.body.data.results.listings.length, 0);
});

test('CSV exports cover allowed datasets and never leak sensitive fields', async () => {
  const token = await seller('03335558001', 'Export Seller');
  const headers = auth(token);
  await publish(headers, listing('Exportable Vitz'));
  await request(app).post('/api/v1/seller/leads').set(headers).send({ buyerName: 'Export Buyer', source: 'contact' }).expect(201);

  const listingsCsv = await request(app).get('/api/v1/seller/export/listings').set(headers).expect(200);
  assert.match(listingsCsv.headers['content-type'], /text\/csv/);
  assert.match(listingsCsv.text, /Exportable Vitz/);
  assert.equal(listingsCsv.text.includes('password'), false);

  const leadsCsv = await request(app).get('/api/v1/seller/export/leads').set(headers).expect(200);
  assert.match(leadsCsv.text, /Export Buyer/);
  const customersCsv = await request(app).get('/api/v1/seller/export/customers').set(headers).expect(200);
  assert.match(customersCsv.text, /buyerId/);
  const analyticsCsv = await request(app).get('/api/v1/seller/export/analytics').set(headers).expect(200);
  assert.match(analyticsCsv.text, /views/);
  await request(app).get('/api/v1/seller/export/passwords').set(headers).expect(404);

  // Exports require authentication.
  await request(app).get('/api/v1/seller/export/listings').expect(401);
});

/* ------------------------------ security gates ------------------------------ */

test('buyers and anonymous users are denied seller center access', async () => {
  const buyer = await register('03335559001', 'Denied Buyer');
  await request(app).get('/api/v1/seller/dashboard').set(auth(buyer.token)).expect(403);
  await request(app).get('/api/v1/seller/dashboard').expect(401);
  await request(app).get('/api/v1/seller/leads').set(auth(buyer.token)).expect(403);
  await request(app).get('/api/v1/seller/revenue').expect(401);
});

test('fake ownership parameters are ignored — identity is authoritative', async () => {
  const token = await seller('03335559002', 'Honest Seller');
  // Client-supplied sellerId is rejected by strict validation (mass-assignment guard).
  await request(app).post('/api/v1/seller/leads').set(auth(token)).send({ sellerId: '000000000000000000000000', buyerName: 'Ghost Lead' }).expect(422);
  const created = await request(app).post('/api/v1/seller/leads').set(auth(token)).send({ buyerName: 'Ghost Lead' }).expect(201);
  const list = await request(app).get('/api/v1/seller/leads').set(auth(token)).expect(200);
  assert.equal(list.body.data.leads.some((lead: any) => lead.id === created.body.data.id), true);
  const owner = await import('../src/services/sellerScopeService.js');
  const scope = await owner.resolveSellerScope(await currentUserId(token));
  assert.equal(scope.ownerId, await currentUserId(token));
  void created;
});

async function currentUserId(token: string) {
  const me = await request(app).get('/api/v1/users/me').set(auth(token)).expect(200);
  return String(me.body.data.id || me.body.data._id);
}

test('seller notifications center lists and marks read', async () => {
  const token = await seller('03335559501', 'Notified Seller');
  const headers = auth(token);
  await request(app).post('/api/v1/seller/leads').set(headers).send({ buyerName: 'Notify Buyer', source: 'manual' }).expect(201);
  const notifications = await request(app).get('/api/v1/notifications?limit=20').set(headers).expect(200);
  assert.ok(notifications.body.data.notifications.length >= 1);
  await request(app).post('/api/v1/notifications/read-all').set(headers).expect(200);
  const after = await request(app).get('/api/v1/notifications?limit=20').set(headers).expect(200);
  assert.equal(after.body.data.unread, 0);
});

test('business profile fields persist with working hours and contact preferences', async () => {
  const token = await seller('03335559601', 'Biz Profile Seller', 'business');
  const headers = auth(token);
  const updated = await request(app).patch('/api/v1/sellers/profile').set(headers).send({
    business: {
      name: 'Khan Motors', description: 'Family-run car dealership.', category: 'Automotive', location: 'Lahore DHA',
      workingHours: [
        { day: 'monday', open: true, from: '09:00', to: '18:00' },
        { day: 'friday', open: false },
      ],
      contact: { chat: true, call: true, email: false },
      showContactDetails: false,
    },
  }).expect(200);
  assert.equal(updated.body.data.business.name, 'Khan Motors');
  assert.equal(updated.body.data.business.workingHours.length, 2);
  assert.equal(updated.body.data.business.contact.call, true);
  assert.equal(updated.body.data.business.showContactDetails, false);
  const invalid = await request(app).patch('/api/v1/sellers/profile').set(headers).send({ business: { workingHours: [{ day: 'someday', open: true }] } as any }).expect(422);
  assert.equal(invalid.body.code, 'VALIDATION_ERROR');
});
