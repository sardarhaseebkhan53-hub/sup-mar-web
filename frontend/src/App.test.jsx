// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

const jsonResponse = (data, ok = true, status = 200) => Promise.resolve({ ok, status, json: async () => data });
const customer = {
  id: 'user-customer', name: 'Areeba Khan', username: 'areeba', email: 'areeba@example.com', roles: ['customer'], status: 'active',
  location: { country: 'PK', province: 'Punjab', city: 'Rawalpindi', area: '' },
  verification: { email: { status: 'verified' }, phone: { status: 'not_verified' }, identity: { status: 'not_verified' }, business: { status: 'not_verified' } },
  preferences: { language: 'en', notifications: { inApp: true, email: true, sms: true, push: false } }, seller: { status: 'not_started' },
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data: [] }) }));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function renderRoute(route) { return render(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(App))); }
function authenticateAs(user) {
  fetch.mockImplementation((url) => {
    if (String(url).includes('/admin/auth/')) return jsonResponse({ success: false, message: 'Administrator authentication required' }, false, 401);
    if (String(url).includes('/auth/refresh')) return jsonResponse({ success: true, data: { accessToken: 'test-access-token', user } });
    return jsonResponse({ success: true, data: [] });
  });
}

const administrator = {
  id: 'admin-1', name: 'QAVLIO Admin', username: 'admin', email: null,
  roles: ['super_admin', 'admin'], role: 'super_admin', status: 'active', avatar: null, lastLoginAt: null,
};
/** Signs in an administrator session only — the marketplace session stays anonymous. */
function authenticateAsAdmin(admin = administrator) {
  fetch.mockImplementation((url) => {
    if (String(url).includes('/admin/auth/refresh')) return jsonResponse({ success: true, data: { accessToken: 'admin-access-token', admin } });
    if (String(url).includes('/admin/auth/me')) return jsonResponse({ success: true, data: { admin, permissions: ['dashboard:view'], otp: { enabled: false } } });
    if (String(url).includes('/auth/refresh')) return jsonResponse({ success: false, message: 'no session' }, false, 401);
    return jsonResponse({ success: true, data: [] });
  });
}

const publicRouteCases = [
  ['/', /find what matters/i], ['/marketplace', /browse the marketplace/i], ['/browse', /browse the marketplace/i], ['/categories', /explore all categories/i], ['/category/cars', /^cars$/i],
  ['/about', /local commerce, made clearer/i], ['/contact', /talk to the right team/i], ['/safety', /trade with confidence/i], ['/terms', /terms of use foundation/i], ['/privacy', /privacy by design/i],
  ['/listing/QV-100284/honda-civic-oriel-2021', /honda civic oriel/i], ['/help', /how can we help/i],
  ['/login', /log in to QAVLIO/i], ['/login/phone', /log in with phone otp/i], ['/register', /create your QAVLIO account/i],
  ['/verify-otp?phone=%2B923001234567&target=%2B92%E2%80%A2%E2%80%A212&purpose=phone_signup', /enter verification code/i],
  ['/verify-email?target=areeba%40example.com', /verify your email/i], ['/forgot-password', /recover your account/i],
  ['/reset-password?target=areeba%40example.com&token=reset-token', /create a new password/i], ['/not-a-real-route', /this listing got away/i],
];

const protectedRoutes = ['/sell', '/saved', '/messages', '/account', '/dashboard', '/seller', '/seller/profile', '/seller/settings', '/account/profile', '/account/security'];
const adminRoutes = ['/admin', '/admin/dashboard', '/admin/users', '/admin/listings', '/admin/authentication', '/admin/settings', '/admin/security'];

describe('QAVLIO public and authentication routes', () => {
  it.each(publicRouteCases)('renders %s without a route error', async (route, heading) => {
    renderRoute(route);
    expect(await screen.findByRole('heading', { name: heading })).toBeTruthy();
  });

  it('renders the complete Phase 1 homepage and interactive AI entry point', async () => {
    const user = userEvent.setup();
    renderRoute('/');
    expect(await screen.findByRole('heading', { name: /featured on QAVLIO/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /promoted near you/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /how QAVLIO works/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /trade with confidence/i })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /open QAVLIO AI/i }));
    expect(await screen.findByRole('heading', { name: /how can I help/i })).toBeTruthy();
    const favorite = screen.getAllByRole('button', { name: /save .* favorites/i })[0];
    expect(favorite.getAttribute('aria-pressed')).toBe('false');
    await user.click(favorite);
    expect(favorite.getAttribute('aria-pressed')).toBe('true');
  });

  it.each(protectedRoutes)('redirects anonymous access to login from %s', async (route) => {
    renderRoute(route);
    expect(await screen.findByRole('heading', { name: /log in to QAVLIO/i })).toBeTruthy();
  });
});

