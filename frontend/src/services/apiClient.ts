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
export const listingApi = {
  create: (data: unknown) => apiRequest<any>('/listings', { method: 'POST', body: json(data) }),
  update: (id: string, data: unknown) => apiRequest<any>(`/listings/${id}`, { method: 'PATCH', body: json(data) }),
  sellerListings: (params = '') => apiRequest<any>(`/seller/listings${params ? `?${params}` : ''}`),
  sellerListing: (id: string) => apiRequest<any>(`/seller/listings/${id}`),
  publicListing: (id: string, signal?: AbortSignal) => apiRequest<any>(`/listings/${encodeURIComponent(id)}`, { skipAuthRefresh: true, signal }),
  related: (id: string) => apiRequest<any[]>(`/listings/${encodeURIComponent(id)}/related`, { skipAuthRefresh: true }),
  favoriteStatus: (id: string) => apiRequest<{ saved: boolean }>(`/listings/${encodeURIComponent(id)}/favorite`),
  favorite: (id: string) => apiRequest<{ saved: boolean }>(`/listings/${encodeURIComponent(id)}/favorite`, { method: 'POST' }),
  unfavorite: (id: string) => apiRequest<{ saved: boolean }>(`/listings/${encodeURIComponent(id)}/favorite`, { method: 'DELETE' }),
  favorites: () => apiRequest<any>('/users/favorites'),
  report: (id: string, data: unknown) => apiRequest<any>(`/listings/${encodeURIComponent(id)}/report`, { method: 'POST', body: json(data) }),
  conversation: (id: string) => apiRequest<any>(`/listings/${encodeURIComponent(id)}/conversation`, { method: 'POST' }),
  trackView: (id: string) => apiRequest<any>(`/listings/${encodeURIComponent(id)}/view`, { method: 'POST', skipAuthRefresh: true }),
  recentlyViewed: () => apiRequest<any[]>('/users/recently-viewed'),
  publicSeller: (username: string) => apiRequest<any>(`/sellers/${encodeURIComponent(username)}`, { skipAuthRefresh: true }),
  publicSellerListings: (username: string, sort = 'newest') => apiRequest<any[]>(`/sellers/${encodeURIComponent(username)}/listings?sort=${sort}`, { skipAuthRefresh: true }),
  transition: (id: string, action: 'publish' | 'pause' | 'resume' | 'sold') => apiRequest<any>(`/listings/${id}/${action}`, { method: 'POST' }),
  remove: (id: string) => apiRequest<any>(`/listings/${id}`, { method: 'DELETE' }),
  uploadIntent: (file: File) => apiRequest<any>('/listings/uploads/intent', { method: 'POST', body: json({ fileName: file.name, fileType: file.type, fileSize: file.size }) }),
  async uploadImage(file: File) {
    const intent = await listingApi.uploadIntent(file); const form = new FormData();
    Object.entries(intent.data.fields as Record<string, string | number>).forEach(([key, value]) => form.append(key, String(value))); form.append('file', file);
    const response = await safeFetch(intent.data.uploadUrl, { method: 'POST', body: form }); const uploaded = await response.json() as any;
    if (!response.ok || uploaded.error) throw new QavlioApiError(uploaded.error?.message || 'Photo upload failed', response.status, 'MEDIA_UPLOAD_FAILED');
    return { url: uploaded.secure_url, thumbnailUrl: uploaded.secure_url.replace('/upload/', '/upload/c_fill,h_400,w_600,q_auto,f_auto/'), key: uploaded.public_id, width: uploaded.width, height: uploaded.height };
  },
};

