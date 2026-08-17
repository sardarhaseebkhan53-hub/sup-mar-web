import type { ApiEnvelope, AuthUser, LoginInput, NotificationPreferences, SellerProfile, SessionPreview } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
let accessToken: string | null = null;
let refreshPromise: Promise<ApiEnvelope<{ accessToken: string; user: AuthUser }>> | null = null;

export class QavlioApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  requestId?: string;
  constructor(message: string, status = 0, code = 'REQUEST_FAILED', details?: unknown, requestId?: string) {
    super(message); this.name = 'QavlioApiError'; this.status = status; this.code = code; this.details = details; this.requestId = requestId;
  }
}

export function setAccessToken(token: string | null) { accessToken = token || null; }
export function getAccessToken() { return accessToken; }

async function parseResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = await response.json().catch(() => null) as { message?: string; code?: string; errors?: unknown; requestId?: string } | ApiEnvelope<T> | null;
  if (!response.ok) {
    const errorPayload = payload as { message?: string; code?: string; errors?: unknown; requestId?: string } | null;
    throw new QavlioApiError(errorPayload?.message || 'Something went wrong. Please check your connection and try again.', response.status, errorPayload?.code || 'REQUEST_FAILED', errorPayload?.errors, errorPayload?.requestId);
  }
  return payload as ApiEnvelope<T>;
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  try { return await fetch(input, init); }
  catch { throw new QavlioApiError('Something went wrong. Please check your connection and try again.', 0, 'NETWORK_ERROR'); }
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = safeFetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' })
      .then((response) => parseResponse<{ accessToken: string; user: AuthUser }>(response))
      .then((payload) => { setAccessToken(payload.data.accessToken); return payload; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

interface ApiRequestOptions extends RequestInit { skipAuthRefresh?: boolean; }
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { skipAuthRefresh = false, headers, ...fetchOptions } = options;
  const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...(headers as Record<string, string> | undefined) };
  if (accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;
  const response = await safeFetch(`${API_BASE_URL}${path}`, { headers: requestHeaders, credentials: 'include', ...fetchOptions });
  if (response.status === 401 && !skipAuthRefresh && path !== '/auth/refresh') {
    try {
      await refreshAccessToken();
      return parseResponse<T>(await safeFetch(`${API_BASE_URL}${path}`, { headers: { ...requestHeaders, Authorization: `Bearer ${accessToken}` }, credentials: 'include', ...fetchOptions }));
    } catch {
      setAccessToken(null);
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('qavlio:session-expired'));
    }
  }
  return parseResponse<T>(response);
}

const json = (body: unknown) => JSON.stringify(body);

export const authApi = {
  register: (data: unknown) => apiRequest<{ user: AuthUser; verification: { channel: string; target: string; normalizedTarget?: string; purpose?: string } }>('/auth/register', { method: 'POST', body: json(data), skipAuthRefresh: true }),
  login: (data: LoginInput) => apiRequest<{ user: AuthUser; accessToken: string }>('/auth/login', { method: 'POST', body: json(data), skipAuthRefresh: true }),
  requestOtp: (phone: string) => apiRequest<unknown>('/auth/otp/request', { method: 'POST', body: json({ phone }), skipAuthRefresh: true }),
  verifyOtp: (data: unknown) => apiRequest<{ user: AuthUser; accessToken?: string; verified?: boolean }>('/auth/verify-otp', { method: 'POST', body: json(data), skipAuthRefresh: true }),
  resendOtp: (data: unknown) => apiRequest<unknown>('/auth/resend-otp', { method: 'POST', body: json(data), skipAuthRefresh: true }),
  resendVerification: (email: string) => apiRequest<unknown>('/auth/resend-verification', { method: 'POST', body: json({ email }), skipAuthRefresh: true }),
  verifyEmail: (data: unknown) => apiRequest<unknown>('/auth/verify-email', { method: 'POST', body: json(data), skipAuthRefresh: true }),
  forgotPassword: (identifier: string) => apiRequest<unknown>('/auth/forgot-password', { method: 'POST', body: json({ identifier }), skipAuthRefresh: true }),
  resetPassword: (data: unknown) => apiRequest<unknown>('/auth/reset-password', { method: 'POST', body: json(data), skipAuthRefresh: true }),
  me: () => apiRequest<AuthUser>('/auth/me'),
  refresh: () => apiRequest<{ user: AuthUser; accessToken: string }>('/auth/refresh', { method: 'POST', skipAuthRefresh: true }),
  logout: () => apiRequest<{ message: string }>('/auth/logout', { method: 'POST', skipAuthRefresh: true }),
};