describe('separate administrator authentication', () => {
  it('renders the dedicated admin login without phone or OTP fields', async () => {
    renderRoute('/admin/login');
    expect(await screen.findByRole('heading', { name: /qavlio admin/i })).toBeTruthy();
    expect(screen.getByLabelText(/username/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign in to admin panel/i })).toBeTruthy();
    expect(screen.queryByLabelText(/phone/i)).toBeNull();
    expect(screen.queryByText(/otp/i)).toBeNull();
  });

  it.each(adminRoutes)('sends logged-out admin traffic from %s to the admin login, never the user login', async (route) => {
    renderRoute(route);
    expect(await screen.findByRole('button', { name: /sign in to admin panel/i })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /log in to QAVLIO/i })).toBeNull();
  });

  it('keeps a signed-in marketplace customer out of the admin panel', async () => {
    authenticateAs(customer);
    renderRoute('/admin/dashboard');
    expect(await screen.findByRole('button', { name: /sign in to admin panel/i })).toBeTruthy();
  });

  it('signs in with username and password through the backend admin endpoint', async () => {
    const user = userEvent.setup();
    fetch.mockImplementation((url, init) => {
      if (String(url).includes('/admin/auth/login')) {
        const body = JSON.parse(init.body);
        if (body.username === 'admin' && body.password === 'ChangeThisAdminPassword123!') {
          return jsonResponse({ success: true, data: { accessToken: 'admin-access-token', admin: administrator } });
        }
        return jsonResponse({ success: false, message: 'The administrator username or password is incorrect' }, false, 401);
      }
      if (String(url).includes('/admin/auth/refresh')) return jsonResponse({ success: false, message: 'no admin session' }, false, 401);
      if (String(url).includes('/admin/auth/me')) return jsonResponse({ success: true, data: { admin: administrator, permissions: [], otp: { enabled: false } } });
      if (String(url).includes('/auth/refresh')) return jsonResponse({ success: false, message: 'no session' }, false, 401);
      return jsonResponse({ success: true, data: [] });
    });
    renderRoute('/admin');
    await user.type(await screen.findByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/^password$/i), 'ChangeThisAdminPassword123!');
    await user.click(screen.getByRole('button', { name: /sign in to admin panel/i }));
    expect(await screen.findByRole('heading', { name: /identity & platform operations/i })).toBeTruthy();
    const loginCall = fetch.mock.calls.find(([url]) => String(url).includes('/admin/auth/login'));
    expect(loginCall).toBeTruthy();
    expect(fetch.mock.calls.some(([url]) => String(url).includes('/send-otp') || String(url).includes('/verify-otp'))).toBe(false);
  });
});

describe('role-aware protected routing', () => {
  it('allows a customer dashboard and account profile', async () => {
    authenticateAs(customer);
    renderRoute('/account');
    expect(await screen.findByRole('heading', { name: /welcome, areeba/i })).toBeTruthy();
  });

  it.each([
    ['/account/profile', /my profile/i],
    ['/account/verification', /trust & verification/i],
    ['/account/security', /security and sessions/i],
    ['/account/notifications', /^notifications$/i],
    ['/account/settings', /account settings/i],
    ['/seller/onboarding', /build your seller profile/i],
    ['/appeals', /^appeals$/i], ['/settings/blocked-users', /blocked users/i],
  ])('renders authenticated account foundation %s', async (route, heading) => {
    authenticateAs(customer);
    renderRoute(route);
    expect(await screen.findByRole('heading', { name: heading })).toBeTruthy();
  });

  it('routes a customer without the seller role to seller onboarding', async () => {
    authenticateAs(customer);
    renderRoute('/seller');
    expect(await screen.findByRole('heading', { name: /build your seller profile/i })).toBeTruthy();
  });

  it('allows the seller workspace only after the seller role exists', async () => {
    authenticateAs({ ...customer, roles: ['customer', 'seller'], seller: { status: 'active', accountType: 'individual' } });
    renderRoute('/seller');
    expect(await screen.findByRole('heading', { name: /business dashboard/i })).toBeTruthy();
  });

  it.each([['/seller/profile', /^seller profile$/i], ['/seller/settings', /^settings$/i], ['/seller/verification', /^seller verification$/i]])('renders protected seller identity route %s', async (route, heading) => {
    authenticateAs({ ...customer, roles: ['customer', 'seller'], seller: { status: 'active', accountType: 'individual' } });
    renderRoute(route);
    expect(await screen.findByRole('heading', { name: heading })).toBeTruthy();
  });

  it('allows the admin console with an admin server identity', async () => {
    authenticateAsAdmin();
    renderRoute('/admin');
    expect(await screen.findByRole('heading', { name: /identity & platform operations/i })).toBeTruthy();
  });

  it('renders API-driven admin user management for an admin', async () => {
    authenticateAsAdmin();
    renderRoute('/admin/users');
    expect(await screen.findByRole('heading', { name: /user management/i })).toBeTruthy();
  });

  it.each([
    ['/admin/orders', /^orders$/i], ['/admin/packages', /^packages$/i], ['/admin/trust-safety', /trust & safety/i],
    ['/admin/support', /^support$/i], ['/admin/notifications', /notifications & announcements/i], ['/admin/analytics', /analytics center/i],
    ['/admin/ai', /ai dashboard/i], ['/admin/audit-logs', /admin activity/i], ['/admin/moderation', /moderation queue/i],
    ['/admin/verification', /seller verification/i], ['/admin/appeals', /^appeals$/i],
  ])('renders Phase 14 command-center route %s for an admin', async (route, heading) => {
    authenticateAsAdmin();
    renderRoute(route);
    expect(await screen.findByRole('heading', { name: heading })).toBeTruthy();
  });

  it('allows finance into orders while keeping normal customers out of admin', async () => {
    authenticateAsAdmin({ ...administrator, id: 'user-finance', name: 'Finance Agent', roles: ['finance'], role: 'finance' });
    renderRoute('/admin/orders');
    expect(await screen.findByRole('heading', { name: /^orders$/i })).toBeTruthy();
  });
});
