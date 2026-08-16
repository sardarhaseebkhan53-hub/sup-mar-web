const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) { accessToken = token || null; }
export function getAccessToken() { return accessToken; }

async function parseResponse(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.code = payload?.code || 'REQUEST_FAILED';
    error.details = payload?.errors;
    error.requestId = payload?.requestId;
    throw error;
  }
  return payload;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    }).then(parseResponse).then((payload) => {
      setAccessToken(payload.data.accessToken);
      return payload;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  const { skipAuthRefresh = false, headers, ...fetchOptions } = options;
  const requestHeaders = { 'Content-Type': 'application/json', ...headers };
  if (accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: requestHeaders, credentials: 'include', ...fetchOptions });
  if (response.status === 401 && !skipAuthRefresh && path !== '/auth/refresh') {
    try {
      await refreshAccessToken();
      const retryHeaders = { ...requestHeaders, Authorization: `Bearer ${accessToken}` };
      return parseResponse(await fetch(`${API_BASE_URL}${path}`, { headers: retryHeaders, credentials: 'include', ...fetchOptions }));
    } catch {
      setAccessToken(null);
    }
  }
  return parseResponse(response);
}

const json = (body) => JSON.stringify(body);

export const authApi = {
  register: (data) => apiRequest('/auth/register', { method: 'POST', body: json(data), skipAuthRefresh: true }),
  login: (data) => apiRequest('/auth/login', { method: 'POST', body: json(data), skipAuthRefresh: true }),
  requestOtp: (phone) => apiRequest('/auth/otp/request', { method: 'POST', body: json({ phone }), skipAuthRefresh: true }),
  verifyOtp: (data) => apiRequest('/auth/verify-otp', { method: 'POST', body: json(data), skipAuthRefresh: true }),
  resendOtp: (data) => apiRequest('/auth/resend-otp', { method: 'POST', body: json(data), skipAuthRefresh: true }),
  verifyEmail: (data) => apiRequest('/auth/verify-email', { method: 'POST', body: json(data), skipAuthRefresh: true }),
  forgotPassword: (identifier) => apiRequest('/auth/forgot-password', { method: 'POST', body: json({ identifier }), skipAuthRefresh: true }),
  resetPassword: (data) => apiRequest('/auth/reset-password', { method: 'POST', body: json(data), skipAuthRefresh: true }),
  refresh: () => apiRequest('/auth/refresh', { method: 'POST', skipAuthRefresh: true }),
  logout: () => apiRequest('/auth/logout', { method: 'POST', skipAuthRefresh: true }),
};

export const userApi = {
  me: () => apiRequest('/users/me'),
  update: (data) => apiRequest('/users/me', { method: 'PATCH', body: json(data) }),
  changePassword: (data) => apiRequest('/users/me/password', { method: 'PATCH', body: json(data) }),
  deleteAccount: (data) => apiRequest('/users/me', { method: 'DELETE', body: json(data) }),
  verificationStatus: () => apiRequest('/users/verification/status'),
  completeSellerOnboarding: (data) => apiRequest('/users/me/seller-onboarding', { method: 'PATCH', body: json(data) }),
  requestPhoneVerification: (phone) => apiRequest('/users/verification/phone', { method: 'POST', body: json({ phone }) }),
  removePhone: (password) => apiRequest('/users/verification/phone', { method: 'DELETE', body: json({ password }) }),
  sessions: () => apiRequest('/users/sessions'),
  revokeSession: (id) => apiRequest(`/users/sessions/${id}`, { method: 'DELETE' }),
  revokeAllSessions: () => apiRequest('/users/sessions/all', { method: 'DELETE' }),
  updateNotifications: (data) => apiRequest('/users/notification-preferences', { method: 'PATCH', body: json(data) }),
};

export const accountLinkApi = {
  initiate: (data) => apiRequest('/account-links/initiate', { method: 'POST', body: json(data) }),
  confirm: (data) => apiRequest('/account-links/confirm', { method: 'POST', body: json(data) }),
};

export const adminApi = {
  users: (params = '') => apiRequest(`/admin/users${params ? `?${params}` : ''}`),
  user: (id) => apiRequest(`/admin/users/${id}`),
  updateStatus: (id, data) => apiRequest(`/admin/users/${id}/status`, { method: 'PATCH', body: json(data) }),
  updateRoles: (id, data) => apiRequest(`/admin/users/${id}/roles`, { method: 'PATCH', body: json(data) }),
};

export const marketplaceApi = {
  getCategories: () => apiRequest('/categories', { skipAuthRefresh: true }),
  getPublicConfig: () => apiRequest('/config/public', { skipAuthRefresh: true }),
  getAdSlot: (slotId) => apiRequest(`/ads/slots/${slotId}`, { skipAuthRefresh: true }),
};