interface AvatarIntent { provider: string; uploadUrl: string; fields: Record<string, string | number>; constraints: { allowedTypes: string[]; maxBytes: number } }
interface CloudinaryUpload { secure_url: string; public_id: string; version: number; signature: string; error?: { message: string } }
export const userApi = {
  me: () => apiRequest<AuthUser>('/users/profile'),
  update: (data: unknown) => apiRequest<AuthUser>('/users/profile', { method: 'PATCH', body: json(data) }),
  changePassword: (data: unknown) => apiRequest<{ message: string }>('/users/password', { method: 'PATCH', body: json(data) }),
  deactivateAccount: (data: unknown) => apiRequest<{ message: string }>('/users/me', { method: 'DELETE', body: json(data) }),
  deleteAccount: (data: unknown) => apiRequest<{ message: string }>('/users/account', { method: 'DELETE', body: json(data) }),
  verificationStatus: () => apiRequest<unknown>('/users/verification/status'),
  completeSellerOnboarding: (data: unknown) => apiRequest<AuthUser>('/users/me/seller-onboarding', { method: 'PATCH', body: json(data) }),
  requestPhoneVerification: (phone: string) => apiRequest<unknown>('/users/verification/phone', { method: 'POST', body: json({ phone }) }),
  removePhone: (password: string) => apiRequest<unknown>('/users/verification/phone', { method: 'DELETE', body: json({ password }) }),
  sessions: () => apiRequest<SessionPreview[]>('/users/sessions'),
  revokeSession: (id: string) => apiRequest<{ message: string }>(`/users/sessions/${id}`, { method: 'DELETE' }),
  revokeAllSessions: () => apiRequest<{ message: string }>('/users/sessions/all', { method: 'DELETE' }),
  updateNotifications: (data: Partial<NotificationPreferences>) => apiRequest<NotificationPreferences>('/users/notification-preferences', { method: 'PATCH', body: json(data) }),
  avatarIntent: (file: File) => apiRequest<AvatarIntent>('/users/avatar/upload-intent', { method: 'POST', body: json({ fileName: file.name, fileType: file.type, fileSize: file.size }) }),
  completeAvatar: (data: unknown) => apiRequest<AuthUser>('/users/avatar/complete', { method: 'POST', body: json(data) }),
  removeAvatar: () => apiRequest<AuthUser>('/users/avatar', { method: 'DELETE' }),
  async uploadAvatar(file: File) {
    const intent = await userApi.avatarIntent(file);
    const form = new FormData();
    Object.entries(intent.data.fields).forEach(([key, value]) => form.append(key, String(value)));
    form.append('file', file);
    const uploadResponse = await safeFetch(intent.data.uploadUrl, { method: 'POST', body: form });
    const upload = await uploadResponse.json() as CloudinaryUpload;
    if (!uploadResponse.ok || upload.error) throw new QavlioApiError(upload.error?.message || 'Profile image upload failed', uploadResponse.status, 'MEDIA_UPLOAD_FAILED');
    return userApi.completeAvatar({ secureUrl: upload.secure_url, publicId: upload.public_id, version: upload.version, signature: upload.signature });
  },
};

export const sellerApi = {
  profile: () => apiRequest<SellerProfile>('/sellers/profile'),
  createProfile: (data: unknown) => apiRequest<{ user: AuthUser; profile: SellerProfile }>('/sellers/profile', { method: 'POST', body: json(data) }),
  updateProfile: (data: unknown) => apiRequest<SellerProfile>('/sellers/profile', { method: 'PATCH', body: json(data) }),
};

export const accountLinkApi = {
  initiate: (data: unknown) => apiRequest<{ linkRequestId: string; phone: string; warning: string }>('/account-links/initiate', { method: 'POST', body: json(data) }),
  confirm: (data: unknown) => apiRequest<{ message: string }>('/account-links/confirm', { method: 'POST', body: json(data) }),
};

export const adminApi = {
  users: (params = '') => apiRequest<unknown[]>(`/admin/users${params ? `?${params}` : ''}`),
  user: (id: string) => apiRequest<unknown>(`/admin/users/${id}`),
  updateStatus: (id: string, data: unknown) => apiRequest<unknown>(`/admin/users/${id}/status`, { method: 'PATCH', body: json(data) }),
  updateRoles: (id: string, data: unknown) => apiRequest<unknown>(`/admin/users/${id}/roles`, { method: 'PATCH', body: json(data) }),
};
export const marketplaceApi = {
  getCategories: () => apiRequest<unknown[]>('/categories', { skipAuthRefresh: true }),
  getPublicConfig: () => apiRequest<unknown>('/config/public', { skipAuthRefresh: true }),
  getAdSlot: (slotId: string) => apiRequest<unknown>(`/ads/slots/${slotId}`, { skipAuthRefresh: true }),
};
