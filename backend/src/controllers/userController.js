import { clearRefreshCookie } from '../services/authService.js';
import {
  changePassword,
  completeSellerOnboarding,
  deactivateAccount,
  getProfile,
  getSessions,
  getVerificationStatus,
  requestEmailVerification,
  requestPhoneVerification,
  removeVerifiedPhone,
  revokeAllSessions,
  revokeSession,
  updateNotificationPreferences,
  updateProfile,
} from '../services/userService.js';

export async function me(req, res) { res.json({ success: true, data: await getProfile(req.auth.userId) }); }
export async function patchMe(req, res) { res.json({ success: true, data: await updateProfile(req.auth.userId, req.body, req), message: 'Profile updated' }); }
export async function patchPassword(req, res) { const data = await changePassword(req.auth.userId, req.body, req); clearRefreshCookie(res); res.json({ success: true, data }); }
export async function deleteMe(req, res) { const data = await deactivateAccount(req.auth.userId, req.body, req); clearRefreshCookie(res); res.json({ success: true, data }); }
export async function verificationStatus(req, res) { res.json({ success: true, data: await getVerificationStatus(req.auth.userId) }); }
export async function sendPhoneVerification(req, res) { res.json({ success: true, data: await requestPhoneVerification(req.auth.userId, req.body.phone, req), message: 'Verification code sent' }); }
export async function sendEmailVerification(req, res) { res.json({ success: true, data: await requestEmailVerification(req.auth.userId, req.body.email, req), message: 'Verification email sent' }); }
export async function removePhone(req, res) { res.json({ success: true, data: await removeVerifiedPhone(req.auth.userId, req.body.password, req), message: 'Phone number removed' }); }
export async function sessions(req, res) { res.json({ success: true, data: await getSessions(req.auth.userId, req.auth.sessionId) }); }
export async function removeSession(req, res) { res.json({ success: true, data: await revokeSession(req.auth.userId, req.params.id, req) }); }
export async function removeAllSessions(req, res) { const data = await revokeAllSessions(req.auth.userId, req); clearRefreshCookie(res); res.json({ success: true, data }); }
export async function sellerOnboarding(req, res) { res.json({ success: true, data: await completeSellerOnboarding(req.auth.userId, req.body, req), message: 'Seller profile activated' }); }
export async function patchNotificationPreferences(req, res) { res.json({ success: true, data: await updateNotificationPreferences(req.auth.userId, req.body), message: 'Notification preferences updated' }); }
