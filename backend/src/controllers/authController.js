import { AUTH_PURPOSES } from '../constants/account.js';
import { socialAuthCapabilities } from '../services/socialAuthService.js';
import {
  clearRefreshCookie,
  getRefreshCookie,
  loginWithPassword,
  logout,
  refreshSession,
  registerWithEmail,
  registerWithPhone,
  requestPasswordReset,
  requestPhoneOtpLogin,
  resendVerification,
  resetPassword,
  setRefreshCookie,
  verifyEmail,
  verifyOtp,
} from '../services/authService.js';

export async function register(req, res) {
  const result = req.body.method === 'phone' ? await registerWithPhone(req.body, req) : await registerWithEmail(req.body, req);
  res.status(201).json({ success: true, data: result, message: req.body.method === 'phone' ? 'Account created. Verify your phone to continue.' : 'Account created. Check your email to verify it.' });
}

export async function login(req, res) {
  const result = await loginWithPassword(req.body, req);
  setRefreshCookie(res, result);
  res.json({ success: true, data: { user: result.user, accessToken: result.accessToken }, message: 'Welcome back to QAVLIO' });
}

export async function requestOtp(req, res) {
  const result = await requestPhoneOtpLogin(req.body.phone, req);
  res.json({ success: true, data: result, message: result.message });
}

export async function verifyOtpCode(req, res) {
  const result = await verifyOtp(req.body, req);
  if (result.rawRefreshToken) setRefreshCookie(res, result);
  res.json({ success: true, data: { user: result.user, accessToken: result.accessToken, verified: result.verified }, message: result.accessToken ? 'Signed in successfully' : 'Phone verified successfully' });
}

export async function resendOtp(req, res) { res.json({ success: true, data: await resendVerification(req.body, req) }); }
export async function verifyEmailToken(req, res) { res.json({ success: true, data: await verifyEmail(req.body, req), message: 'Email verified successfully' }); }
export async function forgotPassword(req, res) { res.json({ success: true, data: await requestPasswordReset(req.body.identifier, req) }); }
export async function resetPasswordAction(req, res) { res.json({ success: true, data: await resetPassword(req.body, req) }); }

export async function refresh(req, res) {
  const result = await refreshSession(getRefreshCookie(req), req);
  setRefreshCookie(res, result);
  res.json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
}

export async function logoutAction(req, res) {
  const result = await logout(getRefreshCookie(req), req);
  clearRefreshCookie(res);
  res.json({ success: true, data: result });
}

export function socialProviders(_req, res) { res.json({ success: true, data: socialAuthCapabilities() }); }
export function authCapabilities(_req, res) {
  res.json({ success: true, data: { methods: ['email_password', 'phone_password', 'phone_otp'], verificationPurposes: Object.values(AUTH_PURPOSES), social: socialAuthCapabilities() } });
}