export const conversationApi = {
  list: (params = '') => apiRequest<any>(`/conversations${params ? `?${params}` : ''}`),
  get: (id: string) => apiRequest<any>(`/conversations/${id}`),
  messages: (id: string, params = '') => apiRequest<any>(`/conversations/${id}/messages${params ? `?${params}` : ''}`),
  send: (id: string, data: unknown) => apiRequest<any>(`/conversations/${id}/messages`, { method: 'POST', body: json(data) }),
  read: (id: string) => apiRequest<any>(`/conversations/${id}/read`, { method: 'POST' }),
  archive: (id: string, archived: boolean) => apiRequest<any>(`/conversations/${id}/archive`, { method: 'POST', body: json({ archived }) }),
  block: (id: string, blocked: boolean) => apiRequest<any>(`/conversations/${id}/block`, { method: 'POST', body: json({ blocked }) }),
  report: (id: string, data: unknown) => apiRequest<any>(`/conversations/${id}/report`, { method: 'POST', body: json(data) }),
  attachmentIntent: (file: File) => apiRequest<any>('/conversations/attachments/intent', { method: 'POST', body: json({ fileName: file.name, fileType: file.type, fileSize: file.size }) }),
  async uploadAttachment(file: File) { const intent = await conversationApi.attachmentIntent(file); const form = new FormData(); Object.entries(intent.data.fields as Record<string,string|number>).forEach(([key,value])=>form.append(key,String(value))); form.append('file',file); const response=await safeFetch(intent.data.uploadUrl,{method:'POST',body:form}); const uploaded=await response.json() as any; if(!response.ok||uploaded.error)throw new QavlioApiError(uploaded.error?.message||'Attachment upload failed',response.status,'MEDIA_UPLOAD_FAILED'); return {url:uploaded.secure_url,thumbnailUrl:uploaded.secure_url.replace('/upload/','/upload/c_fill,h_360,w_480,q_auto,f_auto/'),key:uploaded.public_id,width:uploaded.width,height:uploaded.height,mimeType:file.type}; },
};
export const notificationApi = { list: (limit=10)=>apiRequest<any>(`/notifications?limit=${limit}`), read:(id:string)=>apiRequest<any>(`/notifications/${id}/read`,{method:'POST'}), readAll:()=>apiRequest<any>('/notifications/read-all',{method:'POST'}) };

export const paymentApi = {
  create: (data: unknown) => apiRequest<any>('/payments/create', { method: 'POST', body: json(data) }), get: (id: string) => apiRequest<any>(`/payments/${id}`), verify: (id: string) => apiRequest<any>(`/payments/${id}/verify`, { method: 'POST' }),
  sellerPayments: (params='') => apiRequest<any>(`/seller/payments${params?`?${params}`:''}`), sellerPayment: (id:string)=>apiRequest<any>(`/seller/payments/${id}`),
};
export const promotionApi = { products:()=>apiRequest<any[]>('/promotions/products',{skipAuthRefresh:true}), create:(listingId:string,data:unknown)=>apiRequest<any>(`/listings/${listingId}/promotions`,{method:'POST',body:json(data)}), listing:(listingId:string)=>apiRequest<any[]>(`/listings/${listingId}/promotions`), seller:()=>apiRequest<any[]>('/seller/promotions'), cancel:(id:string)=>apiRequest<any>(`/promotions/${id}/cancel`,{method:'POST'}) };

export const adApi={ placement:(placement:string,params='')=>apiRequest<any>(`/ads/placement/${placement}${params?`?${params}`:''}`,{skipAuthRefresh:true}), impression:(id:string,data:unknown)=>apiRequest<any>(`/ads/${id}/impression`,{method:'POST',body:json(data),skipAuthRefresh:true}), click:(id:string,data:unknown)=>apiRequest<any>(`/ads/${id}/click`,{method:'POST',body:json(data),skipAuthRefresh:true}), reward:(id:string)=>apiRequest<any>(`/ads/${id}/reward/claim`,{method:'POST'}) };
export const adminAdApi={ list:(params='')=>apiRequest<any>(`/admin/ads${params?`?${params}`:''}`),analytics:()=>apiRequest<any>('/admin/ads/analytics'),create:(data:unknown)=>apiRequest<any>('/admin/ads',{method:'POST',body:json(data)}),update:(id:string,data:unknown)=>apiRequest<any>(`/admin/ads/${id}`,{method:'PATCH',body:json(data)}),remove:(id:string)=>apiRequest<any>(`/admin/ads/${id}`,{method:'DELETE'}),pause:(id:string)=>apiRequest<any>(`/admin/ads/${id}/pause`,{method:'POST'}),activate:(id:string)=>apiRequest<any>(`/admin/ads/${id}/activate`,{method:'POST'}) };

export const marketplaceApi = {
  getCategories: () => apiRequest<unknown[]>('/categories', { skipAuthRefresh: true }),
  getCategory: (slug: string) => apiRequest<unknown>(`/categories/${encodeURIComponent(slug)}`, { skipAuthRefresh: true }),
  getSubcategories: (slug: string) => apiRequest<unknown[]>(`/categories/${encodeURIComponent(slug)}/subcategories`, { skipAuthRefresh: true }),
  search: (params: URLSearchParams, signal?: AbortSignal) => apiRequest<unknown>(`/search?${params.toString()}`, { skipAuthRefresh: true, signal }),
  getPublicConfig: () => apiRequest<unknown>('/config/public', { skipAuthRefresh: true }),
  getAdSlot: (slotId: string) => apiRequest<unknown>(`/ads/slots/${slotId}`, { skipAuthRefresh: true }),
};
